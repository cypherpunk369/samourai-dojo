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
   * @param {Buffer} iv - initialization vector
   * @param {Buffer} hmac - hmac
   * @param {Buffer} payload - payload
   */
  constructor(iv, hmac, payload) {
    this.iv = iv
    this.hmac = hmac
    this.payload = payload
  }

  /**
   * Serialize the encrypted message
   */
  serialize() {
    if (this.iv.length != EncryptedMessage.IV_LENGTH)
      return null
    if (this.hmac.length != EncryptedMessage.HMAC_LENGTH)
      return null
    return Buffer.concat([this.iv, this.hmac, this.payload])
  }

  /**
   * Unserialize an encrypted message
   * @param {Buffer} serialized - serialized encrypted message
   */
  static unserialize(serialized) {
    const idxPayload = EncryptedMessage.IV_LENGTH + EncryptedMessage.HMAC_LENGTH
    const iv = serialized.slice(0, EncryptedMessage.IV_LENGTH)
    const hmac = serialized.slice(EncryptedMessage.IV_LENGTH, idxPayload)
    const payload = serialized.slice(idxPayload, serialized.length)
    return new EncryptedMessage(iv, hmac, payload)
  }

}

// IV length
EncryptedMessage.IV_LENGTH = 16

// HMAC length
EncryptedMessage.HMAC_LENGTH = 64

module.exports = EncryptedMessage
