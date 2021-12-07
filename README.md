<h1 align="center">
 🔍 Twitter Network Analytics Demo 🔍
</h1>

<p align="center">
  <a href="https://github.com/g-despot/twitter-network-analysis/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/g-despot/twitter-network-analysis" alt="license" title="license"/>
  </a>
  <a href="https://github.com/g-despot/twitter-network-analysis">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="build" title="build"/>
  </a>
</p>

<p align="center">
  <a href="https://twitter.com/intent/follow?screen_name=memgraphdb">
    <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Follow @memgraphdb"/>
  </a>
  <a href="https://memgr.ph/join-discord">
    <img src="https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"/>
  </a>
</p>

This is a simple stream setup that uses Memgraph to ingest real-time data scraped from Twitter. 
Data is streamed via Kafka and stream processing is performed with Memgraph.

## Data model

**TODO**

## Usage

### Prerequisites

You will need:
* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/) (included with
  Docker Desktop on Windows and macOS)

### Running the app

**1.** First, remove possibly running containers:

```
docker-compose rm -fs
```

**2.** Build all the needed images:

```
docker-compose build
```

**3.** Start the **Kafka**, **Zookeeper** and **Memgraph MAGE** services:

```
docker-compose up -d core
```

**4.** Start the data stream:

```
docker-compose up stream
```

### Creating the stream in Memgraph

**1.** First, we will create a stream for consuming retweet info:

```cypher
CREATE KAFKA STREAM retweets 
TOPICS retweets 
TRANSFORM twitter.tweet 
BOOTSTRAP_SERVERS "kafka:9092"
```

**2.** Now, we can start the streams:

```cypher
START ALL STREAMS;
```

**3.** Check if the streams are running correctly:

```cypher
SHOW STREAMS;
```
