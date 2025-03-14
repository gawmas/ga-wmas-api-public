import pkg from 'pg-promise';
import fs from 'fs';
import https from 'https';

/**
 * Returns scraped hunts from the output file. `page` query parameter is used to paginate the results.
 * @returns {Function} 
 */
const scrapedHuntsFn = () => async (req, res) => {
  const page = req.query.page;
  const skip = page * 20;

  try {
    const huntsJson = fs.readFileSync('tasks/output/2024.json');
    const hunts = JSON.parse(huntsJson);
    res.status(200).json(hunts.slice(skip, skip + 20));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error reading scraped hunts'
    });
  }

};

const addHuntFn = (db) => async (req, res) => { };

const testWeatherStackFn = () => async (req, res) => {
  const url = `${process.env.WEATHERSTACK_API}?access_key=${process.env.WEATHERSTACK_API_KEY}&units=f&&query=New York,New York,USA&historical_date_start=2024-09-14&historical_date_end=2024-10-11`;
  try {
    const data = await fetchWeatherData(url);
    console.log(data);
    res.status(200).json(JSON.parse(data));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching weather data'
    });
  }
};

const fetchWeatherData = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
}

export { scrapedHuntsFn, addHuntFn, testWeatherStackFn };