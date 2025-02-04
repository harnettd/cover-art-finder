import express from "express";
import axios from "axios";

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const musicBrainzApiUrl = "https://musicbrainz.org/ws/2";
const coverArtArchiveApiUrl = "https://coverartarchive.org";

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
  //   console.log(error.config);
};

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
    limit: 100
  };
  const headers = {
    Accept: "application/json",
    "User-Agent": "cover-art-finder/1.0.0 (DHarnett.dev@proton.me)",
  };

  //   console.log(url);
  //   console.log(params);
  //   console.log(headers);

  return axios.get(url, { params: params, headers: headers });
};

const parseAlbums = (result) => {
  const albums = [];
//   console.log(result.data.releases);
  result.data.releases.forEach((album) => {
    const nextAlbum = {
      id: album.id,
      title: album.title,
      status: album.status,
      disambiguation: album.disambiguation,
      frontCover: album['cover-art-archive'].front
    };
    albums.push(nextAlbum);
  });
  console.log(albums);
  return albums;
};

const getCoverArtUrl = (albumId) => {
    const url = `${coverArtArchiveApiUrl}/release/${albumId}/front-250`
    const params = {}
    const headers = {Accept: 'application/json'}
    return axios(url , { params: params, headers: headers})
}

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
      handleError(error);
    });
});

app.post("/disambiguate", (req, res) => {
  const artistId = req.body.artistId;
  //   console.log(artistId);
  getAlbums(artistId)
    .then((result) => {
      const albums = parseAlbums(result);
      //   console.log("Albums:");
      //   console.log(albums)
        res.render("index.ejs", { albums: albums });
    })
    .catch((error) => {
      handleError(error);
    });
});

app.post("/album-selection", (req, res) => {
  const albumIds = Object.keys(req.body);
  console.log(albumIds);
  // Promise.all(albumIds.forEach((albumId) => {
  //   getCoverArtUrl(albumId)
  // }))
  getCoverArtUrl(albumIds[0])
    .then((coverArtUrls) => {
      console.log(coverArtUrls)
      // res.render(indexed.ejs, { coverArtUrls: coverArtUrls })
    })
    .catch(handleError)
});

const port = 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
