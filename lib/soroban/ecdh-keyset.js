/*!
 * lib/soroban/ecdh-keyset.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const crypto = require('crypto')


/**
 * ECDH key set
 */
class ECDHKeySet {

  /**
   * Constructor
   * @param {Buffer} masterKey - masterKey
   * @param {Buffer} serverPubKey - serverPubKey
   * @param {Buffer} clientPubKey - clientPubKey
   */
  constructor(masterKey, serverPubKey, clientPubKey) {
    this.masterKey = masterKey
    this.counterIn = Buffer.alloc(8, 0)
    this.counterOut = Buffer.alloc(8, 0)

    const hash1 = crypto.createHash(ECDHKeySet.HASH_ALGO)
    const a1 = Buffer.concat([this.masterKey, Buffer.alloc(1, 0)])
    hash1.update(a1)
    this.encryptionKey = hash1.digest().slice(0, 32)

    const hash2 = crypto.createHash(ECDHKeySet.HASH_ALGO)
    const a2 = Buffer.concat([this.masterKey, Buffer.alloc(1, 1)])
    hash2.update(a2)
    this.hmacKey = hash2.digest().slice(0, 16)

    const hash3 = crypto.createHash(ECDHKeySet.HASH_ALGO)
    const a3 = Buffer.concat([masterKey, serverPubKey])
    hash3.update(a3)
    this.ivServer = hash3.digest().slice(0, 8)

    const hash4 = crypto.createHash(ECDHKeySet.HASH_ALGO)
    const a4 = Buffer.concat([masterKey, clientPubKey])
    hash4.update(a4)
    this.ivClient = hash4.digest().slice(0, 8)
  }

}

// Hash algorithm
ECDHKeySet.HASH_ALGO = 'sha256'

module.exports = ECDHKeySet
