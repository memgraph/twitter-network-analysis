echo Killing old Docker processes
docker-compose rm -fs

echo Building Docker images
docker-compose build

echo Starting Docker containers
docker-compose up -d core
docker-compose up -d stream
docker-compose up backend-app
sleep 5
curl localhost:5000/api/graph
