/*!
 * accounts/notifications/soroban-connection.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const Buffer = require('safe-buffer').Buffer
const crypto = require('crypto')
const bitcoin = require('bitcoinjs-lib')
const Logger = require('../../lib/logger')
const network = require('../../lib/bitcoin/network')
const keys = require('../../keys')[network.key]
const SorobanRpcClient = require('../../lib/soroban/soroban-rpc-client')
const CryptoUtil = require('../../lib/soroban/crypto-util')


/**
 * A class defining a Soroban connection used for notifications
 */
class SorobanConnection {

  /**
   * Constructor
   * @param {string} pubkey - client pubkey
   */
  constructor(pubkey) {
    this.serverKeyPair = bitcoin.ECPair.makeRandom()
    this.clientKeyPair = bitcoin.ECPair.fromPublicKey(Buffer.from(pubkey, 'hex'))

    this.sharedSecret = CryptoUtil.getSharedSecret(this.serverKeyPair, this.clientKeyPair)
    this.channel = this._initChannel()

    const expires = keys.auth.jwt.refreshToken.expires
    let now = new Date()
    now.setSeconds(now.getSeconds() + expires)
    this.expires = Math.floor(now.getTime() / 1000)
  }

  /**
   * Initialize the channel
   */
  _initChannel() {
    return crypto.randomBytes(8).toString('hex')
  }

  /**
   * Return the clearnet URI of the channel
   */
  getClearnetUri() {
    let clearnetUri = keys.notifications.soroban.clearnetUri
    if (clearnetUri != null)
      clearnetUri = clearnetUri.replace('https://', `srbns://${this.channel}@`)
    return clearnetUri
  }

  /**
   * Return the Tor URI of the channel
   */
  getTorUri() {
    let torUri = keys.notifications.soroban.torUri
    if (torUri != null)
      torUri = torUri.replace('http://', `srbn://${this.channel}@`)
    return torUri
  }

  /**
   * Send a message
   * @param {string} msg - message
   */
  async send(msg) {
    const msgBuffer = new Buffer(msg, 'utf8')
    const encrypted = CryptoUtil.encrypt(msgBuffer, this.sharedSecret)
    return this._sendPayload(encrypted.toString('utf8'))
  }

  /**
   * Send payload over soroban
   * @param {string} payload - payload
   */
  async _sendPayload(payload) {
    try {
      const srbParams = keys.notifications.soroban

      let opts = {
        'uriGateway': null,
        'uriSocks5': null
      }

      if (srbParams.publishUri) {
        opts.uriGateway = srbParams.publishUri
      } else if (srbParams.socks5Proxy) {
        opts.uriSocks5 = srbParams.socks5Proxy
        if (srbParams.torUri) {
          opts.uriGateway = srbParams.torUri
        } else if (srbParams.clearnetUri) {
          opts.uriGateway = srbParams.clearnetUri
        }
      }

      const rpcClient = new SorobanRpcClient(opts)
      Logger.info(`Sending payload ${payload} on chan ${this.channel}`)
      await rpcClient.add(this.channel, payload, SorobanRpcClient.NORMAL_MODE)
      return true
    } catch(e) {
      Logger.error(e, `SorobanConnection._sendPayload():`)
      return false
    }
  }
}

module.exports = SorobanConnection
