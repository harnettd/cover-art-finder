import axios from "axios";

import { musicBrainzApiBaseUrl, accept, userAgent } from "./settings.js";
import { handleError } from "./handle-error.js";

const minArtistScore = 75;

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

const getParseArtists = async (query) => {
  let artists = [];
  try {
    const response = await searchArtist(query);
    artists = parseArtists(response);
  } catch (error) {
    handleError(error);
  }
  return artists;
};

export { getParseArtists };
