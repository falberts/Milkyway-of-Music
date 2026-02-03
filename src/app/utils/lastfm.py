import requests
import json
import os
from pathlib import Path
import tqdm
import time

from typing import List
from collections import deque


class LastFM:

    BASE_URL = "https://ws.audioscrobbler.com/2.0/"


    def __init__(self, api_key=None, regen=False, cache_dir="data/cache"):
        self.api_key = api_key or os.environ.get("LASTFM_API_KEY")
        self.regen = regen
        if not self.api_key:
            raise ValueError("LASTFM_API_KEY not set")
        
        self.cache_dir = Path(cache_dir)
        self.top_artists_cache = self.cache_dir / "top_artists"
        self.similar_artists_cache = self.cache_dir / "similar_artists"
        self.similar_artists_dict = {}
        self.all_tags = {}
        self.create_similar_artists_cache()
        self.create_dict_file()


    def _init_cache_dirs(self):
        self.top_artists_cache.mkdir(parents=True, exist_ok=True)
        self.similar_artists_cache.mkdir(parents=True, exist_ok=True)


    def _request(self, params):
        params = {
            **params,
            "api_key": self.api_key,
            "format": "json",
        }
        
        response = requests.get(self.BASE_URL, params=params)
        
        for i in range(3):
            try:
                data = response.json()
                continue
            except requests.exceptions.RequestException as e:
                print(e)
                time.sleep(0.5)
                print("Trying again...")
                data = {}

        if "error" in data:
            return {}

        return data


    def create_dict(self):
        similar_artists_cache_dir = self.cache_dir / "similar_artists"

        print(f"Creating dict of all artists...")
        for file in tqdm.tqdm(list(similar_artists_cache_dir.glob("*.json"))):
            dict_entry = {}

            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                artist_name = file.stem.replace('_', '/')

                for similar in data:
                    dict_entry[similar.get("name")] = float(similar.get("match", 0))

                self.similar_artists_dict[artist_name] = {
                    "similar_artists": dict_entry,
                    "tags": [],
                    "bio": "",
                    "links": {}
                }


    def add_tags(self):
        all_artist_names = list(self.similar_artists_dict.keys())

        print(f"Adding tags to {len(self.similar_artists_dict)} artists...")
        for i in tqdm.tqdm(range(0, len(all_artist_names))):
            artist_name = all_artist_names[i]
            data = self._request({
            "method": "artist.gettoptags",
            "artist": artist_name,
            "autocorrect": 1,
            })

            tags = data.get("toptags", {}).get("tag", [])

            tags_data = {}

            for tag in tags:
                name = tag.get("name").lower()
                pop = tag.get("count")
                if name not in self.all_tags:
                    self.all_tags[name] = pop
                else:
                    self.all_tags[name] += pop
                tags_data[name] = pop
            
            self.similar_artists_dict[artist_name]["tags"] = tags_data
            
            time.sleep(0.5)
        
        cache_file = self.cache_dir / "all_tags.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(self.all_tags, f, indent=2)
        print(f"Created all tags file at {cache_file}.")


    def add_artist_info(self):
        all_artist_names = list(self.similar_artists_dict.keys())

        print(f"Adding artist info to {len(self.similar_artists_dict)} artists...")
        for i in tqdm.tqdm(range(0, len(all_artist_names))):
            artist_name = all_artist_names[i]
            data = self._request({
            "method": "artist.getinfo",
            "artist": artist_name,
            "autocorrect": 1,
            })

            bio = data.get("artist", {}).get("bio", {}).get("summary")
            mbid = data.get("artist", {}).get("mbid")
            links = self.get_artist_links_from_mbid(mbid) if mbid else {
                "spotify": None,
                "youtube": None,
                "apple_music": None
                }

            self.similar_artists_dict[artist_name]["links"] = links

            self.similar_artists_dict[artist_name]["bio"] = bio

        time.sleep(0.5)


    def get_artist_links_from_mbid(self, mbid):

        time.sleep(3)

        url = "https://query.wikidata.org/sparql"

        query = f"""
        SELECT ?spotifyId ?youtubeId ?appleMusicId WHERE {{
        ?artist wdt:P434 "{mbid}" .
        OPTIONAL {{ ?artist wdt:P1902 ?spotifyId . }}
        OPTIONAL {{ ?artist wdt:P2397 ?youtubeId . }}
        OPTIONAL {{ ?artist wdt:P2850 ?appleMusicId . }}
        }}
        """

        headers = {
            "Accept": "application/sparql-results+json"
        }
        response = requests.get(url, params={"query": query}, headers=headers)

        links = {
            "spotify": None,
            "youtube": None,
            "apple_music": None
        }

        try:
            response = requests.get(
                url,
                params={"query": query},
                headers=headers,
                timeout=5
            )
            data = response.json()

            bindings = data.get("results", {}).get("bindings", [])
            if not bindings:
                return links

            b = bindings[0]

            if "spotifyId" in b:
                links["spotify"] = f"https://open.spotify.com/artist/{b['spotifyId']['value']}"

            if "youtubeId" in b:
                links["youtube"] = f"https://www.youtube.com/channel/{b['youtubeId']['value']}"

            if "appleMusicId" in b:
                links["apple_music"] = f"https://music.apple.com/artist/{b['appleMusicId']['value']}"

            return links

        except requests.RequestException as e:
            print(f"Wikidata query failed for MBID {mbid}: {e}")
            return links


    def create_dict_file(self):
        cache_file = self.cache_dir / "artists_tags.json"

        if os.path.exists(cache_file) and not self.regen:
            print(f"Cache file {cache_file} already exists. Skipping creation.")
            return
        
        self.create_dict()
        self.add_artist_info()
        self.add_tags()

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(self.similar_artists_dict, f, indent=2)
        print(f"Created similar artists dict file at {cache_file}.")


    def get_similar_artists(self, artist_name, limit=5):
        cache_file = self.similar_artists_cache / f"{artist_name.replace('/', '_')}.json"

        if cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)

        data = self._request({
            "method": "artist.getsimilar",
            "artist": artist_name,
            "limit": limit,
            "autocorrect": 1,
        })

        artists = data.get("similarartists", {}).get("artist", [])

        if artists:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(artists, f, ensure_ascii=False, indent=2)

            time.sleep(0.5)

        return artists


    def get_top_artists(self, limit=500):
        json_cache = self.top_artists_cache / f"top_artists_{limit}.json"
        txt_cache = self.top_artists_cache / f"top_artists_{limit}.txt"

        if json_cache.exists() and txt_cache.exists() and not self.regen:
            with open(json_cache, "r", encoding="utf-8") as f:
                return json.load(f)

        data = self._request({
            "method": "chart.gettopartists",
            "limit": limit,
        })

        artists = data.get("artists", {}).get("artist", [])

        if artists:
            with open(json_cache, "w", encoding="utf-8") as f:
                json.dump(artists, f, ensure_ascii=False, indent=2)

            with open(txt_cache, "w", encoding="utf-8") as f:
                for artist in artists:
                    f.write(artist.get("name", "") + "\n")
        
        time.sleep(0.5)

        return artists


    def create_similar_artists_cache(self, depth=3, top_limit=1000, similar_limit=5):
        if os.path.exists(self.similar_artists_cache):
            print(f"Cache directory already exists. Skipping creation.")
            return
        self._init_cache_dirs()

        top_artists = self.get_top_artists(limit=top_limit)

        visited = set()
        queue = deque()

        for artist in top_artists:
            name = artist.get("name")
            if name:
                queue.append((name, 0))

        print("Creating similar artists cache...")

        while queue:
            artist_name, level = queue.popleft()

            if level >= depth:
                continue

            if artist_name in visited:
                continue

            visited.add(artist_name)

            similar_artists = self.get_similar_artists(artist_name, limit=similar_limit)

            for sim_artist in similar_artists:
                sim_name = sim_artist.get("name")
                if sim_name and sim_name not in visited:
                    queue.append((sim_name, level + 1))
