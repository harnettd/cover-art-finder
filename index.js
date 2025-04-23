import express from "express";
import axios from "axios";
import {
  musicBrainzApiBaseUrl,
  coverArtArchiveApiBaseUrl,
  accept,
  userAgent,
} from "./modules/settings.js";
import { getParseArtists } from "./modules/get-parse-artists.js"
import { getParseAlbums } from "./modules/get-parse-albums.js"
import { handleError } from "./modules/handle-error.js";

// const releaseType = "album|ep";
// const releaseStatus = "official";
// const releaseLimit = 100;
// const releaseGetDelay = 500;
// const countrySortOrder = ["XE", "US", "CA", "XW"];

// App and AppData

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
const port = 3000;

class AppData {
  constructor() {
    this.clear();
  }

  clear() {
    this.query = "";
    this.artists = [];
    this.artistId = "";
    this.artistName = "";
    this.albums = [];
    this.albumIds = [];
    this.coverArtUrls = [];
  }
}
const appData = new AppData();

const getCoverArt = (albumId) => {
  const url = `/release/${albumId}`;
  const baseURL = coverArtArchiveApiBaseUrl;
  const headers = {
    accept,
    "User-Agent": userAgent,
  };
  return axios.get(url, { baseURL, headers });
};

const parseCoverArt = ({ data: { images } }) => {
  return images.map((image) => image.thumbnails.large);
};

// Routes

app.get("/", (req, res) => {
  res.locals.appData = appData;
  res.render("index.ejs", res.locals);
});

app.get("/clear", (req, res) => {
  appData.clear();
  res.redirect("/");
});

app.post("/query", async (req, res) => {
  appData.query = req.body.query;
  appData.artists = await getParseArtists(appData.query);

  const numArtists = appData.artists.length;
  if (numArtists === 0) {
    // TODO: show error message
    console.log("Error: empty appData.artists");
  } else if (numArtists === 1) {
    const artist = appData.artists[0];
    appData.artistId = artist.id;
    appData.artistName = artist.name;
    appData.albums = await getParseAlbums(appData.artistId);
  }

  res.redirect("/");
});

app.post("/disambiguate", async (req, res) => {
  appData.artistId = req.body.artistId;
  appData.artistName = appData.artists.filter(
    (artist) => artist.id === appData.artistId
  )[0].name;

  appData.albums = await getParseAlbums(appData.artistId);
  res.redirect("/");
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
      res.redirect("/");
    })
    .catch(handleError);
});

// Listen

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
