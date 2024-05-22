#!/bin/bash

# Wait for the primary node to be available
until mongo --host mongo0:30000 --eval "printjson(rs.status())" | grep 'PRIMARY'; do
  echo "Waiting for MongoDB primary node to be available..."
  sleep 2
done

# Initialize the replica set
mongo --host mongo_primary:27017 <<EOF
  rs.initiate({
    _id: "myReplicaSet",
    members: [
      { _id: 0, host: "mongo_primary:30000" },
      { _id: 1, host: "mongo_secondary1:30001" },
      { _id: 2, host: "mongo_secondary2:30002" }
    ]
  })
EOF
