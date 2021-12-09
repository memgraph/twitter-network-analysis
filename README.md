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
* Clone the [MAGE repository](https://github.com/memgraph/mage) and run `docker build  -t memgraph-mage .`

### 1. Running the app

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

### 2. Initialize Online PageRank

**1.** Set the PageRank parameters:

```cypher
CALL pagerank_online.set(100, 0.2) YIELD *;
```

**2.** Create the PageRank trigger:

```cypher
CREATE TRIGGER pagerank_trigger
BEFORE COMMIT
EXECUTE CALL pagerank_online.update(createdVertices, createdEdges, deletedVertices, deletedEdges) YIELD *
SET node.rank = rank;
```

### 3. Initialize online community detection 

**1.** Set the parameters for LabelRankT:
```cypher
CALL community_detection_online.set(True, False, 0.7, 4.0, 0.1, "weight", 1.0, 100, 5)
YIELD *;
```

**2.** Create the LabelRankT trigger:
```cypher
CREATE TRIGGER labelrankt_trigger 
BEFORE COMMIT
EXECUTE CALL community_detection_online.update(createdVertices, createdEdges, updatedVertices, updatedEdges, deletedVertices, deletedEdges) 
YIELD node, community_id
SET node.cluster=community_id;

```

### 4. Creating the stream in Memgraph

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
### 4. Get the results

Run the following query:

```cypher
MATCH (n)-[r]-(m) 
RETURN n, r, m 
LIMIT 500;
```


### 5. Memgraph Lab style

Don't forget that in the two lines that contain `Mul(Div(Property(node, "rank"), 1), 1000)`, 
the last number needs to be changed if the nodes are too small or too large.

```
@NodeStyle {
  size: Mul(Div(Property(node, "rank"), 1), 10000)
  border-width: 5
  border-color: #ffffff
  shadow-color: #bab8bb
  shadow-size: 6
}

@NodeStyle Greater?(Size(Labels(node)), 0) {
  label: Format(":{}", Join(Labels(node), " :"))
}

@NodeStyle HasLabel?(node, "User") {
  color: #dd2222
  color-hover: Darker(#dd2222)
  color-selected: #dd2222
}

@NodeStyle HasProperty?(node, "username") {
  label: AsText(Property(node, "username"))
}

@EdgeStyle {
  width: 3
  label: Type(edge)
}


@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 0)) {
  color: #FAD7A0
}

@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 1)) {
  color: #3333FF
}

@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 2)) {
  color: #CD158A
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 3)) {
  color: #00FFFF
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 4)) {
  color: #15CD18
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 5)) {
  color: #FFCD18
}


```

