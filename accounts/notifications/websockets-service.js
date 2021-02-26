/*!
 * accounts/notifications/websockets-service.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const WebSocket = require('websocket')
const Logger = require('../../lib/logger')
const apiHelper = require('../api-helper')
const authMgr = require('../../lib/auth/authorizations-manager')
const AbstractNotifsService = require('./abstract-notifs-service')

const debug = !!(process.argv.indexOf('ws-debug') > -1)


/**
 * A class providing a notifications service over web sockets
 */
class WebsocketsNotifsService extends AbstractNotifsService {

  /**
   * Constructor
   * @param {NotificationServer} server - notification server
   */
  constructor(server) {
    super(server)
    // Web sockets server
    this.ws = null
    // Initialize the web socket server
    this._initWSServer()
  }

  /**
   * Initialize the web sockets server
   */
  _initWSServer() {
    this.ws = new WebSocket.server({httpServer: this.server.httpServer.server})

    Logger.info('API : Created WebSocket server')

    this.ws.on('request', req => {
      try {
        let conn = this.registerConnection(req.accept(null, req.origin))

        conn.on('close', () => {
          this._closeWSConnection(conn, false)
        })

        conn.on('error', err => {
          Logger.error(err, `API : WebsocketsNotifsService : Error on connection ${conn.id}`)
          if (conn.connected)
            this._closeWSConnection(conn, true)
        })

        conn.on('message', msg => {
          if (msg.type == 'utf8')
            this._handleWSMessage(msg.utf8Data, conn)
          else
            this._closeWSConnection(conn, true)
        })

      } catch(e) {
        Logger.error(e, `API : WebsocketsNotifsService._initWSServer() : Error during request accept`)
      }
    })
  }

  /**
   * Close a web sockets connection
   * @param {object} conn - web socket connection
   * @param {boolean} forcedClose - true if close initiated by server
   */
  _closeWSConnection(conn, forcedClose) {
    try {
      this._closeConnection(conn, forcedClose)
      // Close initiated by server, drop the connection
      if (forcedClose && conn.connected)
        conn.drop(1008, 'Get out of here!')
    } catch(e) {
      Logger.error(e, 'API : WebsocketsNotifsService._closeWSConnection()')
    }
  }

  /**
   * Handle messages received over the web sockets
   * (subscriptions)
   * @param {string} msg - subscription received
   * @param {object} conn - connection
   */
  _handleWSMessage(msg, conn) {
    try {
      debug && Logger.info(`API : Received from client ${conn.id}: ${msg}`)

      const data = JSON.parse(msg)

      // Check authentication (if needed)
      if (authMgr.authActive && authMgr.isMandatory) {
        try {
          authMgr.isAuthenticated(data.at)
        } catch(e) {
          this.notifyAuthError(e, conn.id)
          return
        }
      }

      switch(data.op) {
        case 'ping':
          conn.sendUTF('{"op": "pong"}')
          break
        case 'addr_sub':
          if (data.addr) {
            // Check for potential flood by clients
            // subscribing for the same xpub again and again
            if (this._filterSubscriptions(data.addr)) {
              const walletEntities = apiHelper.parseEntities(data.addr)
              this._walletsub(walletEntities, conn)
            } else {
              this._closeWSConnection(conn, true)
            }
          }
          break
        case 'blocks_sub':
          this._addsub('block', conn)
          break
      }
    } catch(e) {
      Logger.error(e, 'API : ._handleWSMessage() : WebSocket message error')
    }
  }

  /**
   * Send a notification message
   * @param {int} cid - client id
   * @param {string} msg - message
   */
  _send(cid, msg) {
    this.conn[cid].sendUTF(msg)
  }

  /**
   * Dispatch notification for an authentication error
   * @param {string} err - error
   * @param {integer} cid - connection id
   */
  notifyAuthError(err, cid) {
    const data = {op: 'error', msg: err}

    try {
      this._send(cid, JSON.stringify(data))
      debug && Logger.error(`API : Sent authentication error to client ${cid}`)
    } catch(e) {
      Logger.error(e, `API : WebsocketsNotifsService.notifyAuthError() : Trouble sending authentication error to client ${cid}`)
    }
  }

}

module.exports = WebsocketsNotifsService
