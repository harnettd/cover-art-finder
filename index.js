import express from "express";

import { getParseArtists } from "./modules/get-parse-artists.js";
import { getParseAlbums } from "./modules/get-parse-albums.js";
import { getParseCoverArt } from "./modules/get-parse-cover-art.js";

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
    getParseCoverArt(albumId)
  );

  Promise.all(coverArtPromises).then((responses) => {
    appData.coverArtUrls = responses;
    res.redirect("/");
  });
});

// Listen

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
