from multiprocessing import Process
import argparse
import csv
import os
import pulsar_utils

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
    value = parser.parse_args()
    return value


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


def main():
    args = parse_arguments()
    process_list = list()

    p1 = Process(
        target=lambda: pulsar_utils.producer(
            PULSAR_IP, PULSAR_PORT, PULSAR_TOPIC, generate_tweets, args.stream_delay
        )
    )
    p1.start()
    process_list.append(p1)

    p2 = Process(
        target=lambda: pulsar_utils.consumer(
            PULSAR_IP, PULSAR_PORT, PULSAR_TOPIC, "Pulsar"
        )
    )
    p2.start()
    process_list.append(p2)

    for process in process_list:
        process.join()


if __name__ == "__main__":
    main()
