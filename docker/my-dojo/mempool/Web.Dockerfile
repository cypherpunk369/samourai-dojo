FROM node:12-buster-slim AS builder

ENV     MEMPOOL_WEB_HOME        /build/
ENV     MEMPOOL_WEB_VERSION     v2.2.0
ENV     MEMPOOL_WEB_URL         https://github.com/mempool/mempool.git

ARG     MEMPOOL_WEB_LINUX_GID
ARG     MEMPOOL_WEB_LINUX_UID

ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /build
RUN apt-get update
RUN apt-get install -y build-essential rsync
RUN cd ${MEMPOOL_API_HOME} && git clone -b ${MEMPOOL_API_VERSION} ${MEMPOOL_API_URL}
RUN cd mempool/frontend 
RUN npm i
RUN npm run build

FROM nginx:1.17.8-alpine

WORKDIR /patch

COPY --from=builder /build/entrypoint.sh .
COPY --from=builder /build/wait-for .
COPY --from=builder /build/dist/mempool /var/www/mempool
COPY --from=builder /build/nginx.conf /etc/nginx/
COPY --from=builder /build/nginx-mempool.conf /etc/nginx/conf.d/

RUN chmod +x /patch/entrypoint.sh
RUN chmod +x /patch/wait-for

RUN chown -R ${MEMPOOL_WEB_LINUX_UID}:${MEMPOOL_WEB_LINUX_GID} /patch && chmod -R 755 /patch && #\
        chown -R ${MEMPOOL_WEB_LINUX_UID}:${MEMPOOL_WEB_LINUX_GID} /var/cache/nginx && \
        chown -R ${MEMPOOL_WEB_LINUX_UID}:${MEMPOOL_WEB_LINUX_GID} /var/log/nginx && \
        chown -R ${MEMPOOL_WEB_LINUX_UID}:${MEMPOOL_WEB_LINUX_GID} /etc/nginx/nginx.conf && \
        chown -R ${MEMPOOL_WEB_LINUX_UID}:${MEMPOOL_WEB_LINUX_GID} /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && \
        chown -R ${MEMPOOL_WEB_LINUX_UID}:${MEMPOOL_WEB_LINUX_GID} /var/run/nginx.pid

USER ${MEMPOOL_WEB_LINUX_UID}

ENTRYPOINT ["/patch/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]