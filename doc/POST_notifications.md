# Notifications

This endpoint allows a client to subscribe to notifications of new blocks and of new transactions related to xpubs, addresses and pubkeys.

A subscription is valid for 1 hour but can be renewed by calling the endpoint again.


```
POST /notifications
```

Parameters must be passed in the body of the request as url encoded arguments.

## Parameters

* **active** - `string` - A pipe-separated list of extended public keys and/or loose addresses and/or pubkeys (`xpub1|address1|address2|pubkey1|...`)
* **blocks** - `boolean` - A boolean flag indicating if notifications of new blocks should be sent. Notifications are sent if value isn't set to 0. Default value is 0.
* **srbnpubkey** - `string` - Hex encoded ECDSA public key of the client used to compute a shared secret (ECDH) that is used to encrypt messages sent over Soroban.
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated. Alternatively, the access token can be passed through the `Authorization` HTTP header (with the `Bearer` scheme).


## Example

```
POST /notifications

active=xpub0123456789...&blocks=1&srbnpubkey=04352ead4f...&at=...
```

### Success

Status code 200 with JSON response:
```json
{
  "srbnchan": [
    "srbn://123aef4567890aef@d2oagweys...bt75qbqd.onion/rpc",
    "srbns://123aef4567890aef@soroban.samouraiwallet.com/rpc"
  ],
  "srbnpubkey": "0123456789abcdef...",
  "expires": 1614699671
}
```

### Failure

Status code 400 with JSON response:
```json
{
  "status": "error",
  "error": "<error message>"
}
```

## Notifications over Soroban

### Soroban channels

Client must poll one of the Soroban channels listed in the `srbnchan` attribute of the response.

**Examples**

```
srbn://123aef4567890aef@d2oagweys...bt75qbqd.onion/rpc
  => Client should poll the 123aef4567890aef channel served over http://d2oagweys...bt75qbqd.onion/rpc
```

```
srbns://123aef4567890aef@soroban.samouraiwallet.com/rpc
  => Client should poll the 123aef4567890aef channel served over https://soroban.samouraiwallet.com/rpc
```

### Encryption

Notification messages are encrypted with the AES/CTR/NoPadding algorithm.

Secret key used for the encryption is a shared secret derived with the ECDH algorithm from the 2 public keys exchanged during the call to the /notifications endpoints.

A HMAC (SHA512) of the Initialization Vector (IV) and of the encrypted message is also computed.

See [lib/crypto-util.js](https://code.samourai.io/dojo/samourai-dojo/-/blob/master/lib/soroban/crypto-util.js#L29) for details of source code.


### Serialization and Encoding

The notification message sent to the client over Soroban is the concatenation of the IV, the HMAC and the encrypted notification message encoded with Z85.

```
PAYLOAD = Z85(IV|HMAC|ENCRYPTED_PAYLOAD)
```