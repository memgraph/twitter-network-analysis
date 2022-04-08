echo Killing old Docker processes
docker-compose rm -fs

echo Building Docker images
docker-compose build kafka
docker-compose build memgraph-mage-kafka
docker-compose build stream-kafka
docker-compose build backend-kafka

echo Starting Docker containers
docker-compose up -d kafka
docker-compose up -d memgraph-mage-kafka
sleep 1
docker-compose up -d stream-kafka
docker-compose up backend-kafka
