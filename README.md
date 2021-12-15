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

![memgraph-tutorial-twitter-pagerank-graph-schema](https://public-assets.memgraph.com/twitter-analysis-with-dynamic-pagerank/memgraph-tutorial-twitter-pagerank-graph-schema.png)

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
### 5. Get the results

Run the following query:

```cypher
MATCH (n)-[r]-(m) 
RETURN n, r, m 
LIMIT 500;
```

### 6. Call node2vec and link prediction
**1.** Call node2vec
Parameters are set as following:
* is_directed=True
* p = 1/128  # return parameter
* q = 1  # in-out parameter
* num_walks = 10
* walk_length = 80
* vector_size = 8
* alpha = 0.02
* window = 5
* min_count = 1
* seed = 1
* workers = 4
* min_alpha = 0.0001
* sg = 1
* hs = 0
* negative = 5
* epochs = 5

```cypher
CALL node2vec.set_embeddings(True, 0.008, 1, 10, 80, 8, 0.02, 5, 1, 1, 4, 0.0001, 1, 0, 5) YIELD *;
```

**2.** Call link prediction:
```cypher
CALL link_prediction.predict() YIELD *;
```

### 6. Memgraph Lab style

#### PageRank style

```
@NodeStyle {
  size: Sqrt(Mul(Div(Property(node, "rank"), 1), 200000))
  border-width: 1
  border-color: #000000
  shadow-color: #1D9BF0
  shadow-size: 10
  image-url: "https://i.imgur.com/UV7Nl0i.png"
}

@NodeStyle Greater?(Size(Labels(node)), 0) {
  label: Format(":{}", Join(Labels(node), " :"))
}

@NodeStyle HasLabel?(node, "User") {
  color: #1D9BF0
  color-hover: Darker(#dd2222)
  color-selected: #dd2222
}

@NodeStyle HasProperty?(node, "username") {
  label: AsText(Property(node, "username"))
}

@EdgeStyle {
  width: 1
}
```

#### Community detection style

```
@NodeStyle {
  size: 50
  border-width: 1
  border-color: #000000
  shadow-color: #1D9BF0
  shadow-size: 10
  image-url: "https://i.imgur.com/UV7Nl0i.png"
}

@NodeStyle Greater?(Size(Labels(node)), 0) {
  label: Format(":{}", Join(Labels(node), " :"))
}

@NodeStyle HasLabel?(node, "User") {
  color: #dd2222
  color-hover: Darker(#dd2222)
  color-selected: #dd2222
}

@NodeStyle HasLabel?(node, "__mg_vertex__") {
  color: #FB6E00
  color-hover: Darker(#FB6E00)
  color-selected: #FB6E00
}

@NodeStyle HasProperty?(node, "name") {
  label: AsText(Property(node, "name"))
}

@EdgeStyle {
  width: 3
}


@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 0)) {
  color: #808000 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 1)) {
  color: #00FF00 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 2)) {
  color: #00FFFF  
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 3)) {
  color: #008080  
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 4)) {
  color: #800000 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 5)) {
  color: #FFCD18
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 6)) {
  color: #FF00FF 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 7)) {
  color: #800080 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 8)) {
  color: #CCCD18
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 9)) {
  color: #CD5C5C 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 10)) {
  color: #F08080  
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 11)) {
  color: #FA8072  
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 12)) {
  color: #E9967A   
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 13)) {
  color: #FFA07A   
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 14)) {
  color: #FF0000 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 15)) {
  color: #8B0000
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 16)) {
  color: #FF00FF 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 17)) {
  color: #FF8C00 
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 18)) {
  color: #FFEFD5
}
@NodeStyle And(HasProperty?(node, "cluster"), Equals?(Property(node, "cluster"), 19)) {
  color: #FFE4B5 
}
```
## 7. Node embedding visual

![memgraph-tutorial-example-embedding](https://public-assets.memgraph.com/node-embeddings/memgraph-tutorial-example-embedding.png)
![karate-club-graph](/img/karate-club-graph.png)
![karate-club-matplotlib](/img/karate-club-matplotlib.png)
