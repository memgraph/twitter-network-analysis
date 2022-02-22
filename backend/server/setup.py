from gqlalchemy import Memgraph
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
    pass
    # TODO: Add the graph analytics setup
