import dotenv from 'dotenv';

dotenv.config();

const HARPERDB_USERNAME = process.env.HARPERDB_USERNAME;
const HARPERDB_PASSWORD = process.env.HARPERDB_PASSWORD;

if (!HARPERDB_USERNAME || !HARPERDB_PASSWORD) {
  throw new Error('Missing database environment variables.');
}

const harperDbUrl = `${process.env.HARPERDB_PROTOCOL}://${process.env.HARPERDB_HOST}:${process.env.HARPERDB_PORT}`
const authHeader = 'Basic ' + Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString('base64');

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

  // const response = await fetch(harperDbUrl, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: authHeader,
  //   },
  //   body: JSON.stringify(body),
  // });
  //
  // if (!response.ok) {
  //   throw new Error(`Error fetching all records from ${tableName}: ${response.statusText}`);
  // }
  //
  // return response.json();
};

export const cacheSearchResult = async (tableName, searchTerm, gifs) => {
  const requestBody = {
    operation: 'insert',
    table: tableName,
    records: [{
      searchTerm,
      gifs,
    }]
  };

  await postToDatabase(`adding cache for ${searchTerm}`, requestBody);
};

export const postToDatabase = async (description, requestBody) => {

  try {
    const response = await fetch(harperDbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
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
