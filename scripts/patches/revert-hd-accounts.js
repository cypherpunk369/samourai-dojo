/*!
 * scripts/patches/translate-hd-accounts.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */


import mysql from 'mysql2'
import bitcoin from 'bitcoinjs-lib'
import bs58check from 'bs58check'
import bs58 from 'bs58'

import db from '../../lib/db/mysql-db-wrapper.js'
import hdaHelper from '../../lib/bitcoin/hd-accounts-helper.js'

/**
 * Retrieve hd accounts from db
 */
async function getHdAccounts() {
    const sqlQuery = 'SELECT `hdID`, `hdXpub`, `hdType`  FROM `hd`'
    const query = mysql.format(sqlQuery)
    return db._query(query)
}

/**
 * Update the xpub of a hdaccount
 */
async function updateHdAccount(hdId, xpub) {
    const sqlQuery = 'UPDATE `hd` SET `hdXpub` = ? WHERE `hdID` = ?'
    const parameters = [xpub, hdId]
    const query = mysql.format(sqlQuery, parameters)
    return db._query(query)
}

/**
 * Script translating when needed
 * xpubs stored in db into ypub and zpub
 */
async function run() {
    try {
        const hdAccounts = await getHdAccounts()

        for (let account of hdAccounts) {
            const hdId = account.hdID
            const xpub = account.hdXpub
            const info = hdaHelper.classify(account.hdType)
            const scheme = info.type

            if ((scheme === hdaHelper.BIP49) || (scheme === hdaHelper.BIP84)) {
                try {
                    const xlatedXpub = hdaHelper.xlatXPUB(xpub)
                    await updateHdAccount(hdId, xlatedXpub)
                    console.log(`Updated ${hdId} (${xpub} => ${xlatedXpub})`)
                } catch(error) {
                    console.log('A problem was met')
                    console.log(error)
                }
            }
        }
    } catch(error) {
        console.log('A problem was met')
        console.log(error)
    }
}

/**
 * Launch the script
 */
console.log('Start processing')

setTimeout(async () => {
    return run().then(() => {
        console.log('Process completed')
    })
}, 1500)
