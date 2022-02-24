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

A web application with backend in Flask and frontend in React and D3.js that
uses Memgraph to ingest real-time data scraped from Twitter. Data is streamed
via Kafka and stream processing is performed with Memgraph.

## App architecture

<p align="left">
  <img width="600px" src="https://raw.githubusercontent.com/memgraph/twitter-network-analysis/main/img/stream-processing-arc-01-01.png" alt="memgraph-tutorial-twitter-app-architecture">
</p>

## Data model

<p align="left">
  <img width="300px" src="https://raw.githubusercontent.com/memgraph/twitter-network-analysis/main/img/twitter-dataset-01.png" alt="memgraph-tutorial-twitter-pagerank-graph-schema">
</p>

## Prerequisites

You will need:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (included with
  Docker Desktop on Windows and macOS)

## Running the app

### With a bash script

You can start everything but frontend by **running the bash script**:

```
bash run_docker.sh
```

After that, in other window run the frontend app with:

```
docker-compose up frontend-app
```

### Manually using Docker Compose

If you want to start the app **without using the bash script**, then:

**1.** Remove possibly running containers:

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
docker-compose up -d stream
```

**5.** Start the backend application:

```
docker-compose up backend-app
```

**6.** Start the frontend application in new terminal window:

```
docker-compose up frontend-app
```

The React application will be running on `http://localhost:3000`.

## Choose the visualization

In the dropdown, select the algorithm you want to check out, and click on the
'Select algorithm' button.

Default algorithm is **Community detection**:

<p align="left">
  <img width="300px" src="https://public-assets.memgraph.com/twitter-analysis-with-dynamic-pagerank/memgraph-tutorial-twitter-pagerank-graph-schema.png">
</p>

![memgraph-tutorial-community-detection](https://raw.githubusercontent.com/memgraph/twitter-network-analysis/main/img/memgraph-tutorial-community-detection-stream.gif)

The other algoritm is **PageRank**:

![memgraph-tutorial-pagerank-stream](https://raw.githubusercontent.com/memgraph/twitter-network-analysis/main/img/memgraph-tutorial-pagerank-stream.gif)
