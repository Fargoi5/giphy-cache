import { cacheSearchResult, getCacheResult } from '../utils.js'

import dotenv from 'dotenv';

dotenv.config();

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_SEARCH_URL_PATH = process.env.GIPHY_SEARCH_URL_PATH;
const GIPHY_SEARCH_LIMIT = process.env.GIPHY_SEARCH_LIMIT;

/**
 * Class for fetching Gifs by query
 * Example: http://localhost:9926/GifsSearch/dog
 * pattern: /GifsSearch/searchTerm
 * searchTerm: The search expression used to find giphy's
 */
export class GifsSearch extends Resource {

  async get(query) {
    if (!query.url) {
      throw new Error('Search query param required for finding Gifs');
    }

    const cacheResponse = await getCacheResult('GifSearchCache', query.url);

    if (cacheResponse && cacheResponse.length > 0 && cacheResponse[0].cacheValue && cacheResponse[0].cacheValue.length > 0) {
      logger.info(`Found cache results for ${query.url}, returning ${cacheResponse[0].cacheValue.length} cached gifs`);
      return cacheResponse[0].cacheValue;
    }

    logger.info("No cached gifs found, calling external datasource");

    const giphySearchUrl = `https://${GIPHY_SEARCH_URL_PATH}?q=${query.url}&api_key=${GIPHY_API_KEY}&limit=${GIPHY_SEARCH_LIMIT}`;

    try {
      const response = await fetch(giphySearchUrl);

      if (!response.ok) {
        throw new Error(`GifsSearch Giphy API error: ${response.statusText}`);
      }

      const json = await response.json();

      // Picking only relevant fields to reduce response size
      const gifsArr = json.data.map(record => ({
        id: record.id,
        url: record.images.downsized_medium.url,
        title: record.title
      }));

      await cacheSearchResult('GifSearchCache', query.url, gifsArr);

      return gifsArr || [];

    } catch (error) {
      logger.error('Error fetching Giphy data:', error);
      throw new Error(`Failed to fetch Giphy data: ${error.message}`);
    }
  }
}
