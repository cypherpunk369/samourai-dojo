#!/bin/bash
set -e

if [ ! -e "$SSL_CERTFILE" ] || [ ! -e "$SSL_KEYFILE" ] ; then
  openssl req -newkey rsa:2048 -sha256 -nodes -x509 -days 365 -subj "/O=Fulcrum" -keyout "$SSL_KEYFILE" -out "$SSL_CERTFILE"
fi

fulcrum_options=(
  --datadir "$INDEXER_HOME/.fulcrum/db"
  --bitcoind "$BITCOIND_IP:$BITCOIND_RPC_PORT"
  --rpcuser "$BITCOIND_RPC_USER"
  --rpcpassword "$BITCOIND_RPC_PASSWORD"
  --cert "$SSL_CERTFILE"
  --key "$SSL_KEYFILE"
)

cd "$INDEXER_FILES"
exec ./Fulcrum "${fulcrum_options[@]}" /etc/fulcrum.conf
