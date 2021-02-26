FROM    golang:1.13-buster

ENV     SOROBAN_SRC_DIR     /src
ENV     SOROBAN_STAGE_DIR   /stage

RUN     set -ex && \
        mkdir -p "$SOROBAN_STAGE_DIR" && \
        addgroup --system -gid 1114 soroban && \
        adduser --system --ingroup soroban -uid 1111 soroban

ENV     SOROBAN_URL         https://code.samourai.io/wallet/samourai-soroban/-/archive
ENV     SOROBAN_VERSION     0.1.0
ENV     SOROBAN_TAR         "samourai-soroban-v$SOROBAN_VERSION.tar.gz"
ENV     SOROBAN_SHA256      85c32399cfa8abc2cd3e152aad6d7f51ec3c17c71f0de04c4d5f12709379be3b

RUN     cd / && \
        echo "$SOROBAN_SHA256 *$SOROBAN_TAR" > SOROBAN_CHECKSUMS && \
        wget -qO "$SOROBAN_TAR" "$SOROBAN_URL/v$SOROBAN_VERSION/$SOROBAN_TAR" && \
        sha256sum -c SOROBAN_CHECKSUMS 2>&1 | grep OK && \
        tar -xzvf "$SOROBAN_TAR" -C / && \
        cp -a "samourai-soroban-v$SOROBAN_VERSION/." "$SOROBAN_SRC_DIR/" && \
        cd "$SOROBAN_SRC_DIR" && \
        go mod download && \
        go build -a -tags netgo -o "$SOROBAN_STAGE_DIR/soroban" cmd/server/main.go && \
        cp "$SOROBAN_STAGE_DIR/soroban" /usr/local/bin/soroban && \
        cd .. && \
        rm -rf "$SOROBAN_SRC_DIR" && \
        rm -rf "$SOROBAN_STAGE_DIR" && \
        rm -rf "samourai-soroban-v$SOROBAN_VERSION" && \
        rm "$SOROBAN_TAR"

# Copy restart script
COPY    ./restart.sh /restart.sh

RUN     chown soroban:soroban /restart.sh && \
        chmod u+x /restart.sh && \
        chmod g+x /restart.sh

USER    soroban
