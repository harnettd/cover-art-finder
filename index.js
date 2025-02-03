import express from "express";
import axios from "axios";

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const musicBrainzApiUrl = "https://musicbrainz.org/ws/2";
const coverArtArchiveApiUrl = "https://coverartarchive.org";

const queryArtist = (query) => {
  const url = `${musicBrainzApiUrl}/artist`;
  const params = { query: query };
  const headers = {
    Accept: "application/json",
    "User-Agent": "cover-art-finder/1.0.0 (DHarnett.dev@proton.me)",
  };
  return axios.get(url, { params: params, headers: headers });
};

const parseArtists = (result) => {
  const artists = [];
  result.data.artists.forEach((artist) => {
    const nextArtist = {
      id: artist.id,
      name: artist.name,
      score: artist.score,
      country: artist.country,
      disambiguation: artist.disambiguation,
    };
    artists.push(nextArtist);
  });
  return artists;
};

const getAlbums = (artistId) => {
  const url = `${musicBrainzApiUrl}/release`;
  const params = {
    artist: artistId,
    type: "album",
  };
  const headers = {
    Accept: "application/json",
    "User-Agent": "cover-art-finder/1.0.0 (DHarnett.dev@proton.me)",
  };
  return axios.get(url, { params: params, headers: headers });
};

const parseAlbums = (result) => {
  const albums = [];
  result.data.releases.forEach((album) => {
    const nextAlbum = {
      id: album.id,
      title: album.title,
    };
    albums.push(nextAlbum);
  });
  return albums;
};

// const getCoverArtUrl = (albumId) => {
//     const url = `${coverArtArchiveApiUrl}/release/${albumId}`
// }

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/query", (req, res) => {
  const query = req.body.query;
  queryArtist(query)
    .then((result) => {
      const artists = parseArtists(result);
      res.render("index.ejs", { query: query, artists: artists });
    })
    .catch((error) => {
      console.log(error.response);
    });
});

app.post("/disambiguate", (req, res) => {
  const artistId = req.body.artistId;
  console.log(artistId);
  getAlbums(artistId)
    .then((result) => {
      const albums = parseAlbums(result);
      console.log(albums);
      res.render("index.ejs", { albums: albums });
    })
    .catch((error) => {
      console.log(error.response);
    });
});

const port = 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
