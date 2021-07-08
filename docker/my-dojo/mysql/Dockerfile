FROM    mariadb:10.4.11-bionic

# Copy mysql config
COPY    ./docker/my-dojo/mysql/mysql-dojo.cnf /etc/mysql/conf.d/mysql-dojo.cnf

# Copy update-db script
COPY    ./docker/my-dojo/mysql/update-db.sh /update-db.sh

RUN     chmod u+x /update-db.sh && \
        chmod g+x /update-db.sh

# Copy content of mysql scripts into /docker-entrypoint-initdb.d
COPY    ./db-scripts/ /docker-entrypoint-initdb.d

# Copy content of mysql structure into /docker-entrypoint-initdb.d for MEMPOOL
COPY    ./docker/my-dojo/mempool/mysql/ /docker-entrypoint-initdb.d