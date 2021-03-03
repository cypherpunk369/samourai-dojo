/*!
 * accounts/notifications/soroban-service.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const Logger = require('../../lib/logger')
const apiHelper = require('../api-helper')
const AbstractNotifsService = require('./abstract-notifs-service')
const SorobanNotifsRestApi = require('./soroban-notifs-rest-api')
const SorobanConnection = require('./soroban-connection')

const debug = !!(process.argv.indexOf('ws-debug') > -1)

/**
 * A class providing a notifications service over soroban
 */
class SorobanNotifsService extends AbstractNotifsService {

  /**
   * Constructor
   * @param {NotificationServer} server - notification server
   */
  constructor(server) {
    super(server)
    // Initialize the API endpoint
    this.srbNotifsRestApi = new SorobanNotifsRestApi(this.server.httpServer, this)
  }

  /**
   * Handle subscriptions
   * @param {string} data
   */
  handleSubscriptions(data) {
    let conn = null

    // Check for potential flood by clients
    // subscribing for the same xpub again and again
    if (this._filterSubscriptions(data)) {
      const walletEntities = apiHelper.parseEntities(data.active)
      const notifyBlocks = data.blocks != null ? data.blocks : false
      const srbnPubKey = data.srbnpubkey != null ? data.srbnpubkey : null

      conn = new SorobanConnection(srbnPubKey)
      conn = this.registerConnection(conn)

      this._walletsub(walletEntities, conn)

      if (notifyBlocks)
        this._addsub('block', conn)
    }

    return conn
  }

  /**
   * Send a notification message
   * @param {int} cid - client id
   * @param {string} msg - message
   */
  _send(cid, msg) {
    if (this.conn.has(cid)) {
      const conn = this.conn.get(cid)
      conn.send(msg)
    }
  }

}

module.exports = SorobanNotifsService
