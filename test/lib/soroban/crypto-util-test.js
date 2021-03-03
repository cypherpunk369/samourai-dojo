/*!
 * test/lib/soroban/crypto-util-test.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */

'use strict'

const assert = require('assert')
const BN = require('bn.js')
const bitcoin = require('bitcoinjs-lib')
const CryptoUtil = require('../../../lib/soroban/crypto-util')
const ECDHKeySet = require('../../../lib/soroban/ecdh-keyset')


/**
 * Test vectors
 */

const KEY_SENDER = bitcoin.ECPair.fromPrivateKey(new BN('45292090369707310635285627500870691371399357286012942906204494584441273561412', 10).toBuffer())

const KEY_RECEIVER = bitcoin.ECPair.fromPrivateKey(new BN('15746563759639979716567498468827168096964808533808569971664267146066160930713', 10).toBuffer())

const MASTERKEY_B64 = 'uV6eEsBiCfd+G5SLlpglmy38B0xHyTMl0NWlzSdbHxA='

const ENCRYPTKEY_B64 = 'gosl2XGC3TJDfoW7d0olcK3OrR+MtJabPEYI7C5miW0='

const HMACKEY_B64 = '0oeJi1vpoH3MGzbNTfvrrmA2QrDFIT1XyiIciAMWeCI='

const MSG_CLEARTEXT = 'all all all all all all all all all all all all'

const MSG_ENCRYPTED_B64 = 'cvEt4UpQSDLYFhQXxd491TFB9rJVviZQkeK1NLWR6w9OTOSjXd4ZCsrWCv1cCTYX6uFwdD+SN5RfQ+NkoBCOlKzQeNFLjWsj3hsJUG8u7yXLYCnT6nea9ac6GPJUUV0fMSQfytZU0Bw12Ks0b0hMjj543Zu2mrc55NBkTs6Ptw=='



describe('CryptoUtil', function() {

  describe('getSharedSecret()', function() {
    it('should successfully derive the master key', function() {
      const keyset = CryptoUtil.getSharedSecret(KEY_SENDER, KEY_RECEIVER)
      assert(keyset.masterKey.toString('base64') == MASTERKEY_B64)
    })

    it('should successfully derive the encryption key', function() {
      const keyset = CryptoUtil.getSharedSecret(KEY_SENDER, KEY_RECEIVER)
      assert(keyset.encryptionKey.toString('base64') == ENCRYPTKEY_B64)
    })

    it('should successfully derive the hmac key', function() {
      const keyset = CryptoUtil.getSharedSecret(KEY_SENDER, KEY_RECEIVER)
      assert(keyset.hmacKey.toString('base64') == HMACKEY_B64)
    })
  })

  describe('decrypt()', function() {
    it('should successfully decrypt an encrypted message', function() {
      const keyset = CryptoUtil.getSharedSecret(KEY_SENDER, KEY_RECEIVER)
      const encrypted = Buffer.from(MSG_ENCRYPTED_B64, 'base64')
      const decrypted = CryptoUtil.decrypt(encrypted, keyset)
      assert(decrypted.toString('utf8') == MSG_CLEARTEXT)
    })
  })

  describe('encrypt()', function() {
    it('should successfully encrypt a message', function() {
      const keyset1 = CryptoUtil.getSharedSecret(KEY_SENDER, KEY_RECEIVER)
      const encrypted = CryptoUtil.encrypt(Buffer.from(MSG_CLEARTEXT, 'utf8'), keyset1)

      const keyset2 = CryptoUtil.getSharedSecret(KEY_SENDER, KEY_RECEIVER)
      const decrypted = CryptoUtil.decrypt(encrypted, keyset2)

      assert(decrypted.toString('utf8') == MSG_CLEARTEXT)
    })
  })

})
