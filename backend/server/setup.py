from gqlalchemy import Memgraph, MemgraphKafkaStream, MemgraphTrigger
from gqlalchemy.models import (
    TriggerEventType,
    TriggerEventObject,
    TriggerExecutionPhase,
)
from time import sleep
import logging

log = logging.getLogger(__name__)


def connect_to_memgraph(memgraph_ip, memgraph_port):
    memgraph = Memgraph(host=memgraph_ip, port=int(memgraph_port))
    while True:
        try:
            if memgraph._get_cached_connection().is_active():
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
               SET node.rank = rank
               CALL publisher.update_rank(node, rank);"""
        )

        log.info("Setting up community detection")

        memgraph.execute(
            "CALL community_detection_online.set(False, False, 0.7, 4.0, 0.1, 'weight', 1.0, 100, 5) YIELD *;"
        )
        memgraph.execute(
            """CREATE TRIGGER labelrankt_trigger 
               BEFORE COMMIT
               EXECUTE CALL community_detection_online.update(createdVertices, createdEdges, updatedVertices, updatedEdges, deletedVertices, deletedEdges) 
               YIELD node, community_id
               SET node.cluster=community_id
               CALL publisher.update_cluster(node, community_id);"""
        )

        log.info("Creating stream connections on Memgraph")
        # TODO Create and start stream
        log.info("Creating trigger on Memgraph")
        # TODO Create trigger

    except Exception as e:
        log.info(f"Error on stream and trigger creation: {e}")
        pass
