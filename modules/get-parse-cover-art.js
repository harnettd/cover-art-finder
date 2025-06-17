import axios from "axios";

import { coverArtArchiveApiBaseUrl, accept, userAgent } from "./settings.js";
import { handleError } from "./handle-error.js";

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

const getParseCoverArt = async (albumId) => {
  let coverArtUrls = [];
  try {
    const response = await getCoverArt(albumId);
    coverArtUrls = parseCoverArt(response);
  } catch (error) {
    handleError(error);
  }
  return coverArtUrls;
};

export default getParseCoverArt;
