import dotenv from 'dotenv';

dotenv.config();

export const getConfig = () => {

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

  return {
    GIPHY_API_KEY: process.env.GIPHY_API_KEY,
    GIPHY_SEARCH_URL_PATH: process.env.GIPHY_SEARCH_URL_PATH,
    GIPHY_GET_BY_ID_URL_PATH:process.env.GIPHY_GET_BY_ID_URL_PATH,
    GIPHY_SEARCH_LIMIT: process.env.GIPHY_SEARCH_LIMIT,
    HARPERDB_USERNAME: process.env.HARPERDB_USERNAME,
    HARPERDB_PASSWORD: process.env.HARPERDB_PASSWORD,
    HARPER_DB_URL : `${process.env.HARPERDB_PROTOCOL}://${process.env.HARPERDB_HOST}:${process.env.HARPERDB_PORT}`,
    AUTH_HEADER: 'Basic ' + Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString('base64')
  }
}

export const fetchAllRecords = async (tableName, getAttributes = []) => {
  const query = getAttributes.length > 0
    ? `SELECT ${getAttributes.join(", ")}
       FROM data.${tableName}`
    : `SELECT * FROM data.${tableName}`;

  const body = {
    operation: "sql",
    sql: query,
  };

  return postToDatabase(`POST SQL Query ${query}`, body);

};

export const cacheSearchResult = async (tableName, searchTerm, cacheValue) => {
  const requestBody = {
    operation: 'insert',
    table: tableName,
    records: [{
      searchTerm,
      cacheValue,
    }]
  };

  await postToDatabase(`adding cache for ${searchTerm}`, requestBody);
};

export const postToDatabase = async (description, requestBody) => {

  const config = getConfig();

  try {
    const response = await fetch(config.HARPER_DB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.AUTH_HEADER,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HarperDB error: ${response.statusText}`);
    }

    logger.info(`POST Success for ${description}`);
    return response.json();
  } catch (error) {
    logger.error(`Error on ${description}`, error);
    throw new Error(`Failed ${description}: ${error.message}`);
  }
}

export const getCacheResult = async (tableName, searchTerm, getAttributes = ["*"], limit= 20, offset = 0) => {

  logger.info(`Get Cache Result called for ${searchTerm} on ${tableName}`);

  const body = {
    operation: "search_by_value",
    schema: "data",
    table: tableName,
    search_attribute: 'searchTerm',
    search_value: searchTerm,
    get_attributes: getAttributes,
    limit: 20,
    offset: 0,
    onlyIfCached: false,
    noCacheStore: false
  }

  return postToDatabase(`Finding cache results for searchTerm ${searchTerm}`, body);
}
