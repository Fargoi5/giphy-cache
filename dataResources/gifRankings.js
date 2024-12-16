import { fetchAllRecords } from "../utils.js";
import { GifById } from "./gifById.js";

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
      }
    }

    try {

      const gifCountersResults = await fetchAllRecords('GifCounter');

      const orderedByCount = await Promise.all(
        gifCountersResults
          .sort((a, b) => b.counter - a.counter) // descending sort
          .map(async (gifCounter) => {
            const gifRecord = await getGifById(gifCounter.gif_id);
            const gifRanking = { ...gifCounter };
            if (gifRecord && gifRecord?.images?.downsized_medium?.url) {
              gifRanking.url = gifRecord.images.downsized_medium.url;
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
