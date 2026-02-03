import os
import json
import tqdm
import networkx as nx
import matplotlib.pyplot as plt

from pathlib import Path


class Graph:
    def __init__(self, cache_dir="data/cache/", regen=False):
        self.cache_dir = Path(cache_dir)
        self.regen = regen
        self.graph = nx.Graph()
        self.load_dict_file()
        self.build_graph()


    def load_dict_file(self):
        cache_file = self.cache_dir / "artists_tags.json"

        if not os.path.exists(cache_file) and not self.regen:
            print(f"Cache file {cache_file} does not exist. Please create it first.")
            return
        
        with open(cache_file, "r", encoding="utf-8") as f:
            self.similar_artists_dict = json.load(f)
        print(f"Loaded similar artists dict file from {cache_file}.")

        return self.similar_artists_dict


    def build_graph(self, max_nodes=None):
        print("Building graph from similar artists dict...")

        i = 0
        if max_nodes:
            print(f"Limiting to first {max_nodes} artists.")
        for artist, data in tqdm.tqdm(self.similar_artists_dict.items()):
            if max_nodes and i >= max_nodes:
                break
            i += 1
            for similar_artist, weight in data["similar_artists"].items():
                self.graph.add_edge(artist, similar_artist, weight=weight)
        print("Graph built.")
        return self.graph


    def visualize_2d_graph(self):
        pos = nx.spring_layout(self.graph, k=0.15, seed=42)

        weights = [self.graph[u][v]["weight"] for u, v in self.graph.edges()]
        
        plt.figure(figsize=(14, 14))
        nx.draw_networkx_nodes(self.graph, pos, node_size=50, alpha=0.7)
        nx.draw_networkx_edges(
            self.graph, pos,
            width=[w * 2 for w in weights],
            alpha=0.3
        )

        plt.axis("off")
        plt.savefig("artist_graph.png", format="PNG")
        plt.show()
