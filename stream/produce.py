import argparse
import csv
import os
import json
import pulsar
from kafka import KafkaProducer
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError, NoBrokersAvailable
from time import sleep

KAFKA_IP = os.getenv("KAFKA_IP", "kafka")
KAFKA_PORT = os.getenv("KAFKA_PORT", "9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "retweets")

PULSAR_IP = os.getenv("PULSAR_IP", "pulsar")
PULSAR_PORT = os.getenv("PULSAR_PORT", "6650")
PULSAR_TOPIC = os.getenv("PULSAR_TOPIC", "retweets")

TWITTER_DATA = "data/scraped_tweets.csv"


def restricted_float(x):
    try:
        x = float(x)
    except ValueError:
        raise argparse.ArgumentTypeError("%r not a floating-point literal" % (x,))
    if x < 0.0 or x > 3.0:
        raise argparse.ArgumentTypeError("%r not in range [0.0, 3.0]" % (x,))
    return x


def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stream-delay",
        type=restricted_float,
        default=2.0,
        help="Seconds to wait before producing a new message (MIN=0.0, MAX=3.0)",
    )
    parser.add_argument("--broker", choices=["kafka", "pulsar"])
    return parser.parse_args()


def generate_tweets():
    while True:
        with open(TWITTER_DATA) as file:
            csvReader = csv.DictReader(file)
            for rows in csvReader:
                data = {
                    "source_username": rows["source_username"],
                    "target_username": rows["target_username"],
                }
                yield data


def get_admin_client(ip, port):
    retries = 30
    while True:
        try:
            admin_client = KafkaAdminClient(
                bootstrap_servers=ip + ":" + port, client_id="test"
            )
            return admin_client
        except NoBrokersAvailable:
            retries -= 1
            if not retries:
                raise
            sleep(1)


def create_topic(ip, port, topic):
    admin_client = get_admin_client(ip, port)
    my_topic = [NewTopic(name=topic, num_partitions=1, replication_factor=1)]
    try:
        admin_client.create_topics(new_topics=my_topic, validate_only=False)
    except TopicAlreadyExistsError:
        pass
    print("All topics:")
    print(admin_client.list_topics())


def create_kafka_producer(ip, port):
    retries = 30
    while True:
        try:
            producer = KafkaProducer(bootstrap_servers=ip + ":" + port)
            return producer
        except NoBrokersAvailable:
            retries -= 1
            if not retries:
                raise
            print("Failed to connect to Kafka")
            sleep(1)


def kafka_producer(ip, port, topic, generate, stream_delay):
    producer = create_kafka_producer(ip, port)
    message = generate()
    while True:
        try:
            producer.send(topic, json.dumps(next(message)).encode("utf8"))
            print("Produce: ", message)
            producer.flush()
            sleep(stream_delay)
        except Exception as e:
            print(f"Error: {e}")


def pulsar_producer(ip, port, topic, generate, stream_delay):
    client = pulsar.Client("pulsar://" + ip + ":" + port)
    producer = client.create_producer(topic)
    message = generate()
    while True:
        try:
            msg = json.dumps(next(message))
            producer.send(msg.encode("utf8"))
            print("Produce: ", msg)
            producer.flush()
            sleep(stream_delay)
        except Exception as e:
            print(f"Error: {e}")


def main():
    args = parse_arguments()
    sleep(15)
    if args.broker == "kafka":
        create_topic(KAFKA_IP, KAFKA_PORT, KAFKA_TOPIC)
        kafka_producer(
            KAFKA_IP, KAFKA_PORT, KAFKA_TOPIC, generate_tweets, args.stream_delay
        )
    else:
        pulsar_producer(
            PULSAR_IP, PULSAR_PORT, PULSAR_TOPIC, generate_tweets, args.stream_delay
        )


if __name__ == "__main__":
    main()
