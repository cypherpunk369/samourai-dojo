#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const localtunnel = require('localtunnel-socks-client');

(async () => {
    const tunnel = await localtunnel({
        port: parseInt(process.env.LOCAL_PORT, 10),
        host: process.env.REMOTE_HOST,
        local_host: process.env.NET_DOJO_NGINX_IPV4,
        socks_host: process.env.NET_DOJO_TOR_IPV4,
        socks_port: parseInt(process.env.SOCKS_PORT, 10),
    }).catch(err => {
        throw err;
    });

    tunnel.on('error', err => {
        throw err;
    });

    fs.writeFile(path.resolve(process.env.APP_DIR, 'hostname'), `${tunnel.url}\n`, { encoding: 'utf8' }, () => {
        console.log('your url is: %s', tunnel.url);
    })
})();
