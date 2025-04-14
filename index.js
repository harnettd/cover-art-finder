import express from "express";
import axios from "axios";

// Global variables

const musicBrainzApiBaseUrl = "https://musicbrainz.org/ws/2";
const coverArtArchiveApiBaseUrl = "https://coverartarchive.org";
const accept = "application/json";
const userAgent = "cover-art-finder/1.0.0 (DHarnett.dev@proton.me)";
const minArtistScore = 75;
const releaseType = "album|ep";
const releaseStatus = "official";
const releaseLimit = 100;
const releaseGetDelay = 500;
const countrySortOrder = ["XE", "US", "CA", "XW"];
const port = 3000;

// App and AppData

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

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

// Helper functions

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

const searchArtist = (query) => {
  const url = "/artist";
  const baseURL = musicBrainzApiBaseUrl;
  const params = { query };
  const headers = {
    accept,
    "User-Agent": userAgent,
  };
  return axios.get(url, { baseURL, params, headers });
};

const parseArtists = ({ data: { artists } }) =>
  artists
    .filter(({ score }) => score >= minArtistScore)
    .map(({ id, name, score, country, disambiguation }) => ({
      id,
      name,
      score,
      country,
      disambiguation,
    }));

const getAlbums = (artistId) => {
  const url = "/release";
  const baseURL = musicBrainzApiBaseUrl;
  const params = {
    artist: artistId,
    type: releaseType,
    status: releaseStatus,
    limit: releaseLimit,
  };
  const headers = {
    accept,
    "User-Agent": userAgent,
  };

  let albums = [];

  const getAlbumsBatch = (offset = 0) => {
    params.offset = offset;

    return axios.get(url, { baseURL, params, headers }).then(({ data }) => {
      const releases = data.releases;
      albums = albums.concat(releases);
      const newOffset = offset + releases.length;

      if (newOffset >= data["release-count"]) {
        return albums;
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(getAlbumsBatch(newOffset)), releaseGetDelay);
      });
    });
  };

  return getAlbumsBatch();
};

const isSameTitle = (album, candidate) =>
  album.title.toLowerCase() === candidate.title.toLowerCase();

const isPreferredCountry = (album, candidate) => {
  // Return true if the album country is lower than the candidate country 
  // on the country sort order; false otherwise.
  return (
    countrySortOrder.indexOf(album.country) <
    countrySortOrder.indexOf(candidate.country)
  );
};

const getPreferred = (album, candidate) =>
  isPreferredCountry(album, candidate) ? candidate : album;

const deduplicate = (reducedAlbums, candidate) => {
  const idxDuplicate = reducedAlbums
    .map((a) => isSameTitle(a, candidate))
    .indexOf(true);

  // candidate is not a duplicate
  if (idxDuplicate === -1) {
    return reducedAlbums.concat([candidate]);
  }

  // candidate is a duplicate
  const duplicate = reducedAlbums[idxDuplicate];
  return reducedAlbums
    .filter((val, idx) => idx !== idxDuplicate)
    .concat([getPreferred(duplicate, candidate)]);
};

const parseAlbums = (albums) =>
  albums
    .filter((album) => album["cover-art-archive"].front)
    .map(({ id, title, country, date }) => ({ id, title, country, date }))
    .reduce(deduplicate, [])
    .sort((album1, album2) => album1.date < album2.date);

const getCoverArt = (albumId) => {
  const url = `/release/${albumId}`;
  const baseURL = coverArtArchiveApiBaseUrl;
  const headers = {
    accept,
    "User-Agent": userAgent,
  };
  return axios(url, { baseURL, headers });
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

app.post("/query", (req, res) => {
  appData.query = req.body.query;
  searchArtist(appData.query)
    .then((response) => {
      appData.artists = parseArtists(response);
      const numArtists = appData.artists.length;
      if (numArtists === 0) {
        // error
        console.log("Error");
      } else if (appData.artists.length === 1) {
        appData.artistId = appData.artists[0].id;
        appData.artistName = appData.artists[0].name;
        getAlbums(appData.artistId)
          .then((albums) => {
            appData.albums = parseAlbums(albums);
            res.redirect("/");
          })
          .catch(handleError);
      } else {
        res.redirect("/");
      }
    })
    .catch(handleError);
});

app.post("/disambiguate", (req, res) => {
  appData.artistId = req.body.artistId;
  appData.artistName = appData.artists.filter(
    (artist) => artist.id === appData.artistId
  )[0].name;
  getAlbums(appData.artistId)
    .then((albums) => {
      appData.albums = parseAlbums(albums);
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
      // console.log(appData.coverArtUrls);
      res.redirect("/");
    })
    .catch(handleError);
});

// Listen

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
