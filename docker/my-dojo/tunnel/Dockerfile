FROM    node:14-alpine

ENV     APP_DIR       /home/node/tunnel
ENV     REMOTE_HOST   https://fallback.samourai.io
ENV     LOCAL_PORT    80
ENV     SOCKS_PORT    9050

ENV     NODE_ENV      production

# Create data directory
RUN     mkdir "$APP_DIR" && \
        chown -R node:node "$APP_DIR"

RUN     cd "$APP_DIR"

# Create empty package.json
RUN     npm init --force

# Install required package
RUN     npm install localtunnel-socks-client

# Copy wait-for script
COPY    ./wait-for "$APP_DIR/wait-for"

RUN     chown node:node "$APP_DIR/wait-for" && \
        chmod u+x "$APP_DIR/wait-for" && \
        chmod g+x "$APP_DIR/wait-for"

# Copy restart script
COPY    restart.js "$APP_DIR/restart.js"

RUN     chown node:node "$APP_DIR/restart.js" && \
        chmod u+x "$APP_DIR/restart.js" && \
        chmod g+x "$APP_DIR/restart.js"

USER    node
