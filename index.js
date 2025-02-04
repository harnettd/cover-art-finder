import express from "express";
import axios from "axios";

const musicBrainzApiUrl = "https://musicbrainz.org/ws/2";
const coverArtArchiveApiUrl = "https://coverartarchive.org";
const accept = "application/json";
const userAgent = "cover-art-finder/1.0.0 (DHarnett.dev@proton.me)";
const albumType = "album";
const albumLimit = 250;
const port = 3000;

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const handleError = (error) => {
  if (error.response) {
    console.log("response error");
    console.log(error.response.status);
    console.log(error.response.headers);
    console.log(error.response.data);
  } else if (error.request) {
    console.log("request error");
    console.log(error.request);
  } else {
    console.log("other error");
    console.log(error.message);
  }
  console.log(error.config);
};

const queryArtist = (query) => {
  const url = `${musicBrainzApiUrl}/artist`;
  const params = { query: query };
  const headers = {
    Accept: accept,
    "User-Agent": userAgent,
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
    type: albumType,
    limit: albumLimit,
  };
  const headers = {
    Accept: accept,
    "User-Agent": userAgent,
  };
  return axios.get(url, { params: params, headers: headers });
};

const parseAlbums = (result) => {
  const albums = [];
  result.data.releases.forEach((album) => {
    const nextAlbum = {
      id: album.id,
      title: album.title,
      status: album.status,
      disambiguation: album.disambiguation,
      frontCover: album["cover-art-archive"].front,
    };
    if (nextAlbum.frontCover) {
      albums.push(nextAlbum);
    }
  });
  console.log(albums);
  return albums;
};

const getCoverArtUrl = (albumId) => {
  const url = `${coverArtArchiveApiUrl}/release/${albumId}`;
  const headers = {
    Accept: accept,
    "User-Agent": userAgent,
  };
  return axios(url, { headers: headers });
};

const parseCoverArtResult = (result) => {
  console.log(result);
  const images = result.data.images;
  while (images.length > 0) {
    const image = images.pop();
    if (image.front && image.thumbnails["250"]) {
      return image.thumbnails["250"];
    }
  }
  return undefined;
};

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
    .catch(handleError);
});

app.post("/disambiguate", (req, res) => {
  const artistId = req.body.artistId;
  getAlbums(artistId)
    .then((result) => {
      const albums = parseAlbums(result);
      res.render("index.ejs", { albums: albums });
    })
    .catch(handleError);
});

app.post("/album-selection", (req, res) => {
  const albumIds = Object.keys(req.body);
  console.log(albumIds);
  const coverArtPromises = [];
  albumIds.forEach((albumId) => {
    coverArtPromises.push(getCoverArtUrl(albumId));
  });
  Promise.all(coverArtPromises)
    .then((results) => {
      console.log(`Number of results: ${results.length}`);
      const urls = [];
      results.forEach((result) => {
        urls.push(parseCoverArtResult(result));
      });
      console.log(urls);
      res.render("index.ejs", { urls: urls });
    })
    .catch(handleError);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
