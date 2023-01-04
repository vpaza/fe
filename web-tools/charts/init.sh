#!/bin/bash

cat <<EOF >config.json
{
  "host": "$DB_HOST",
  "port": $DB_PORT,
  "user": "$DB_USER",
  "password": "$DB_PASS",
  "database": "$DB_NAME",
  "ssl": {
    "rejectUnauthorized": false
  }
}
EOF

npm run convert -- config.json