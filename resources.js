import {fetchAllRecords, cacheSearchResult, getCacheResult, postToDatabase} from './utils.js'

import dotenv from 'dotenv';

dotenv.config();

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_SEARCH_URL_PATH = process.env.GIPHY_SEARCH_URL_PATH;
const GIPHY_GET_BY_ID_URL_PATH = process.env.GIPHY_GET_BY_ID_URL_PATH;
const GIPHY_SEARCH_LIMIT = process.env.GIPHY_SEARCH_LIMIT;
const HARPERDB_USERNAME = process.env.HARPERDB_USERNAME;
const HARPERDB_PASSWORD = process.env.HARPERDB_PASSWORD;

if (!GIPHY_API_KEY || !GIPHY_SEARCH_URL_PATH || !GIPHY_GET_BY_ID_URL_PATH || !GIPHY_SEARCH_LIMIT) {
  throw new Error('Missing required environment variables.');
}

if (!HARPERDB_USERNAME || !HARPERDB_PASSWORD) {
  throw new Error('Missing database environment variables.');
}

const harperDbUrl = `${process.env.HARPERDB_PROTOCOL}://${process.env.HARPERDB_HOST}:${process.env.HARPERDB_PORT}`
const authHeader = 'Basic ' + Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString('base64');

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

    if (cacheResponse && cacheResponse.length > 0 && cacheResponse[0].gifs && cacheResponse[0].gifs.length > 0) {
      logger.info(`Found cache results for ${query.url}, returning ${cacheResponse[0].gifs.length} cached gifs`);
      return cacheResponse[0].gifs;
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
        url: record.url,
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

/**
 * Class for extending 'fetching Gifs by query' to include relevancy
 * Example: http://localhost:9926/GifsSearch/dog
 * pattern: /GifsSearchWithRelevancy/searchTerm
 * searchTerm: The search expression used to find gifs
 *
 * Returns List of Gifs sorted with relevancy (based on read count)
 */
export class GifsSearchWithRelevancy extends GifsSearch {
  async get(query) {

    // Fetch the gifs using GifsSearch base implementation
    const gifs = await super.get(query);

    if (!gifs) {
      logger.info("No Gifs returned for relevancy processing");
      return;
    }

    const { order } = query;

    const gifCounters = await fetchAllRecords('GifCounter');

    // Merge counters into the gif data
    const gifsWithCounters = gifs.map(gif => {
      const matchingGifCounter = gifCounters.find(gifCounter => gifCounter.gif_id === gif.id);
      return {
        ...gif,
        counter: matchingGifCounter ? matchingGifCounter.counter : 0 // Return counter if found, else default to 0
      };
    });

    // Sort based on the counter field
    gifsWithCounters.sort((a, b) => {
      return b.counter - a.counter;
    });

    return gifsWithCounters;
  }
}

/**
 * Class for fetching a single Gif by ID
 * Example: http://localhost:9926/GifById/AcfTF7tyikWyroP0x7
 * pattern: /GifById/${id}
 * id: the id of the giphy record
 *
 * Returns: Gif record
 */
export class GifById extends Resource {

  constructor(id = null, external = true) {
    super();
    this.id = id;
    this.external = external;
  }
  async get() {

    const gifId = this.id;

    if (!gifId) {
      throw new Error('Gif ID is required to fetch a Gif');
    }

    logger.info(`Received Request to get Gif by id: ${gifId}`);

    const giphyGetUrl = `https://${GIPHY_GET_BY_ID_URL_PATH}${gifId}?api_key=${GIPHY_API_KEY}`;

    try {
      const response = await fetch(giphyGetUrl);

      if (!response.ok) {
        throw new Error(`GifByID Giphy API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (this.external) {
        logger.info("Internal Request");
        await this.incrementGifCounter(gifId);
      } else {
        logger.info("External Request");
      }

      return data.data || null;
    } catch (error) {
      logger.error('Error fetching Gif by ID:', error);
      throw new Error(`Failed to fetch Gif: ${error.message}`);
    }
  }

  async getGifCounter(gifId) {
    const fetchRecords = async (tableName, searchAttribute, searchValue, getAttributes = []) => {

      const body = {
        operation: "search_by_value",
        schema: "data",
        table: tableName,
        search_attribute: searchAttribute,
        search_value: searchValue,
        get_attributes: getAttributes,
        limit: 20,
        offset: 0,
        onlyIfCached: false,
        noCacheStore: false
      }

      logger.info(`Fetching all records in table ${tableName} with value ${searchValue} on ${searchAttribute}`);

      const response = await fetch(harperDbUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Error fetching data from ${tableName}: ${response.statusText}`);
      }

      const json = await response.json();

      let record = {};
      if (json.length > 0) {
        record = json[0];
        logger.info(`Found record with gif_id: ${record.gif_id} and id: ${record.id}`)
      }

      return record;
    };

    return await fetchRecords('GifCounter', 'gif_id', gifId, ["*"])
  }

  /**
   * Increments the GifCounter record for the provided gifId
   * Uses upsert, so will update/create the record
   * @param gifId
   * @returns {Promise<void>}
   */
  async incrementGifCounter(gifId) {

    const gifCounter = await this.getGifCounter(gifId);

    const currentCount = gifCounter.counter ? gifCounter.counter : 0;

    const newCount = currentCount + 1;

    const requestBody = {
      operation: 'upsert',
      table: 'GifCounter',
      records: [{
        gif_id: gifId,
        timestamp: new Date().toISOString(),
        counter: newCount
      }],
    };

    // Set the id for upsert if the record exists
    if (gifCounter !== {}) {
      requestBody.records[0].id = gifCounter.id;
    }

    await postToDatabase(`incremented counter for Gif ID: ${gifId} to ${newCount}`, requestBody)

  }
}

/**
 * GifRankings returns the Gif Rankings
 *  - ordered from most read to least read.
 */
export class GifRankings extends Resource {
  async get(_context) {

    logger.info('Request Received for GifRankings');

    const getGifById = async (gifId) => {
      const gifByIdResource = new GifById(gifId, false);

      logger.debug(`Requesting to get Gif by ID ${gifId}`);

      try {
        return gifByIdResource.get();
      } catch (error) {
        logger.error('Error in calling to get Gif By ID:', error);
        throw new Error(`Failed to fetch Gif by ID: ${error.message}`);
      }
    }

    try {

      const gifCountersResults = await fetchAllRecords('GifCounter');

      logger.info('gifCountersResults: ', gifCountersResults);

      const orderedByCount = await Promise.all(
        gifCountersResults
          .sort((a, b) => b.counter - a.counter) // descending sort
          .map(async (gifCounter) => {
            const gifRecord = await getGifById(gifCounter.gif_id);
            const gifRanking = { ...gifCounter };
            if (gifRecord && gifRecord.url) {
              gifRanking.url = gifRecord.url;
            }
            return gifRanking;
          })
      );

      // add ranking to ordered records
      let rank = 1;
      return orderedByCount.map(gifCounter => {
        gifCounter.rank = rank;
        rank++;
        return gifCounter;
      });

    } catch (error) {
      logger.error('Error in GifRanking:', error);
      throw new Error(`GifRanking failed: ${error.message}`);
    }
  }
}

// Register the sources with expiration
const { GifSearchCache, GifCache } = tables;
// Caching Searches, keeps the table query result in memory (for 6 minutes)
GifSearchCache.sourcedFrom(GifsSearch, { expiration: 360000 });

// Caching Search by ID Queries
GifCache.sourcedFrom(GifById, { expiration: 360000 });
