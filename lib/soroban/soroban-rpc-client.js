/*!
 * lib/soroban/soroban-rpc-client.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const axios = require('axios')
const SocksProxyAgent = require('socks-proxy-agent')


/**
 * A class defining a RPC client connected to a Soroban gateway
 */
class SorobanRpcClient {

  /**
   * Constructor
   * @param {object} opts - options
   *    uriGateway: URI of the Soroban gateway
   *    uriSocks5: URI of the socks5 prxy used to contact the gateway
   */
  constructor(opts) {
    this.opts = opts
    this.msgCtr = 0

    this.socksProxyAgent = opts.uriSocks5
      ? new SocksProxyAgent(opts.uriSocks5)
      : null
  }

  /**
   * Set an option
   * @param {string} key
   * @param {*} value
   * @return {RpcClient}
   */
  set(key, value) {
    this.opts[key] = value
    return this
  }

  /**
   * Get an option
   * @param {string} key
   * @return {*}
   */
  get(key) {
    return this.opts[key]
  }


  /**
   * Send a LIST message over a channel
   * @param {string} channelId - Id of the channel
   */
  async list(channelId) {
    const args = {'Name': channelId}

    return this._sendMessage(
      SorobanRpcClient.LIST_METHOD,
      args,
      this.msgCtr++
    )
  }

  /**
   * Send a ADD message over a channel
   * @param {string} channelId - Id of the channel
   * @param {string} payload - payload
   * @param {string} mode - publishing mode
   */
  async add(channelId, payload, mode) {
    const args = {
      'Name': channelId,
      'Entry': payload,
      'Mode': mode
    }

    return this._sendMessage(
      SorobanRpcClient.ADD_METHOD,
      args,
      this.msgCtr++
    )
  }

  /**
   * Send a message over RPC
   * @param {string} method - Soroban method
   * @param {object} msg - message object
   * @param {int} msgId - message id
   */
  async _sendMessage(method, msg, msgId) {
    const data = {
      'jsonrpc': '2.0',
      'method': method,
      'params': [msg],
      'id': msgId
    }

    const params = {
      'url': this.opts.uriGateway,
      'method': 'POST',
      'timeout': 15000,
      'headers': {
        'User-Agent': 'Dojo',
        'Content-Type': 'application/json'
      },
      'data': JSON.stringify(data),
      'withCredentials': false
    }

    // Sets socks proxy agent if required
    if (this.socksProxyAgent != null) {
      params['httpAgent'] = this.socksProxyAgent
      params['httpsAgent'] = this.socksProxyAgent
    }

    const result = await axios(params)
    return result.data
  }

}

// Soroban methods
SorobanRpcClient.LIST_METHOD = 'directory.List'
SorobanRpcClient.ADD_METHOD = 'directory.Add'

// Soroban modes
SorobanRpcClient.SHORT_MODE = 'short'       // 1mn
SorobanRpcClient.LONG_MODE = 'long'         // 5mn
SorobanRpcClient.NORMAL_MODE = 'normal'     // 3mn
SorobanRpcClient.DEFAULT_MODE = 'default'   // 3mn

module.exports = SorobanRpcClient
