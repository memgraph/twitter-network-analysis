from time import sleep
import json
import pulsar


def producer(ip, port, topic, generate, stream_delay):
    client = pulsar.Client("pulsar://" + ip + ":" + port)
    producer = client.create_producer(topic)
    message = generate()
    while True:
        try:
            msg = json.dumps(next(message))
            producer.send(msg.encode("utf8"))
            print("Produce: ", msg.encode("utf8"))
            producer.flush()
            sleep(stream_delay)
        except Exception as e:
            print(f"Error: {e}")
