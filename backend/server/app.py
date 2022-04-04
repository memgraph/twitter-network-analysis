from argparse import ArgumentParser
from eventlet import greenthread
from flask import Flask, Response
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit
from functools import wraps
import pulsar
import eventlet
import json
import logging
import os
import server.setup as setup
import time

eventlet.monkey_patch()

PULSAR_IP = os.getenv("PULSAR_IP", "pulsar")
PULSAR_PORT = os.getenv("PULSAR_PORT", "6650")
PULSAR_TOPIC = os.getenv("PULSAR_TOPIC", "created_objects")
MEMGRAPH_IP = os.getenv("MEMGRAPH_IP", "memgraph-mage")
MEMGRAPH_PORT = os.getenv("MEMGRAPH_PORT", "7687")

logging.getLogger("pulsar").setLevel(logging.ERROR)
log = logging.getLogger(__name__)


def init_log():
    logging.basicConfig(level=logging.DEBUG)
    log.info("Logging is enabled")
    logging.getLogger("werkzeug").setLevel(logging.WARNING)


def parse_args():
    parser = ArgumentParser(
        description="A Twitter Network analyzer powered by Memgraph."
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host address.")
    parser.add_argument("--port", default=5000, type=int, help="App port.")
    parser.add_argument(
        "--debug",
        default=True,
        action="store_true",
        help="Start the Flask server in debug mode.",
    )
    return parser.parse_args()


def log_time(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start_time
        log.info(f"Time for {func.__name__} is {duration}")
        return result

    return wrapper


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")
cors = CORS(app)
memgraph = None


def set_up_memgraph_and_pulsar():
    global memgraph
    memgraph = setup.connect_to_memgraph(MEMGRAPH_IP, MEMGRAPH_PORT)
    setup.run(memgraph)


@app.route("/health", methods=["GET"])
@cross_origin()
def get_health():
    return Response(json.dumps("Health OK"), status=200)


def pulsarconsumer():
    client = pulsar.Client("pulsar://" + PULSAR_IP + ":" + PULSAR_PORT)
    consumer = client.subscribe(PULSAR_TOPIC, "my-subscription")
    try:
        while True:
            msg_pack = consumer.receive()
            if not msg_pack:
                greenthread.sleep(1)
                continue

            for _, messages in msg_pack.items():
                for message in messages:
                    message = json.loads(message.value.decode("utf8"))
                    log.info("Message: " + str(message))
                    try:
                        consumer.acknowledge(message)
                        socketio.emit("consumer", {"data": message})
                    except Exception as error:
                        log.info(f"`{message}`, {repr(error)}")
                        consumer.negative_acknowledge(message)
                        client.close()
                        continue
            try:
                log.info("Message: " + str(msg_pack))
                # Acknowledge successful processing of the message
                consumer.acknowledge(message)
            except:
                # Message failed to be processed
                consumer.negative_acknowledge(message)
                client.close()
    except KeyboardInterrupt:
        pass


@app.before_first_request
def execute_this():
    init_log()
    greenthread.spawn(set_up_memgraph_and_pulsar())
    greenthread.spawn(pulsarconsumer)
