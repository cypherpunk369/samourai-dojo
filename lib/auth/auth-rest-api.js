/*!
 * lib/auth/auth-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */


// eslint-disable-next-line import/no-unresolved
import { urlencoded } from 'milliparsec'
import HttpServer from '../http-server/http-server.js'
import authentMgr from './authentication-manager.js'
import authorzMgr from './authorizations-manager.js'

/**
 * @typedef {import('@tinyhttp/app').Request} Request
 * @typedef {import('@tinyhttp/app').Response} Response
 */

/**
 * Auth API endpoints
 */
class AuthRestApi {

    /**
     * Constructor
     * @param {HttpServer} httpServer - HTTP server
     */
    constructor(httpServer) {
        this.httpServer = httpServer

        // Establish routes
        const urlencodedParser = urlencoded()

        this.httpServer.app.post(
            '/auth/login',
            urlencodedParser,
            authentMgr.authenticate,
            authorzMgr.generateAuthorizations.bind(authorzMgr),
            this.login.bind(this)
        )

        this.httpServer.app.post(
            '/auth/logout',
            urlencodedParser,
            authorzMgr.revokeAuthorizations.bind(authorzMgr),
            this.logout.bind(this)
        )

        this.httpServer.app.post(
            '/auth/refresh',
            urlencodedParser,
            authorzMgr.refreshAuthorizations.bind(authorzMgr),
            this.refresh.bind(this)
        )
    }

    /**
     * Login
     * @param {Request} req - http request object
     * @param {Response} res - http response object
     */
    login(req, res) {
        try {
            const result = { authorizations: req.authorizations }
            const returnValue = JSON.stringify(result, null, 2)
            HttpServer.sendRawData(res, returnValue)
        } catch (error) {
            HttpServer.sendError(res, error)
        }
    }

    /**
     * Refresh
     * @param {Request} req - http request object
     * @param {Response} res - http response object
     */
    refresh(req, res) {
        try {
            const result = { authorizations: req.authorizations }
            const returnValue = JSON.stringify(result, null, 2)
            HttpServer.sendRawData(res, returnValue)
        } catch (error) {
            HttpServer.sendError(res, error)
        }
    }

    /**
     * Logout
     * @param {Request} req - http request object
     * @param {Response} res - http response object
     */
    logout(req, res) {
        HttpServer.sendOk(res)
    }

}

export default AuthRestApi
