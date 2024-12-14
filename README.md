## Giphy Cache API 

#### The purpose of this API is to enable search and selection of giphys
Core features:
1. Caching of giphy search results in HarperDB -> removes repeated requests and improves performance 
2. Caching of individual selected giphy records -> removes repeated requests and improves performance
3. Relevancy ranking is enabled by addition of a counter for read giphy records -> used to improve search results
4. Giphy Search sorted by relevancy ranking added -> lists gifs in order of popularity
###
##### SETUP
Create the .env file at the root of the project, based on the example.env
In the .env file, make sure to update the Giphy API Key and the database password

Install and run HarperDB  
https://docs.harperdb.io/docs/getting-started#installing-a-harperdb-instance

Install dependencies (from root of project) 
```
npm install
```

Run the application locally with
```
harperdb dev .
```

The tables are defined in schema.graphql 

GifSearchCache - Contains the search results of previous queries for efficient retrieval
GifCache - Contains any giphy that was individually called
GifCounter - Contains the count of read requests that were made for each Gif

### Searching for Gifs matching a Search Term
Custom endpoint `/GifsSearch` is defined in resources.js 
that allows search to an external resource to retrieve a list of gifs that match the search term.

REST API GET call to `/GifsSearch/{searchTerm}`:

![resources/GifSearch.png](resources/gifSearch.png)

### Adding Relevancy Ranking to Searching for Gifs matching a search term
Custom endpoint `/GifsSearchWithRelevancy` is defined in resources.js
that allows search to an external resource to retrieve a list of gifs that match the search term.
The results are ordered by relevancy. 
Relevancy is determined by ordering the Gifs by read access count.

REST API GET call to `/GifsSearchWithRelevancy/{searchTerm}`:

![resources/GifSearchWithRelevancy.png](resources/gifSearchWithRelevancy.png)

### Getting an individual Gif record
Users can pick a Gif from search results and select that record 
Custom endpoint `/GifById/{gif_id}` is defined in resources.js
The endpoint will return the Gif, from cache first, if it exists. 
If the Gif is not in cache, we call the external resource. 
We then add the record to the cache. 

REST API GET call to `/GifById/{gif_id}`:
![resources/gifById.png](resources/gifById.png)

### Gif Rankings
Rankings are available to view the most popular Gifs
Custom endpoint `/GifRankings` is defined in resources.js
GifRankings returns the Gif's that have been read in 
order of ranking.

REST API GET call to `/GifRankings`:
![resources/gifRankings.png](resources/gifRankings.png)




