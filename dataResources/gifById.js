import { postToDatabase, getConfig } from '../utils.js'

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

    const config = getConfig();

    const gifId = this.id;

    if (!gifId) {
      throw new Error('Gif ID is required to fetch a Gif');
    }

    logger.info(`Received Request to get Gif by id: ${gifId}`);

    const giphyGetUrl = `https://${config.GIPHY_GET_BY_ID_URL_PATH}${gifId}?api_key=${config.GIPHY_API_KEY}`;

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
    const config = getConfig();
    const fetchRecords = async (tableName, searchAttribute, searchValue, getAttributes = []) => {
      const config = getConfig();

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

      const response = await fetch(config.HARPER_DB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: config.AUTH_HEADER,
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