import mgp
import json


@mgp.transformation
def tweet(messages: mgp.Messages
          ) -> mgp.Record(query=str, parameters=mgp.Nullable[mgp.Map]):
    result_queries = []

    for i in range(messages.total_messages()):
        message = messages.message_at(i)
        tweet_dict = json.loads(message.payload().decode('utf8'))
        if tweet_dict["target_username"]:
            result_queries.append(
                mgp.Record(
                    query=("MERGE (u1:User {username: $source_username}) "
                           "MERGE (u2:User {username: $target_username}) "
                           "MERGE (u1)-[:RETWEETED]-(u2)"),
                    parameters={
                        "source_username": tweet_dict["source_username"],
                        "target_username": tweet_dict["target_username"]}))
        else:
            result_queries.append(
                mgp.Record(
                    query=("MERGE (:User {username: $source_username})"),
                    parameters={
                        "source_username": tweet_dict["source_username"]}))
    return result_queries
