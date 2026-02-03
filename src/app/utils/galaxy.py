import os
import json
import tqdm
import networkx as nx
import matplotlib.pyplot as plt
import numpy as np
import plotly.graph_objects as go

from pathlib import Path
from node2vec import Node2Vec
from sklearn.decomposition import PCA

from utils.graph import Graph


class GalaxyGraph(Graph):
    def __init__(self, graph: Graph, regen=False):
        super().__init__()
        self.graph = graph.graph
        self.regen = regen
        self.embeddings = None
        self.galaxy_positions = None
        self.compute_node2vec_embeddings()
        self.reduce_embeddings_3d()


    def compute_node2vec_embeddings(
        self,
        dimensions=64,
        walk_length=30,
        num_walks=200,
        p=1.0,
        q=0.5,
        workers=4
        ):

        cache_file = self.cache_dir / "node2vec_embeddings.json"

        if os.path.exists(cache_file) and not self.regen:
            print(f"Cache file {cache_file} already exists. Skipping computation.")
            with open(cache_file, "r", encoding="utf-8") as f:
                embeddings = json.load(f)
                self.embeddings = embeddings
                return embeddings

        print("Computing Node2Vec embeddings...")

        node2vec = Node2Vec(
            self.graph,
            dimensions=dimensions,
            walk_length=walk_length,
            num_walks=num_walks,
            p=p,
            q=q,
            workers=workers,
            weight_key="weight"
        )

        print("Fitting Node2Vec model...")

        model = node2vec.fit(window=10, min_count=1, batch_words=4)

        print("Extracting embeddings...")

        embeddings = {
            node: model.wv[node]
            for node in self.graph.nodes()
        }

        print("Embeddings computed.")

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump({node: emb.tolist() for node, emb in embeddings.items()}, f)
        print(f"Saved Node2Vec embeddings to {cache_file}.")

        self.embeddings = embeddings
        return embeddings


    def reduce_embeddings_3d(self):
        if not self.embeddings:
            print("Embeddings not computed yet. Please run compute_node2vec_embeddings() first.")
            return None, None
        nodes = list(self.embeddings.keys())
        x = np.array([self.embeddings[n] for n in nodes])

        embeddings_3d = PCA(n_components=3).fit_transform(x)
        self.nodes = nodes
        self.embeddings_3d = embeddings_3d

        return nodes, embeddings_3d


    def spiral_warp(self, spiral_strength=1.5, z_scale=0.3):
        if self.embeddings_3d is None:
            raise ValueError("Call reduce_embeddings_3d() first.")

        X = self.embeddings_3d.copy()

        X -= X.mean(axis=0)

        X[:, 2] *= z_scale

        x, y, z = X[:, 0], X[:, 1], X[:, 2]
        r = np.sqrt(x**2 + y**2)
        theta = np.arctan2(y, x)

        theta_new = theta + spiral_strength * r

        x_new = r * np.cos(theta_new)
        y_new = r * np.sin(theta_new)

        z_new = z * z_scale

        self.galaxy_positions = np.stack([x_new, y_new, z_new], axis=1)
        return self.galaxy_positions


    def visualize_spiral_galaxy_3d_interactive(self):
        if not self.galaxy_positions.any():
            print("Galaxy positions has not been created yet. Run .spiral_warp() first.")

        hover_text = self.nodes
        fig = go.Figure(
            data=[
                go.Scatter3d(
                    x=self.galaxy_positions[:, 0],
                    y=self.galaxy_positions[:, 1],
                    z=self.galaxy_positions[:, 2],
                    mode="markers",
                    marker=dict(
                        size=3,
                        opacity=0.7
                    ),
                    text=hover_text,
                    hoverinfo="text"
                )
            ]
        )

        fig.update_layout(
            title="Artist Similarity Galaxy (3D)",
            scene=dict(
                xaxis_title="X",
                yaxis_title="Y",
                zaxis_title="Z",
                aspectmode="data",
            ),
            margin=dict(l=0, r=0, t=40, b=0),
        )

        fig.show()


    def top_10_similar(self, node_name):
        if node_name not in self.embeddings:
            print(f"Node {node_name} not found in embeddings.")
            return []

        node_embedding = self.embeddings[node_name]
        similarities = {}

        for other_node, other_embedding in self.embeddings.items():
            if other_node == node_name:
                continue
            similarity = np.dot(node_embedding, other_embedding) / (np.linalg.norm(node_embedding) * np.linalg.norm(other_embedding))
            similarities[other_node] = similarity

        top_10_similar = sorted(similarities.items(), key=lambda item: item[1], reverse=True)[:10]

        print(f"Top 10 similar artists to {node_name}:")
        for artist, similarity in top_10_similar:
            print(f"* {artist}: {similarity:.4f}")
        return top_10_similar


    def closest_to_center(self):
        if not self.embeddings_3d.any():
            print("3D embeddings not computed yet. Please run reduce_embeddings_3d() first.")
            return []

        center = np.mean(self.embeddings_3d, axis=0)
        distances = {}

        for i, node in enumerate(self.nodes):
            embedding = self.embeddings_3d[i]
            distance = np.linalg.norm(embedding - center)
            distances[node] = distance

        closest_artists = sorted(distances.items(), key=lambda item: item[1])[:10]

        print("Top 10 artists closest to the center of the galaxy:")
        for artist, distance in closest_artists:
            print(f"* {artist}: {distance:.4f}")
        return closest_artists


    def export_to_json(self):
        if not self.galaxy_positions.any():
            print("Galaxy positions has not been created yet. Run .spiral_warp() first.")
        json_data_file = self.cache_dir / "artist_galaxy.json"

        galaxy_positions_dict = {}
        for i, pos in enumerate(self.galaxy_positions):
            name = self.nodes[i]
            try:
                tags = self.similar_artists_dict[name]["tags"]
                bio = self.similar_artists_dict[name]["bio"]
                links = self.similar_artists_dict[name]["links"]
            except KeyError:
                tags = []
                bio = ""
                links = {
                    "spotify": None,
                    "youtube": None,
                    "apple_music": None
                    }
            galaxy_positions_dict[name] = {
                "positions": list(pos),
                "tags": tags,
                "bio": bio,
                "links": links
                }

        if os.path.exists(self.cache_dir):
            if os.path.exists(json_data_file) and not self.regen:
                print(f"Galaxy positions JSON already created at {json_data_file}, skipping creation.")
                return None
            with open(json_data_file, "w", encoding="utf-8") as f:
                json.dump(galaxy_positions_dict, f, indent=2)
                print(f"Galaxy positions JSON created at {json_data_file}.")
        else:
            print(f"{self.cache_dir} is not a valid path.")
