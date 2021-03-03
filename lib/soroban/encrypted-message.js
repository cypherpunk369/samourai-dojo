/*!
 * lib/soroban/encrypted-message.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

/**
 * Encrypted message
 */
class EncryptedMessage {

  /**
   * Constructor
   * @param {Buffer} hmac - hmac
   * @param {Buffer} payload - payload
   */
  constructor(hmac, payload) {
    this.hmac = hmac
    this.payload = payload
  }

  /**
   * Serialize the encrypted message
   */
  serialize() {
    if (this.hmac.length != EncryptedMessage.HMAC_LENGTH)
      return null
    return Buffer.concat([this.hmac, this.payload])
  }

  /**
   * Unserialize an encrypted message
   * @param {Buffer} serialized - serialized encrypted message
   */
  static unserialize(serialized) {
    const hmac = serialized.slice(0, EncryptedMessage.HMAC_LENGTH)
    const payload = serialized.slice(EncryptedMessage.HMAC_LENGTH, serialized.length)
    return new EncryptedMessage(hmac, payload)
  }

}

// HMAC length
EncryptedMessage.HMAC_LENGTH = 20

module.exports = EncryptedMessage
