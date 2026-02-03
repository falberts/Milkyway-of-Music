#!usr/env/bin python3

from utils.lastfm import LastFM
from utils.graph import Graph
from utils.galaxy import GalaxyGraph


def app():
    regen = False

    LastFM(regen=regen)

    graph = Graph(regen=regen)

    galaxy = GalaxyGraph(graph, regen=regen)

    galaxy.spiral_warp()
    galaxy.visualize_spiral_galaxy_3d_interactive()
    galaxy.export_to_json()


if __name__ == "__main__":
    app()
