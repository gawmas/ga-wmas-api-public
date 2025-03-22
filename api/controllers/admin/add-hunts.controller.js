import pkg from 'pg-promise';
import fs from 'fs';
import https from 'https';

/**
 * Returns scraped hunts from the output file. `page` query parameter is used to paginate the results.
 * @returns {Function} 
 */
const scrapedHuntsFn = () => async (req, res) => {

  try {
    const huntsJson = fs.readFileSync('tasks/output/2024.json');
    const data = JSON.parse(huntsJson);
    const total = data.length;
    const hunts = data.slice(250, 255);
    const results = {
      total,
      data: hunts
    }
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error reading scraped hunts'
    });
  }

};

const addHuntsFn = (db) => async (req, res) => {
  const seasonId = req.body.seasonId;
  const hunts = req.body.hunts;

  try {

    await db.tx(async (t) => {
      let newHuntIds = [];
      let weatherUrls = [];

      for (const hunt of hunts) {
        const huntInsertQuery = `INSERT INTO public.hunts (
          wma_id, details, weapon_id, season_id,
          is_bonus, is_buck_only, is_qual_buck, is_either_sex,
          hunter_count, does, bucks, quota
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`;

        const huntResult = await t.one(huntInsertQuery, [
          hunt.wma,
          "TEST8",
          hunt.weapon,
          seasonId,
          hunt.bonus,
          hunt.buckonly,
          hunt.qualitybuck,
          hunt.eithersex,
          hunt.hunters,
          hunt.does,
          hunt.bucks,
          hunt.quota === "" ? null : hunt.quota
        ]);

        await t.none('INSERT INTO public.hunt_season_dates (hunt_id, start_date, end_date) VALUES ($1, $2, $3)',
          [+huntResult.id, hunt.start, hunt.end]);

        newHuntIds.push(huntResult.id);
      }

      if (newHuntIds.length === 0) {
        throw new Error("No hunts were inserted.");
      }

      const huntIdsQuery = 'SELECT id, wma_name, hunt_dates, location FROM public.vw_hunts WHERE id = ANY($1::int[])';
      const huntsData = await t.manyOrNone(huntIdsQuery, [newHuntIds]);

      for (const hunt of huntsData) {
        const huntDates = hunt.huntDates;

        for (const d of huntDates) {
          const huntLength = calculateDaysBetweenDates(d.start, d.end);

          if (huntLength > 30) { // Create multiple urls since the api doesn't support more than a 30-day range ...
            weatherUrls.push([
              ...divideDateRange(d.start, d.end)
                .map(dateRange => buildWeatherUrl(
                  dateRange.substring(0, dateRange.indexOf('--')),
                  dateRange.substring(dateRange.indexOf('--') + 2),
                  'summary', hunt.location))
            ]);
          } else {
            weatherUrls.push([
              buildWeatherUrl(d.start, d.end,
                huntLength < 30 && huntLength > 5 ? 'summary' : 'detailed',
                hunt.location)
            ]);
          }
        }
      }

      for (const [index, url] of weatherUrls.entries()) {

        if (url[0].indexOf('interval') > -1) { // Detailed ...
          console.log('*** 🌦️ Fetching detailed weather data 🌦️ ***', url);
          try {

            const weatherDataReq = await fetchWeatherData(url[0]);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid rate limiting ...
            const weatherData = JSON.parse(weatherDataReq);
  
            delete weatherData.request;
            delete weatherData.current;
  
            // Get location ...
            const f_location = (weatherData.location && weatherData.location.name) ? weatherData.location.name : 'Unspecified';
            // Create an array of history objects ...
            const history = Object.keys(weatherData.historical).map((date) => ({
              date, ...weatherData.historical[date]
            }));
  
            for (const h of history) {
  
              const f_hunt_date = h.date;
  
              // Create an array of all hourly entries ...
              const hourlies = h.hourly.map((hour) => ({ ...hour }));
              // Get item for hour nearest sunrise (roughly 1 hour after sunrise) ...
              const amPrimeConds = hourlies.filter((hour) => hour.time === calcDayPrimetimes(h.astro.sunrise));
  
              const {
                time: f_am_time,
                precip: f_am_precip,
                pressure: f_am_pressure,
                cloudcover: f_am_cloudCover,
                heatindex: f_am_heatIndex,
                dewpoint: f_am_dewpoint,
                windchill: f_am_windChill,
                windgust: f_am_windGust,
                feelslike: f_am_feelsLike,
                weather_descriptions: [f_am_description],
                wind_dir: f_am_windDirection,
                temperature: f_am_temp,
                visibility: f_am_viz,
                weather_icons: [f_am_icon],
                wind_speed: f_am_windSpeed,
              } = amPrimeConds[0];
  
              // Get item for hour nearest sunset (roughly 1 hour before sunset) ...
              const pmPrimeConds = hourlies.filter((hour) => hour.time === calcDayPrimetimes(h.astro.sunset));
  
              const {
                time: f_pm_time,
                precip: f_pm_precip,
                pressure: f_pm_pressure,
                cloudcover: f_pm_cloudCover,
                heatindex: f_pm_heatIndex,
                dewpoint: f_pm_dewpoint,
                windchill: f_pm_windChill,
                windgust: f_pm_windGust,
                feelslike: f_pm_feelsLike,
                weather_descriptions: [f_pm_description],
                wind_dir: f_pm_windDirection,
                temperature: f_pm_temp,
                visibility: f_pm_viz,
                weather_icons: [f_pm_icon],
                wind_speed: f_pm_windSpeed,
              } = pmPrimeConds[0];
  
              const middayIcon = hourlies.find((hour) => hour.time === '1200').weather_icons[0];
              const middayDescr = hourlies.find((hour) => hour.time === '1200').weather_descriptions[0];
  
              console.log('*** ⚡️ Proc call ... ⚡️ ***', 
                newHuntIds[index],
                String(h.astro.sunset),
                String(h.astro.sunset),
                String(h.astro.moonrise),
                String(h.astro.moonset),
                String(h.astro.moon_phase),
                +h.astro.moon_illumination,
                String(f_location),
                +h.mintemp,
                +h.maxtemp,
                String(f_am_time),
                +f_am_temp,
                String(f_am_windDirection),
                +f_am_precip,
                +f_am_viz,
                +f_am_pressure,
                +f_am_cloudCover,
                +f_am_heatIndex,
                +f_am_dewpoint,
                +f_am_windChill,
                +f_am_windGust,
                +f_am_feelsLike,
                String(f_am_description),
                String(f_am_icon),
                String(f_pm_time),
                +f_pm_temp,
                String(f_pm_windDirection),
                +f_pm_precip,
                +f_pm_viz,
                +f_pm_pressure,
                +f_pm_cloudCover,
                +f_pm_heatIndex,
                +f_pm_dewpoint,
                +f_pm_windChill,
                +f_pm_windGust,
                +f_pm_feelsLike,
                String(f_pm_description),
                String(f_pm_icon),
                String(f_hunt_date),
                String(middayIcon),
                String(middayDescr),
                +f_am_windSpeed,
                +f_pm_windSpeed);

              await db.proc('public.proc_process_detailed_hunt', [
                newHuntIds[index],
                String(h.astro.sunset),
                String(h.astro.sunset),
                String(h.astro.moonrise),
                String(h.astro.moonset),
                String(h.astro.moon_phase),
                +h.astro.moon_illumination,
                String(f_location),
                +h.mintemp,
                +h.maxtemp,
                String(f_am_time),
                +f_am_temp,
                String(f_am_windDirection),
                +f_am_precip,
                +f_am_viz,
                +f_am_pressure,
                +f_am_cloudCover,
                +f_am_heatIndex,
                +f_am_dewpoint,
                +f_am_windChill,
                +f_am_windGust,
                +f_am_feelsLike,
                String(f_am_description),
                String(f_am_icon),
                String(f_pm_time),
                +f_pm_temp,
                String(f_pm_windDirection),
                +f_pm_precip,
                +f_pm_viz,
                +f_pm_pressure,
                +f_pm_cloudCover,
                +f_pm_heatIndex,
                +f_pm_dewpoint,
                +f_pm_windChill,
                +f_pm_windGust,
                +f_pm_feelsLike,
                String(f_pm_description),
                String(f_pm_icon),
                String(f_hunt_date),
                String(middayIcon),
                String(middayDescr),
                +f_am_windSpeed,
                +f_pm_windSpeed
              ]);
              
            }
          } catch (error) {
            console.error('*** 💩 Error fetching detailed weather data 💩 ***\n\n', error);
          }

        } else { // Summary ...

          let huntHistoricalData = [];

          try {

            // Make a fetch for each url and combine the results into an array ...
            for (const u of url) {
              const weatherDataReq = await fetchWeatherData(u);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid rate limiting ...
              const weatherData = JSON.parse(weatherDataReq);
              huntHistoricalData.push(weatherData);
            }
  
            // Combine all the "historical" days data into a single array ...
            const daysData = huntHistoricalData.reduce((result, currentObj) => {
              result.location = currentObj.location;
  
              if (!result.historical) {
                result.historical = [];
              }
  
              for (const d in currentObj.historical) {
                if (currentObj.historical.hasOwnProperty(d)) {
                  result.historical.push({
                    date: d,
                    huntId: newHuntIds[index],
                    location: result.location.name,
                    low: currentObj.historical[d].mintemp,
                    high: currentObj.historical[d].maxtemp,
                    sunhours: currentObj.historical[d].sunhour,
                    uvindex: currentObj.historical[d].uv_index,
                    astro: currentObj.historical[d].astro
                  });
                }
              }
              return result;
            }, {});
  
            daysData.historical.forEach(async (entry) => {
              await db.none(
                'INSERT INTO public.hunt_wx_summary_days (location, low, high, hunt_id, histdate, uvindex, sunhours, astro) ' +
                'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [entry.location, entry.low, entry.high, entry.huntId, entry.date, entry.uvindex, entry.sunhours, entry.astro]
              );
            });
          } catch (error) {
            console.error('*** 💩 Error fetching summary weather data 💩 ***\n\n', error);
          }

        }

      }

      res.status(200).json({
        status: 'success',
        newHuntIds,
        weatherUrls
      });

    }); // End transaction

  } catch (error) {
    console.error('*** 💩 Error in DB transaction 💩 ***\n\n', error);
    res.status(500).json({
      status: 'error',
      message: 'Something 💩 the 🛌 in this operation!',
      details: error.message
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

const calculateDaysBetweenDates = (startDate, endDate) => {
  const oneDay = 24 * 60 * 60 * 1000; // Number of milliseconds in a day
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate the difference in days
  const diffDays = Math.round(Math.abs((start - end) / oneDay)) + 1;

  return diffDays;
}

const divideDateRange = (startDate, endDate) => {
  const oneDay = 24 * 60 * 60 * 1000; // Number of milliseconds in a day
  const start = new Date(startDate + 'T00:00:00'); // Include time component
  const end = new Date(endDate);

  // Calculate the difference in days
  const diffDays = Math.round(Math.abs((start - end) / oneDay));

  // Calculate the number of spans required
  const numSpans = Math.ceil(diffDays / 30);

  // Calculate the number of days in each span
  const spanSize = Math.floor(diffDays / numSpans);
  const remainingDays = diffDays % numSpans;

  // Create the date ranges
  const dateRanges = [];
  let currentDate = new Date(start.getTime());
  for (let i = 0; i < numSpans - 1; i++) {
    const endDate = new Date(currentDate.getTime() + (spanSize - 1) * oneDay);
    dateRanges.push(formatDateRange(currentDate, endDate));
    currentDate = new Date(endDate.getTime() + oneDay);
    currentDate.setHours(0, 0, 0, 0); // Set to the beginning of the day
  }

  // Adjust the last range to end at the original endDate
  const lastEndDate = new Date(currentDate.getTime() + (spanSize + remainingDays) * oneDay);
  dateRanges.push(formatDateRange(currentDate, lastEndDate));

  return dateRanges;
}

function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formattedStartDate = formatDate(start);
  const formattedEndDate = formatDate(end);

  return `${formattedStartDate}--${formattedEndDate}`;
}

function formatDate(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based
  const year = date.getFullYear().toString();

  return `${year}-${month}-${day}`;
}

function calcDayPrimetimes(timeString) {
  // Split the time string into hours, minutes, and AM/PM parts
  const [time, period] = timeString.split(' ');
  const [hours, minutes] = time.split(':');

  // Convert hours to military time
  let militaryHours = parseInt(hours, 10);

  // Adjust hours for PM
  if (period === 'PM' && militaryHours !== 12) {
    militaryHours += 12;
  }

  // Adjust hours for AM and midnight
  if (period === 'AM' && militaryHours === 12) {
    militaryHours = 0;
  }

  // Round minutes to the nearest whole hour
  const roundedMinutes = parseInt(minutes, 10) >= 30 ? 0 : 0;

  // Format the military time without separators and with minimal digits
  let minimalMilitaryTime = ((militaryHours + roundedMinutes) * 100).toString().padStart(4, '0');
  if (minimalMilitaryTime.startsWith('0')) {
    minimalMilitaryTime = minimalMilitaryTime.substring(1);
  }

  return minimalMilitaryTime;
}

const buildWeatherUrl = (start, end, type, location) => {
  switch (type) {
    case 'detailed':
      return `${process.env.WEATHERSTACK_API}?access_key=${process.env.WEATHERSTACK_API_KEY}&query=${location},GA,USA&historical_date_start=${start}&historical_date_end=${end}&interval=1&hourly=1`;
    case 'summary':
      return `${process.env.WEATHERSTACK_API}?access_key=${process.env.WEATHERSTACK_API_KEY}&query=${location},GA,USA&historical_date_start=${start}&historical_date_end=${end}`;
  }
}

export { scrapedHuntsFn, addHuntsFn };