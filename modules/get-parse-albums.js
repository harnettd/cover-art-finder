import axios from "axios";

import { musicBrainzApiBaseUrl, accept, userAgent } from "./settings.js";
import { handleError } from "./handle-error.js";

const releaseType = "album|ep";
const releaseStatus = "official";
const releaseLimit = 100;
const releaseGetDelay = 500;
const countrySortOrder = ["XE", "US", "CA", "XW"];

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
    .map(({ id, title, country, date }) => (
      { id, title, country, date, isChecked: false }
    ))
    .reduce(deduplicate, [])
    .sort((album1, album2) => album1.date < album2.date);

const getParseAlbums = async (artistId) => {
  let parsedAlbums = [];
  try {
    const albums = await getAlbums(artistId);
    parsedAlbums = parseAlbums(albums);
  } catch (error) {
    handleError(error);
  }
  return parsedAlbums;
};

export default getParseAlbums;
