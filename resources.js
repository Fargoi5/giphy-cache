import { GifsSearch } from "./dataResources/gifsSearch.js";
import { GifById } from './dataResources/gifById.js';

// export data resources
export { GifsSearch } from './dataResources/gifsSearch.js';
export { GifsSearchWithRelevancy } from './dataResources/gifsSearchWithRelevancy.js';
export { GifById } from './dataResources/gifById.js';
export { GifRankings } from './dataResources/gifRankings.js';

// export resources
// Register the sources with expiration
const { GifSearchCache, GifCache } = tables;
// Caching Searches, keeps the table query result in memory (for 6 minutes)
GifSearchCache.sourcedFrom(GifsSearch, { expiration: 360000 });

// Caching Search by ID Queries
GifCache.sourcedFrom(GifById, { expiration: 360000 });
