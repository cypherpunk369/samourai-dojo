FROM    node:12-buster-slim AS builder

ENV     MEMPOOL_API_HOME        /build/
ENV     MEMPOOL_API_VERSION     v2.2.0
ENV     MEMPOOL_API_URL         https://github.com/mempool/mempool.git

ARG     MEMPOOL_API_LINUX_GID
ARG     MEMPOOL_API_LINUX_UID

WORKDIR /build

RUN apt-get update
RUN apt-get install -y build-essential python3 pkg-config
RUN cd ${MEMPOOL_API_HOME} && git clone -b ${MEMPOOL_API_VERSION} ${MEMPOOL_API_URL} 
RUN cd mempool/backend
RUN npm ci --production
RUN npm i typescript
RUN npm run build

FROM node:12-buster-slim

WORKDIR /backend

COPY --from=builder /build/ .

RUN chmod +x /backend/start.sh
RUN chmod +x /backend/wait-for-it.sh

RUN chown -R ${MEMPOOL_API_LINUX_UID}:${MEMPOOL_API_LINUX_GID} /backend && chmod -R 755 /backend

USER  ${MEMPOOL_API_LINUX_UID}

EXPOSE 8999

CMD ["/backend/start.sh"]