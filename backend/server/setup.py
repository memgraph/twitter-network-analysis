from gqlalchemy import Memgraph
from time import sleep
import logging

log = logging.getLogger(__name__)


def connect_to_memgraph(memgraph_ip, memgraph_port):
    memgraph = Memgraph(host=memgraph_ip, port=int(memgraph_port))
    while(True):
        try:
            if (memgraph._get_cached_connection().is_active()):
                return memgraph
        except:
            log.info("Memgraph probably isn't running.")
            sleep(1)


def run(memgraph):
    try:
        memgraph.drop_database()

        log.info("Setting up PageRank")
        memgraph.execute("CALL pagerank_online.set(100, 0.2) YIELD *")
        memgraph.execute(
            """CREATE TRIGGER pagerank_trigger 
               BEFORE COMMIT 
               EXECUTE CALL pagerank_online.update(createdVertices, createdEdges, deletedVertices, deletedEdges) YIELD *
               SET node.rank = rank;""")

        log.info("Creating stream connections on Memgraph")
        memgraph.execute(
            "CREATE STREAM retweets TOPICS retweets TRANSFORM twitter.tweet")
        memgraph.execute("START STREAM retweets")

        log.info("Creating triggers on Memgraph")
        memgraph.execute(
            "CREATE TRIGGER created_trigger ON CREATE AFTER COMMIT EXECUTE CALL publisher.create(createdObjects)")
    except Exception as e:
        log.info(f"Error on stream and trigger creation: {e}")
        pass
