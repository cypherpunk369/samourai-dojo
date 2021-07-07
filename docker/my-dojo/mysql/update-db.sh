#!/bin/bash

for i in {30..0}; do
  if echo "SELECT 1" | mysql -h"db" -u"root" -p"$MYSQL_ROOT_PASSWORD" &> /dev/null; then
    break
  fi
  echo "MySQL init process in progress..."
  sleep 1
done

if [ -f /docker-entrypoint-initdb.d/2_update.sql ]; then
  mysql -h"db" -u"root" -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /docker-entrypoint-initdb.d/2_update.sql
  echo "Updated database with 2_update.sql"
fi

### Initiate mempool database 
if [ -f /docker-entrypoint-initdb.d/mariadb-structure.sql]; then
   mysql -h"db" -u"$MEMPOOL_MYSQL_USER" -p"$MEMPOOL_MYSQL_PASSWORD" "$MEMPOOL_MYSQL_DATABASE" < /docker-entrypoint-initdb.d/mariadb-structure.sql
   echo "Mempool database init process in progress..."
fi