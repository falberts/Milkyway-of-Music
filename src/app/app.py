#!usr/env/bin python3

from utils.lastfm import LastFM
from utils.graph import Graph
from utils.galaxy import GalaxyGraph


def app():
    regen = False           # Set to true if you wish to generate everything from scratch
                            # (including the initial top artists)

    LastFM(
        regen=regen,

        top_limit=1000,     # Amount of initial top artists.

        depth=3,            # Recursion depth. For example, with a recursion depth of 3: 
                            # for each of the artists similar to one of the top artists, 
                            # the most similar artists are collected, after which this process 
                            # repeats for each of those artists for 2 more iterations.

        similar_limit=5     # Amount of similar artist included for each artist. Increasing this 
                            # may improve the quality of the embeddings.
        )

    graph = Graph(regen=regen)

    galaxy = GalaxyGraph(graph, regen=regen)

    galaxy.spiral_warp()
    galaxy.visualize_spiral_galaxy_3d_interactive()
    galaxy.export_to_json()


if __name__ == "__main__":
    app()
