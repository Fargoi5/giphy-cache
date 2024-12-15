import { fetchAllRecords } from '../utils.js'
import { GifsSearch } from "./gifsSearch.js";


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