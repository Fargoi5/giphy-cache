## Giphy Cache API 

#### The purpose of this API is to enable search and selection of giphys
Core features:
1. Caching of giphy search results in HarperDb -> removes repeated requests and improves performance 
2. Caching of individual selected giphy records -> removes repeated requests and improves performance
3. Relevancy ranking is enabled by addition of a counter for selected giphy records -> can be used to improve search results
4. Giphy Search sorted by relevancy ranking added -> lists gifs in order of popularity

Run the application locally with
```
harperdb dev .
```

The tables are defined in schema.graphql 

GifSearchCache - Contains the search results of previous queries for efficient retrieval
GifCache - Contains any giphy that was individually called
GifCounter - Records contain the count of how many times the Gif was selected

### Searching for Gifs matching a Search Term
There is a custom endpoint `/GifsSearch` defined in resources.js 
that allows search to an external resource to retrieve a list of gifs that match the search term.

REST API call to `/GifsSearch/{searchTerm}`:

![resources/GifSearch.png](resources/gifSearch.png)

