from email.errors import MessageError
import mgp
import json


@mgp.transformation
def tweet(
    messages: mgp.Messages,
) -> mgp.Record(query=str, parameters=mgp.Nullable[mgp.Map]):
    result_queries = []

    # TODO: Write a transformation module
    return result_queries
