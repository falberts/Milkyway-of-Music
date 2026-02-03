
# 🌌✨ Milkyway of Music ✨🌌

![img1](img/description_img.png)

### Find new music based on artists you like by exploring the music Milky Way!

This project allows you to explore a 3D galaxy, where each star represents a musical artist. Each star can be clicked, which will open up a sidebar containing relevant information about the artist, as well as a top 10 of artists that are similar which can be used to easily find new music recommendations. Additionally, you can use the search bar for easy lookup.

## Features:

- Fully 3D explorable galaxy, where each star is clickable and labeled with an artist name
- Artist search
- Artist information derived from [last.fm](https://www.last.fm/home) (artist bio, user tags)
- List of top 10 most similar artists for each selected artist, where each entry is clickable to allow for easy navigation
- Links to popular music platforms (Spotify, Apple Music, YouTube) if available on [Wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page)


## How to use:

First, open up a terminal and navigate to the ./webapp/ directory:

```bash
cd /your/path/to/webapp
```

Here, start a local server, for example using Python's built-in module:

```bash
python -m http.server
```

To open this in a browser, ctrl-click the URL that will appear in the terminal:

```bash
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Alternatively, open up your browser and enter the following in the search bar:

```
localhost:8000/
```

To close the server, simply use ctrl-c in the terminal (or close it).

##  (Re)generating the data:

(NOTE: to run these steps, you will first need to request a last.FM api key [here](https://www.last.fm/api/authentication)).

The ./src/ folder includes the pre-processing code required to generate the data. Here, you can experiment with different settings for the amount of top artists, recursion depth, amount of similar artists and galaxy shape. To run, simple run the following commands in the music_milkyway/ directory:

```bash
export LASTFM_API_KEY="your_api_key"
python src/app/app.py
```

NOTE: This assumes you have the required packages installed. If not, install these first by running the following in the same directory:

```bash
pip install -r requirements.txt
```

It is recommended that you do this in a [virtual environment](https://docs.python.org/3/library/venv.html).

### Tools Used:

#### Data collection:
- Python 3.12
    - Node2vec, scikit-learn, plotly
- last.fm API
- Wikidata + SparQL

#### Visualization:
- HTML/CSS/JavaScript
- three.js
