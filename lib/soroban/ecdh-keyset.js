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
   */
  constructor(masterKey) {
    this.masterKey = masterKey

    const hash1 = crypto.createHash(ECDHKeySet.HASH_ALGO)
    const a1 = Buffer.concat([this.masterKey, Buffer.alloc(1, 0)])
    hash1.update(a1)
    this.encryptionKey = hash1.digest()

    const hash2 = crypto.createHash(ECDHKeySet.HASH_ALGO)
    const a2 = Buffer.concat([this.masterKey, Buffer.alloc(1, 1)])
    hash2.update(a2)
    this.hmacKey = hash2.digest()
  }

}

// Hash algorithm
ECDHKeySet.HASH_ALGO = 'sha256'

module.exports = ECDHKeySet
