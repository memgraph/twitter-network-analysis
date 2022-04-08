echo Killing old Docker processes
docker-compose rm -fs

echo Building Docker images
docker-compose build pulsar
docker-compose build memgraph-mage-pulsar
docker-compose build stream-pulsar
docker-compose build backend-pulsar

echo Starting Docker containers
docker-compose up -d pulsar
docker-compose up -d memgraph-mage-pulsar
sleep 1
docker-compose up -d stream-pulsar
docker-compose up backend-pulsar
