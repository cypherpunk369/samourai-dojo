/*!
 * accounts/notifications/abstract-notifs-service.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const LRU = require('lru-cache')
const Logger = require('../../lib/logger')
const WalletEntities = require('../../lib/wallet/wallet-entities')

const debug = !!(process.argv.indexOf('ws-debug') > -1)


/**
 * An abstract class defining a notifications service
 */
class AbstractNotifsService {

  /**
   * Constructor
   * @param {NotificationServer} server - notification server
   */
  constructor(server) {
    // Notifications server
    this.server = server
    // Dictionary of subscriptions
    this.subs = {}
    // Dictionary mapping addresses to pubkeys
    this.cachePubKeys = {}
    // Dictionary of connections
    this.conn = LRU({
      max: 0,
      length: (n, key) => 1,
      maxAge: 3600000,
      noDisposeOnSet: true,
      dispose: (k,v) => {
        for (let topic of v.subs) {
          this._unsub(topic, k)
          if (this.cacheSubs.has(topic))
            this.cacheSubs.del(topic)
        }
      }
    })
    // Cache registering the most recent subscriptions received
    // Used to filter multiple subscriptions sent by external apps.
    this.cacheSubs = LRU({
      // Estimate: 1000 clients with an average of 5 subscriptions
      max: 5000,
      length: (n, key) => 1,
      maxAge: 60000
    })
  }

  /**
   * Register a new connection
   * @param {object} connection - connection object
   */
  registerConnection(conn) {
    conn.id = this.server.sessions++
    conn.subs = []
    this.conn.set(conn.id, conn)
    this.server.clients = this.server.clients + 1
    this.server.maxConn = Math.max(this.server.maxConn, this.conn.itemCount)
    debug && Logger.info(`API : Client ${conn.id} connected`)
    return conn
  }

  /**
   * Close a registered connection
   * @param {object} conn - connection object
   * @param {boolean} forcedClose - true if close initiated by server
   */
  _closeConnection(conn, forcedClose) {
    try {
      if (this.conn.has(conn.id)) {
        this.conn.del(conn.id)
        this.conn.prune()
        this.server.clients = this.server.clients - 1
        debug && Logger.info(`API : Client ${conn.id} disconnected`)
      }
    } catch(e) {
      Logger.error(e, 'API :')
    }
  }

  /**
   * Filter potential duplicate subscriptions
   * @param {string} msg - subscription received
   * @returns {boolean} returns false if it's a duplicate, true otherwise.
   */
  _filterSubscriptions(msg) {
    if (this.cacheSubs.has(msg)) {
      debug && Logger.info('API : Duplicate subscriptions detected')
      return false
    } else {
      this.cacheSubs.set(msg, true)
      return true
    }
  }

  /**
   * Subscribe to a list of addresses/xpubs/pubkeys
   * @param {WalletEntities} wallet - entities composing the wallet
   * @param {object} conn - connection asking for subscription
   */
  _walletsub(wallet, conn) {
    for (let a in wallet.addrs) {
      const address = wallet.addrs[a]
      this._addsub(address, conn)
      if (wallet.pubkeys[a])
        this.cachePubKeys[address] = wallet.pubkeys[a]
    }

    for (let xpub of wallet.xpubs)
      this._addsub(xpub, conn)
  }

  /**
   * Subscribe to a topic
   * @param {string} topic - topic
   * @param {object} conn - connection asking for subscription
   */
  _addsub(topic, conn) {
    if (conn.subs.indexOf(topic) >= 0)
      return false

    conn.subs.push(topic)

    if (!this.subs[topic])
      this.subs[topic] = []

    this.subs[topic].push(conn.id)
    debug && Logger.info(`API : Client ${conn.id} subscribed to ${topic}`)
  }

  /**
   * Unsubscribe from a topic
   * @param {string} topic - topic
   * @param {int} cid - client id
   */
  _unsub(topic, cid) {
    if (!this.subs[topic])
      return false

    const index = this.subs[topic].indexOf(cid)
    if (index < 0)
      return false

    this.subs[topic].splice(index, 1)

    if (this.subs[topic].length == 0) {
      delete this.subs[topic]
      if (this.cachePubKeys.hasOwnProperty(topic))
        delete this.cachePubKeys[topic]
    }

    return true
  }

  /**
   * Dispatch notifications for a new block
   * @param {string} header - block header
   */
  notifyBlock(header) {
    try {
      this.conn.prune()

      if (!this.subs['block'])
        return

      const data = {op: 'block', x: header}

      for (let cid of this.subs['block']) {
        if (!this.conn.has(cid))
          continue

        try {
          this._send(cid, JSON.stringify(data))
        } catch(e) {
          Logger.error(e, `API : Error sending notification for 'block' to client ${cid}`)
        }
      }
    } catch(e) {
      Logger.error(e, `API :`)
    }
  }

