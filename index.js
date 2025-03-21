import express from "express";
import axios from "axios";

const musicBrainzApiBaseUrl = "https://musicbrainz.org/ws/2";
const coverArtArchiveApiBaseUrl = "https://coverartarchive.org";
const accept = "application/json";
const userAgent = "cover-art-finder/1.0.0 (DHarnett.dev@proton.me)";
const minArtistScore = 75;
const releaseType = "album|ep";
const releaseStatus = "official";
const releaseLimit = 100;
const releaseGetDelay = 500;
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

const parseArtists = ({ data: { artists }, status }) => {
  const parsedArtists = artists.map((artist) => {
    const { id, name, score, country, disambiguation } = artist;
    return { id, name, score, country, disambiguation };
  });
  return parsedArtists.filter((artist) => artist.score >= minArtistScore);
};

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

  let rawAlbums = [];

  const getAlbumsBatch = (offset = 0) => {
    params.offset = offset;

    // console.log(params);

    return axios.get(url, { baseURL, params, headers })
    .then(({ data }) => {
      console.log(`Offset : ${data["release-offset"]}`);
      console.log(`Release count: ${data["release-count"]}`);
      console.log(`No. releases: ${data.releases.length}\n`);

      const releases = data.releases;
      rawAlbums = rawAlbums.concat(releases);
      const newOffset = offset + releases.length;

      if (newOffset >= data["release-count"]) {
        return rawAlbums;
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(getAlbumsBatch(newOffset)), releaseGetDelay);
      });
    });
  };

  return getAlbumsBatch();
};

const parseAlbums = (rawAlbums) => {
  return rawAlbums
    .map((rawAlbum) => {
      return {
        id: rawAlbum.id,
        title: rawAlbum.title,
        disambiguation: rawAlbum.disambiguation,
        frontCover: rawAlbum["cover-art-archive"].front,
      };
    })
    .filter((rawAlbum) => rawAlbum.frontCover);
};

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
  return images
    .filter((image) => image.front && image.thumbnails["250"])
    .reduce((result, image) => {
      return result ? result : image.thumbnails["250"];
    }, null);
};

app.get("/", (req, res) => {
  res.locals.appData = appData;
  res.render("index.ejs", { appData: res.locals.appData });
});

app.post("/query", (req, res) => {
  appData.query = req.body.query;
  searchArtist(appData.query)
    .then((response) => {
      appData.artists = parseArtists(response);
      res.redirect("/");
    })
    .catch(handleError);
});

app.post("/disambiguate", (req, res) => {
  appData.artistId = req.body.artistId;
  getAlbums(appData.artistId)
    .then((response) => {
      console.log("Resolved!");

      appData.albums = parseAlbums(response);
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
      res.redirect("/");
    })
    .catch(handleError);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
