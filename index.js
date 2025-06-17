import express from "express";

import getParseArtists from "./modules/get-parse-artists.js";
import getParseAlbums from "./modules/get-parse-albums.js";
import getParseCoverArt from "./modules/get-parse-cover-art.js";

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

    this.query = {
      input: {
        value: "",
        isDisabled: false,
      },
      submit: { isDisabled: false },
      isFailed: false
    };

    this.artists = [];
    this.albums = [];
    this.albumIds = [];
    this.coverArtUrls = [];
  }
}

const appData = new AppData();

//  Helper functions

const handleArtist = async ({ name, id }) => {
    appData.query.input.value = name;
    appData.query.input.isDisabled = true;
    appData.query.submit.isDisabled = true;
    appData.albums = await getParseAlbums(id);
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
  const query = req.body.query;
  appData.query.input.value = query;
  appData.artists = await getParseArtists(query);  
  const numArtists = appData.artists.length;
  appData.query.isFailed = numArtists === 0;
  if (numArtists === 1) {
    const artist = appData.artists[0];
    await handleArtist(artist);
  }
  res.redirect("/");
});

app.post("/disambiguate", async (req, res) => {
  const artistId = req.body.artistId;
  const artist = appData.artists.find(({ id }) => id === artistId);
  appData.artists = [artist];
  await handleArtist(artist);
  res.redirect("/");
});

app.post("/album-selection", (req, res) => {
  console.log(req.body);

  appData.albumIds = Object.keys(req.body);

  appData.albums.forEach((album) => {
    album.isChecked = appData.albumIds.indexOf(album.id) >= 0;
  });

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
