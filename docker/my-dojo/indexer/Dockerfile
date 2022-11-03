FROM    rust:1.42.0-slim-buster AS builder

ENV     INDEXER_VERSION             0.6.0
ENV     FILE_NAME                   addrindexrs-v$INDEXER_VERSION
ENV     FINGERPRINT_FILE_NAME       addrindexrs-v$INDEXER_VERSION--fingerprints.txt
ENV     FINGERPRINT_SIG_FILE_NAME   addrindexrs-v$INDEXER_VERSION--fingerprints.txt.sig
ENV     FINGERPRINT_HASH            89ab60c4b1af3df55a6817e69049ecaf
ENV     FINGERPRINT_SIG_HASH        1e77197ff4ea46a6f10530b50ae911f7

ENV     INDEXER_URL                 https://code.samourai.io/dojo/addrindexrs/-/archive/v$INDEXER_VERSION/$FILE_NAME.tar.gz
ENV     FINGERPRINT_URL             https://code.samourai.io/dojo/addrindexrs/uploads/$FINGERPRINT_HASH/$FINGERPRINT_FILE_NAME
ENV     FINGERPRINT_SIG_URL         https://code.samourai.io/dojo/addrindexrs/uploads/$FINGERPRINT_SIG_HASH/$FINGERPRINT_SIG_FILE_NAME

ENV     KEYSERVER_URI               hkps://api.protonmail.ch
ENV     PGP_KEY                     377de507fdc47f020099e342cfa54e4c0cd58df0

RUN     apt-get update && \
        apt-get install -y clang cmake wget gpg gpg-agent

# Get PGP key
RUN     gpg --batch --keyserver "$KEYSERVER_URI" --recv-keys "$PGP_KEY"

# Install addrindexrs
RUN     mkdir /tmp/addrindexrs && \
        cd /tmp/addrindexrs && \
        wget -q "$INDEXER_URL" "$FINGERPRINT_URL" "$FINGERPRINT_SIG_URL" && \
        gpg --batch --verify "$FINGERPRINT_SIG_FILE_NAME" && \
        sha256sum --ignore-missing --check "$FILE_NAME-fingerprints.txt" && \
        tar -xzf "$FILE_NAME" --strip-components=1 && \
        rm "$FILE_NAME" && \
        cargo install --locked --path .

FROM    debian:buster-slim

ENV     INDEXER_HOME        /home/indexer

ARG     INDEXER_LINUX_GID
ARG     INDEXER_LINUX_UID

COPY    --from=builder /usr/local/cargo/bin/addrindexrs /usr/bin/addrindexrs

# Create group and user indexer
RUN     addgroup --system -gid ${INDEXER_LINUX_GID} indexer && \
        adduser --system --ingroup indexer -uid ${INDEXER_LINUX_UID} indexer

# Create data directory
RUN     mkdir "$INDEXER_HOME/addrindexrs" && \
        chown -h indexer:indexer "$INDEXER_HOME/addrindexrs"

# Copy restart script
COPY    ./restart.sh /restart.sh
RUN     chown indexer:indexer /restart.sh && \
        chmod 777 /restart.sh

USER    indexer

EXPOSE  50001
EXPOSE  8080

STOPSIGNAL SIGINT