  /**
   * Dispatch notifications for a transaction
   *
   * Transaction notification operates within these constraints:
   *   1. Notify each client ONCE of a relevant transaction
   *   2. Maintain privacy of other parties when transactions are between clients
   *
   *   Clients subscribe to a list of xpubs and addresses. Transactions identify
   *   address and xpub if available on inputs and outputs, omitting inputs and
   *   outputs for untracked addresses.
   *
   *   Example:
   *   tx
   *     inputs
   *       addr1
   *       xpub2
   *     outputs
   *       xpub1
   *       xpub2
   *       addr2
   *       xpub3
   *
   *   subs
   *     addr1: client1, client2
   *     addr2: client1
   *     xpub1: client1
   *     xpub2: client2
   *    xpub4: client3
   *
   *   client1: addr1, addr2, xpub1
   *   client2: addr1, xpub2
   *   client3: xpub4
   *
   *   tx -> client1
   *     inputs
   *       addr1
   *     outputs
   *       xpub1
   *       addr2
   *
   *   tx -> client2
   *     inputs
   *       addr1
   *       xpub2
   *     outputs
   *       xpub2
   *
   * @param {object} tx - transaction
   *
   * @note Synchronous processing done by this method
   * may become a bottleneck in the future if under heavy load.
   * Split in multiple async calls might make sense.
   */
  notifyTransaction(tx) {
    try {
      this.conn.prune()

      // Topics extracted from the transaction
      const topics = {}
      // Client subscriptions: {[cid]: [topic1, topic2, ...]}
      const clients = {}

      // Extract topics from the inputs
      for (let i in tx.inputs) {
        let input = tx.inputs[i]
        let topic = null

        if (input.prev_out) {
          // Topic is either xpub or addr. Should it be both?
          if (input.prev_out.xpub) {
            topic = input.prev_out.xpub.m
          } else if (input.prev_out.addr) {
            topic = input.prev_out.addr
          }
        }

        if (this.subs[topic]) {
          topics[topic] = true
          // Add topic information to the input
          input.topic = topic
        }
      }

      // Extract topics from the outputs
      for (let o in tx.out) {
        let output = tx.out[o]
        let topic = null

        if (output.xpub) {
          topic = output.xpub.m
        } else if (output.addr) {
          topic = output.addr
        }

        if (this.subs[topic]) {
          topics[topic] = true
          // Add topic information to the output
          output.topic = topic
        }
      }

      for (let topic in topics) {
        for (let cid of this.subs[topic]) {
          if (!clients[cid])
            clients[cid] = []
          if (clients[cid].indexOf(topic) == -1)
            clients[cid].push(topic)
        }
      }

      // Tailor a transaction for each client
      for (let cid in clients) {
        const ctx = _.cloneDeep(tx)
        ctx.inputs = []
        ctx.out = []

        // List of topics relevant to this client
        const clientTopics = clients[cid]

        // Check for topic information on inputs & outputs (added above)
        for (let input of tx.inputs) {
          const topic = input.topic
          if (topic && clientTopics.indexOf(topic) > -1) {
            const cin = _.cloneDeep(input)
            delete cin.topic
            if (this.cachePubKeys.hasOwnProperty(topic))
              cin.pubkey = this.cachePubKeys[topic]
            ctx.inputs.push(cin)
          }
        }

        for (let output of tx.out) {
          const topic = output.topic
          if (topic && clientTopics.indexOf(topic) > -1) {
            const cout = _.cloneDeep(output)
            delete cout.topic
            if (this.cachePubKeys.hasOwnProperty(topic))
              cout.pubkey = this.cachePubKeys[topic]
            ctx.out.push(cout)
          }
        }

        // Move on if the custom transaction has no inputs or outputs
        if (ctx.inputs.length == 0 && ctx.out.length == 0)
          continue

        // Send custom transaction to client
        const data = {op: 'utx', x: ctx}

        try {
          this._send(cid, JSON.stringify(data))
          debug && Logger.error(`API : Sent ctx ${ctx.hash} to client ${cid}`)
        } catch(e) {
          Logger.error(e, `API : Trouble sending ctx to client ${cid}`)
        }
      }

    } catch(e) {
      Logger.error(e, `API :`)
    }
  }

  /**
   * Send a notification message
   * @param {int} cid - client id
   * @param {string} msg - message
   */
  _send(cid, msg) {}

}

module.exports = AbstractNotifsService
