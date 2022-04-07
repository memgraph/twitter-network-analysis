echo Killing old Docker processes
docker-compose rm -fs

echo Starting Docker containers
docker-compose up -d core
docker-compose up -d stream
docker-compose up backend-app
