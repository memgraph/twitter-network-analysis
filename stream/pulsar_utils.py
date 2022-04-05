from time import sleep
import json
import pulsar


def producer(ip, port, topic, generate, stream_delay):
    client = pulsar.Client("pulsar://" + ip + ":" + port)
    producer = client.create_producer(topic)
    message = generate()
    while True:
        try:
            producer.send(json.dumps(next(message)).encode("utf8"))
            sleep(stream_delay)
        except Exception as e:
            print(f"Error: {e}")


def consumer(ip, port, topic, platform):
    client = pulsar.Client("pulsar://" + ip + ":" + port)
    consumer = client.subscribe(
        topic, "source-subscription", consumer_type=pulsar.ConsumerType.Shared
    )
    while True:
        msg = consumer.receive()
        try:
            print(platform, ": ", msg.data())
            consumer.acknowledge(msg)
        except:
            consumer.negative_acknowledge(msg)
            client.close()
