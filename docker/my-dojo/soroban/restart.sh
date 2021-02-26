#!/bin/bash
set -e

soroban_options=(
  --hostname=172.28.1.9
  --port=4242
  --log=info
)

/usr/local/bin/soroban "${soroban_options[@]}"
