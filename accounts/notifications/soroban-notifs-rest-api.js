/*!
 * accounts/notifications/soroban-notifs-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const validator = require('validator')
const bodyParser = require('body-parser')
const Logger = require('../../lib/logger')
const errors = require('../../lib/errors')
const walletService = require('../../lib/wallet/wallet-service')
const authMgr = require('../../lib/auth/authorizations-manager')
const HttpServer = require('../../lib/http-server/http-server')
const apiHelper = require('../api-helper')

const debugApi = !!(process.argv.indexOf('api-debug') > -1)


/**
 * Soroban Notifications API endpoints
 */
class SorobanNotifsRestApi {

  /**
   * Constructor
   * @param {pushtx.HttpServer} httpServer - HTTP server
   */
  constructor(httpServer, srbnNotifsSrv) {
    this.httpServer = httpServer
    this.srbnNotifsSrv = srbnNotifsSrv

    // Establish routes
    const urlencodedParser = bodyParser.urlencoded({ extended: true })

    this.httpServer.app.post(
      '/notifications',
      urlencodedParser,
      authMgr.checkAuthentication.bind(authMgr),
      apiHelper.validateEntitiesParams.bind(apiHelper),
      this.validateArgsPostNotifications.bind(this),
      this.postNotifications.bind(this),
      HttpServer.sendAuthError
    )
  }

  /**
   * Handle notifications POST request
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async postNotifications(req, res) {
    try {
      // Check request params
      if (!apiHelper.checkEntitiesParams(req.body))
        return HttpServer.sendError(res, errors.multiaddr.NOACT)

      // Register the subscriptions
      const conn = this.srbnNotifsSrv.handleSubscriptions(req.body)

      if (conn == null)
        throw errors.generic.GEN

      // Ensure the wallet is tracked
      const entities = apiHelper.parseEntities(req.body.active)
      walletService.getFullWalletInfo(entities, [], [], [], [])

      // Builds the result
      const uris = [conn.getTorUri()]
      const clearnetUri = conn.getClearnetUri()
      if (clearnetUri != null)
        uris.push(clearnetUri)

      const result = {
        'srbnchan': uris,
        'srbnpubkey': conn.serverKeyPair.publicKey.toString('hex'),
        'expires': conn.expires
      }

      HttpServer.sendOkDataOnly(res, result)

    } catch(e) {
      Logger.error(e, 'API: SorobanNotifsRestApi.postNotifications()')
      HttpServer.sendError(res, e)

    } finally {
      if (debugApi) {
        const strParams =
          `${req.body.active ? req.body.active : ''} \
          ${req.body.blocks ? req.body.blocks : 'false'} \
          ${req.body.srbnpubkey ? req.body.srbnpubkey : ''}`

        Logger.info(`API : Completed POST /notifications ${strParams}`)
      }
    }
  }


  /**
   * Validate arguments of post Notifications requests
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsPostNotifications(req, res, next) {
    const isValidKey = validator.isAlphanumeric(req.body.srbnpubkey)

    const isValidBlocks =
      !req.body.blocks
      || validator.isAlphanumeric(req.body.blocks)

    if (!(isValidKey && isValidBlocks)) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.body,
        'API : SorobanNotifsRestApi.validateArgsPostNotifications() : Invalid arguments'
      )
    } else {
      next()
    }
  }
}

module.exports = SorobanNotifsRestApi
