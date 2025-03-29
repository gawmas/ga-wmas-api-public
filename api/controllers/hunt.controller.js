import pkg from 'pg-promise';

const { ParameterizedQuery: pq } = pkg;

const queryHuntsFn = (db) => async (req, res) => {
  try {
    // Extract filtering parameters from the query string
    const { skip, pageSize, wmas, seasons, weapons, success,
      isBonusQuota, isStatePark, isVpa, sort, avgTemp, phase } = req.query;

    // console.log(req.query);

    let tempDepart = undefined;
    if (avgTemp && avgTemp !== '0') {
      tempDepart = avgTemp > +'0' ? 'above' : 'below';
    }

    const conditions = [
      'select * from public.mvw_hunts WHERE 1=1',
      wmas ? `wma_id = ANY(string_to_array($1, ',')::integer[])` : `wma_id IS NOT NULL`,
      seasons ? `season_id = ANY(string_to_array($2, ',')::integer[])` : `season_id IS NOT NULL`,
      weapons ? `weapon_id = ANY(string_to_array($3, ',')::integer[])` : `weapon_id IS NOT NULL`,
      success ? `success_rate >= $4` : `success_rate IS NOT NULL`,
      isBonusQuota === 'true' ? `is_quota_or_bonus = true` : `is_quota_or_bonus IS NOT NULL`,
      isStatePark === 'true' ? `wma_type_sp = true` : `wma_type_sp IS NOT NULL`,
      isVpa === 'true' ? `wma_type_vpa = true` : ``,
      (tempDepart && tempDepart === 'above') ? `((hunt_min_temp::NUMERIC - avg_low::NUMERIC) > $5 OR (hunt_max_temp::NUMERIC - avg_high::NUMERIC) > $5)` : ``,
      (tempDepart && tempDepart === 'below') ? `((hunt_min_temp::NUMERIC - avg_low::NUMERIC) < $5 OR (hunt_max_temp::NUMERIC - avg_high::NUMERIC) < $5)` : ``,      
      phase ? `wx_details::text LIKE $6` : ``
    ];

    let departure = undefined;
    if (tempDepart) {
      const tempFactor = +avgTemp;
      switch (tempFactor) {
        case -2:
          departure = -8;
          break;
        case -1:
          departure = -4;
          break;
        case 1:
          departure = 4;
          break;
        case 2:
          departure = 8;
          break;
      }
    }

    // Join the conditions with the 'and' clause ...
    const baseQuery = conditions.filter(Boolean).join(' AND ');
    let phaseQuery = '';
    switch (phase) {
      case 'full':
        phaseQuery = '%Full Moon%';
        break;
      case 'new':
        phaseQuery = '%New Moon%';
        break;
      case 'first':
        phaseQuery = '%First Quarter%';
        break;
      case 'last':
        phaseQuery = '%Last Quarter%';
        break;
    }
    const params = [wmas, seasons, weapons, success, departure, phaseQuery];

    // Add OFFSET and LIMIT parameters if present
    if (skip !== undefined && skip !== '') {
      params.push(skip);
    } else {
      params.push(0); // Default OFFSET value
    }

    if (pageSize !== undefined && pageSize !== '') {
      params.push(pageSize);
    } else {
      params.push(10); // Default LIMIT value
    }

    let sortOrder = '';
    switch (sort) {
      case 'success':
        sortOrder = 'success_rate DESC';
        break;
      case 'hunters':
        sortOrder = 'hunter_count DESC';
        break;
      default:
        sortOrder = `wma_name ASC, season_id DESC, (SELECT MIN((elem->>'start')::date) FROM jsonb_array_elements(hunt_dates) AS elem) ASC`;
    }

    const finalQuery = {
      text: `${baseQuery} order by ${sortOrder}
        OFFSET $${params.length - 1}
        LIMIT $${params.length}`,
      values: params
    };

    // console.log(finalQuery.text);
    // console.log(finalQuery);
    const returnQuery = db.manyOrNone(finalQuery.text, [...finalQuery.values]);

    // Execute the query, then map the "wxHistAvgs" property using the calculateAverages() fn ...
    const data = (await returnQuery)
      .map(d => ({ ...d, wxHistAvgs: calculateAverages(d.hunt_dates, d.wx_avgs) }))
      .map(d => {
        return {
          // ...d,
          id: d.id,
          physLat: d.phys_lat,
          physLong: d.phys_long,
          wmaId: d.wma_id,
          wmaName: d.wma_name,
          details: d.details,
          huntDates: d.hunt_dates,
          seasonId: d.season_id,
          season: d.season,
          weaponId: d.weapon_id,
          weapon: d.weapon,
          hunterCount: d.hunter_count,
          does: d.does,
          bucks: d.bucks,
          wxDetails: d.wx_details,
          wxHistAvgs: d.wxHistAvgs,
        };
      });

    // Remove unneeded property: wxAvgs ...
    data.forEach(d => delete d.wxAvgs);

    // console.log('data', data);

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
}

function calculateAverages(dateRanges, temperatureData) {
  let results = [];

  // console.log('dateRanges', dateRanges);

  // Iterate over each date range
  dateRanges.forEach(dateRange => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    let highTotal = 0;
    let lowTotal = 0;
    let count = 0;

    // Iterate over each day within the date range
    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
      // Find corresponding temperature for the current day
      const temperature = temperatureData.find(temperature => temperature.month === currentDate.getMonth() + 1 && temperature.day === currentDate.getDate());
      // console.log('temperature', temperature);
      if (temperature) {
        highTotal += temperature.high;
        lowTotal += temperature.low;
        count++;
      }
    }

    // Calculate averages
    const averageHigh = count ? highTotal / count : 0;
    const averageLow = count ? lowTotal / count : 0;

    const result = {
      startDate: dateRange.start,
      endDate: dateRange.end,
      avgHigh: +averageHigh.toFixed(2),
      avgLow: +averageLow.toFixed(2)
    };

    console.log('result', result);

    // Push averages to result array
    results.push(result);
  });
  console.log('results', results);
  return results;
}

const getOneHuntFn = (db) => async (req, res) => {
  const id = req.params.id;
  const query = new pq('SELECT * FROM public.vw_hunts WHERE id = $1');
  try {
    const data = await db.oneOrNone(query, id);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
}

export { queryHuntsFn as queryHuntsFn, getOneHuntFn };