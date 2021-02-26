#!/bin/bash
set -e

soroban_options=(
  --hostname="$NET_DOJO_SOROBAN_IPV4"
  --port=4242
  --log=info
)

/usr/local/bin/soroban "${soroban_options[@]}"
