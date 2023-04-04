/*!
 * tracker/block-worker.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */


import { isMainThread, parentPort } from 'worker_threads'

import network from '../lib/bitcoin/network.js'
import keysFile from '../keys/index.js'
import db from '../lib/db/mysql-db-wrapper.js'
import { createRpcClient } from '../lib/bitcoind-rpc/rpc-client.js'
import Block from './block.js'

const keys = keysFile[network.key]

/**
 * @typedef {import('bitcoinjs-lib').Transaction} Transaction
 */

/**
 * STATUS
 */
export const IDLE = 0

export const INITIALIZED = 1

export const OUTPUTS_PROCESSED = 2

export const INPUTS_PROCESSED = 3

export const TXS_CONFIRMED = 4

/**
 * OPS
 */
export const OP_INIT = 0

export const OP_PROCESS_OUTPUTS = 1

export const OP_PROCESS_INPUTS = 2

export const OP_CONFIRM = 3

export const OP_RESET = 4


/**
 * Process message received by the worker
 * @param {object} msg - message received by the worker
 */
async function processMessage(msg) {
    let res = null
    let success = true

    try {
        switch (msg.op) {
        case OP_INIT:
            if (status !== IDLE)
                throw 'Operation not allowed'
            res = await initBlock(msg.header)
            break
        case OP_PROCESS_OUTPUTS:
            if (status !== INITIALIZED)
                throw 'Operation not allowed'
            res = await processOutputs()
            break
        case OP_PROCESS_INPUTS:
            if (status !== OUTPUTS_PROCESSED)
                throw 'Operation not allowed'
            res = await processInputs()
            break
        case OP_CONFIRM:
            if (status !== INPUTS_PROCESSED)
                throw 'Operation not allowed'
            res = await confirmTransactions(msg.blockId)
            break
        case OP_RESET:
            res = await reset()
            break
        default:
            throw 'Invalid Operation'
        }
    } catch (error) {
        success = false
        res = error
    } finally {
        parentPort.postMessage({
            'op': msg.op,
            'status': success,
            'res': res
        })
    }
}

/**
 * Initialize the block
 * @param {object} header - block header
 * @returns {boolean}
 */
async function initBlock(header) {
    status = INITIALIZED
    const hex = await rpcClient.getblock({ blockhash: header.hash, verbosity: 0 })
    block = new Block(hex, header)
    return true
}

/**
 * Process the transactions outputs
 * @returns {boolean}
 */
async function processOutputs() {
    status = OUTPUTS_PROCESSED
    const processed = await block.processOutputs()
    for (const tx of processed) {
        txsForBroadcast.set(tx.getId(), tx)
    }
    return true
}

/**
 * Process the transactions inputs
 * @returns {boolean}
 */
async function processInputs() {
    status = INPUTS_PROCESSED
    const processed = await block.processInputs()
    for (const tx of processed) {
        txsForBroadcast.set(tx.getId(), tx)
    }
    return true
}

/**
 * Confirm the transactions
 * @param {number} blockId - id of the block in db
 * @returns {Transaction[]}
 */
async function confirmTransactions(blockId) {
    status = TXS_CONFIRMED
    const aTxsForBroadcast = [...txsForBroadcast.values()]
    await block.confirmTransactions([...txsForBroadcast.keys()], blockId)
    return aTxsForBroadcast
}

/**
 * Reset
 */
function reset() {
    status = IDLE
    block = null
    txsForBroadcast.clear()
    return true
}


/**
 * MAIN
 */
const rpcClient = createRpcClient()
/**
 * Deduplicated transactions
 * @type {Map<string, Transaction>}
 */
const txsForBroadcast = new Map()
let block = null
let status = IDLE

if (!isMainThread) {
    db.connect({
        connectionLimit: keys.db.connectionLimitTracker,
        acquireTimeout: keys.db.acquireTimeout,
        host: keys.db.host,
        user: keys.db.user,
        password: keys.db.pass,
        database: keys.db.database
    })

    reset()
    parentPort.on('message', processMessage)
}
