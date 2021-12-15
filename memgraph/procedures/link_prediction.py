import gc
import itertools
import numpy as np
from typing import Dict, List, Tuple
import mgp

TOP_K_PREDICTIONS = 8


def calculate_adjacency_matrix(embeddings: Dict[int, List[float]], threshold=0.0) -> Dict[Tuple[int, int], float]:
    def get_edge_weight(i, j) -> float:
        if embeddings[i] is None or embeddings[j] is None:
            return -1
        return np.dot(embeddings[i], embeddings[j])

    nodes = list(embeddings.keys())
    nodes = sorted(nodes)
    adj_mtx_r = {}
    cnt = 0
    for pair in itertools.combinations(nodes, 2):

        if cnt % 1000000 == 0:
            adj_mtx_r = {k: v for k, v in sorted(adj_mtx_r.items(), key=lambda item: -1 * item[1])}
            adj_mtx_r = {k: adj_mtx_r[k] for k in list(adj_mtx_r)[:TOP_K_PREDICTIONS]}
            gc.collect()

        weight = get_edge_weight(pair[0], pair[1])
        if weight <= threshold:
            continue
        cnt += 1
        adj_mtx_r[(pair[0], pair[1])] = get_edge_weight(pair[0], pair[1])

    return adj_mtx_r


@mgp.read_proc
def predict(ctx: mgp.ProcCtx) -> mgp.Record(edges=mgp.List[mgp.List[mgp.Vertex]]):
    embeddings: Dict[int, List[float]] = {}

    for vertex in ctx.graph.vertices:
        embedding = vertex.properties.get("embedding", None)
        if embedding is None:
            continue
        embeddings[int(vertex.id)] = embedding

    adj_matrix = calculate_adjacency_matrix(embeddings)
    sorted_predicted_edges = {k: v for k, v in sorted(adj_matrix.items(), key=lambda item: -1 * item[1])}

    edges: List[mgp.List[mgp.Vertex]] = []

    for edge, similarity in sorted_predicted_edges.items():
        vertex_from = ctx.graph.get_vertex_by_id(edge[0])
        vertex_to = ctx.graph.get_vertex_by_id(edge[1])

        edges.append([vertex_from, vertex_to])

    return mgp.Record(edges=edges)
