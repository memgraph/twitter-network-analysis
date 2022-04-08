from argparse import ArgumentParser
from eventlet import greenthread
from flask import Flask, Response
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit
from functools import wraps
from kafka import KafkaConsumer
import pulsar
import eventlet
import json
import logging
import os
import server.setup as setup
import time

eventlet.monkey_patch()

KAFKA_IP = os.getenv("KAFKA_IP", "kafka")
KAFKA_PORT = os.getenv("KAFKA_PORT", "9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "created_objects")

PULSAR_IP = os.getenv("PULSAR_IP", "pulsar")
PULSAR_PORT = os.getenv("PULSAR_PORT", "6650")
PULSAR_TOPIC = os.getenv("PULSAR_TOPIC", "created_objects")

MEMGRAPH_IP = os.getenv("MEMGRAPH_IP", "memgraph-mage")
MEMGRAPH_PORT = os.getenv("MEMGRAPH_PORT", "7687")

BROKER = os.getenv("BROKER", "kafka")

logging.getLogger("server").setLevel(logging.ERROR)
log = logging.getLogger("server")


def init_log():
    logging.basicConfig(level=logging.DEBUG)
    log.info("Logging is enabled")
    logging.getLogger("werkzeug").setLevel(logging.WARNING)


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


def set_up_memgraph_and_broker():
    global memgraph
    memgraph = setup.connect_to_memgraph(MEMGRAPH_IP, MEMGRAPH_PORT)
    setup.run(memgraph)


@app.route("/health", methods=["GET"])
@cross_origin()
def get_health():
    return Response(json.dumps("Health OK"), status=200)


def kafkaconsumer():
    consumer = KafkaConsumer(KAFKA_TOPIC, bootstrap_servers=KAFKA_IP + ":" + KAFKA_PORT)
    try:
        while True:
            msg_pack = consumer.poll()
            if not msg_pack:
                greenthread.sleep(1)
                continue
            for _, messages in msg_pack.items():
                for message in messages:
                    message = json.loads(message.value.decode("utf8"))
                    log.info("Message: " + str(message))
                    try:
                        socketio.emit("consumer", {"data": message})
                    except Exception as error:
                        log.info(f"`{message}`, {repr(error)}")
                        continue
    except KeyboardInterrupt:
        pass


def pulsarconsumer():
    client = pulsar.Client("pulsar://" + PULSAR_IP + ":" + PULSAR_PORT)
    consumer = client.subscribe(
        PULSAR_TOPIC, "backend-subscription", consumer_type=pulsar.ConsumerType.Shared
    )
    while True:
        msg = consumer.receive()
        message = json.loads(msg.data().decode("utf8"))
        log.info(message)
        try:
            consumer.acknowledge(msg)
            socketio.emit("consumer", {"data": message})
        except Exception as error:
            log.info(f"`{message}`, {repr(error)}")
            consumer.negative_acknowledge(msg)
            client.close()
        greenthread.sleep(0.2)


@app.before_first_request
def execute_this():
    init_log()
    greenthread.spawn(set_up_memgraph_and_broker())
    if BROKER == 'kafka':
        greenthread.spawn(kafkaconsumer)
    else:    
        greenthread.spawn(pulsarconsumer)
