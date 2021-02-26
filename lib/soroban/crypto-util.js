/*!
 * lib/soroban/crypto-util.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const crypto = require('crypto')
const createHash = require('create-hash')
const ecc = require('tiny-secp256k1')
const ECDHKeySet = require('./ecdh-keyset')
const EncryptedMessage = require('./encrypted-message')


/**
 * Class implementing the cryptographic functions used for soroban communications
 */
class CryptoUtil {

  /**
   * Constructor
   */
  constructor() {}

  /**
   * Encrypt a cleartext
   * @param {Buffer} data - clear text
   * @param {ECDHKeySet} keyset - ECDH keyset
   */
  static encrypt(data, keyset) {
    const encrypted = CryptoUtil._encryptAesCtr(
      data,
      keyset.encryptionKey,
      keyset.ivServer,
      keyset.counterOut
    )

    const hmac = CryptoUtil._getHmac(encrypted, keyset.hmacKey)

    return new EncryptedMessage(hmac, encrypted).serialize()
  }

  /**
   * Decrypt a cleartext
   * @param {Buffer} encrypted - clear text
   * @param {ECDHKeySet} keyset - ECDH keyset
   */
  static decrypt(encrypted, keyset) {
    const msg = EncryptedMessage.unserialize(encrypted)

    if (!CryptoUtil._checkHmac(msg.hmac, msg.payload, keyset.hmacKey))
      throw 'Invalid HMAC'

    return CryptoUtil._decryptAesCtr(
      msg.payload,
      keyset.encryptionKey,
      keyset.ivClient,
      keyset.counterIn
    )
  }

  /**
   * Decrypt a cleartext with AES 256 CTR
   * @param {ECPair} serverKey - EC pair used by the server
   * @param {ECPair} clientKey - EC pair used by the client
   */
  static getSharedSecret(serverKey, clientKey) {
    const masterKey = CryptoUtil._generateSecret(serverKey, clientKey)

    return new ECDHKeySet(
      masterKey,
      serverKey.publicKey,
      clientKey.publicKey
    )
  }

  /**
   * Generate ECDH secret
   * @param {ECPair} serverKey - EC pair used by the server
   * @param {ECPair} clientKey - EC pair used by the client
   */
  static _generateSecret(serverKey, clientKey) {
    const A = clientKey.publicKey
    const b = serverKey.privateKey
    const S = ecc.pointMultiply(A, b)
    const Sx = S.slice(1, 33)
    const s = createHash('sha256').update(Sx).digest()
    return s
  }

  /**
   * Encrypt a cleartext with AES 256 CTR
   * @param {Buffer} data - data
   * @param {Buffer} key - key
   * @param {Buffer} iv - iv
   * @param {Buffer} counter - counter
   */
  static _encryptAesCtr(data, key, iv, counter) {
    const ivWithcounter = Buffer.concat([iv, counter])
    const cipher = crypto.createCipheriv('aes-256-ctr', key, ivWithcounter)
    let encrypted = cipher.update(data)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return encrypted
  }

  /**
   * Decrypt a cleartext with AES 256 CTR
   * @param {Buffer} encrypted - encrypted
   * @param {Buffer} key - key
   * @param {Buffer} iv - iv
   * @param {Buffer} counter - counter
   */
  static _decryptAesCtr(encrypted, key, iv, counter) {
    const ivWithcounter = Buffer.concat([iv, counter])
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, ivWithcounter)
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted
  }

  /**
   * Generate a HMAC
   * @param {Buffer} data - data
   * @param {Buffer} key - hmac key
   */
  static _getHmac(data, key) {
    const hmac = crypto.createHmac('sha1', key)
    hmac.update(data)
    return hmac.digest()
  }

  /**
   * Check a HMAC
   * @param {Buffer} hmac - hmac
   * @param {Buffer} rest - data
   * @param {Buffer} key - hmac key
   */
  static _checkHmac(hmac, rest, key) {
    const hmacRest = CryptoUtil._getHmac(rest, key)
    return hmac.toString('hex') == hmacRest.toString('hex')
  }

}

module.exports = CryptoUtil
