import express from "express";
import axios from "axios";

const musicBrainzApiUrl = "https://musicbrainz.org/ws/2";
const coverArtArchiveApiUrl = "https://coverartarchive.org";
const accept = "application/json";
const userAgent = "cover-art-finder/1.0.0 (DHarnett.dev@proton.me)";
const minArtistScore = 75;
const albumType = "album";
const albumLimit = 500;
const port = 3000;

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const appData = {
  query: null,
  artists: [],
  artistId: null,
  albums: [],
  albumIds: [],
  coverArtUrls: [],
};

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

const parseArtists = (response) => {
  const artists = response.data.artists;
  const parsedArtists = artists.map((artist) => {
    return {
      id: artist.id,
      name: artist.name,
      score: artist.score,
      country: artist.country,
      disambiguation: artist.disambiguation,
    };
  });
  return parsedArtists.filter((artist) => artist.score >= minArtistScore);
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

const parseAlbums = (response) => {
  const releases = response.data.releases;
  return releases
    .map((release) => {
      return {
        id: release.id,
        title: release.title,
        disambiguation: release.disambiguation,
        frontCover: release["cover-art-archive"].front,
      };
    })
    .filter((release) => release.frontCover);
};

const getCoverArt = (albumId) => {
  const url = `${coverArtArchiveApiUrl}/release/${albumId}`;
  const headers = {
    Accept: accept,
    "User-Agent": userAgent,
  };
  return axios(url, { headers: headers });
};

const parseCoverArt = (response) => {
  const images = response.data.images;
  return images
    .filter((image) => image.front && image.thumbnails["250"])
    .reduce((result, image) => {
      return result ? result : image.thumbnails["250"];
    }, null);
};

app.get("/", (req, res) => {
  res.render("index.ejs", { appData: appData });
});

app.post("/query", (req, res) => {
  appData.query = req.body.query;
  queryArtist(appData.query)
    .then((response) => {
      appData.artists = parseArtists(response);
      res.redirect("/");
      // res.render("index.ejs", { appData: appData });
    })
    .catch(handleError);
});

app.post("/disambiguate", (req, res) => {
  appData.artistId = req.body.artistId;
  getAlbums(appData.artistId)
    .then((response) => {
      appData.albums = parseAlbums(response);
      // res.render("index.ejs", { appData: appData });
      res.redirect("/");
    })
    .catch(handleError);
});

app.post("/album-selection", (req, res) => {
  appData.albumIds = Object.keys(req.body);
  const coverArtPromises = appData.albumIds.map((albumId) =>
    getCoverArt(albumId)
  );
  Promise.all(coverArtPromises)
    .then((responses) => {
      appData.coverArtUrls = responses.map((response) => {
        return parseCoverArt(response);
      });
      console.log(appData.coverArtUrls);
      // res.render("index.ejs", { appData: appData });
      res.redirect("/");
    })
    .catch(handleError);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
