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
      'select * from public."mvwHunts3" WHERE 1=1',
      wmas ? `"wmaId" = ANY(string_to_array($1, ',')::integer[])` : `"wmaId" IS NOT NULL`,
      seasons ? `"seasonId" = ANY(string_to_array($2, ',')::integer[])` : `"seasonId" IS NOT NULL`,
      weapons ? `"weaponId" = ANY(string_to_array($3, ',')::integer[])` : `"weaponId" IS NOT NULL`,
      success ? `"successRate" >= $4` : `"successRate" IS NOT NULL`,
      isBonusQuota === 'true' ? `"isQuotaOrBonus" = true` : `"isQuotaOrBonus" IS NOT NULL`,
      isStatePark === 'true' ? `"wmaTypeSP" = true` : `"wmaTypeSP" IS NOT NULL`,
      isVpa === 'true' ? `"wmaTypeVPA" = true` : ``,
      (tempDepart && tempDepart === 'above') ? `(("huntMinTemp"::NUMERIC - "avgLow"::NUMERIC) > $5 OR ("huntMaxTemp"::NUMERIC - "avgHigh"::NUMERIC) > $5)` : ``,
      (tempDepart && tempDepart === 'below') ? `(("huntMinTemp"::NUMERIC - "avgLow"::NUMERIC) < $5 OR ("huntMaxTemp"::NUMERIC - "avgHigh"::NUMERIC) < $5)` : ``,      
      phase ? `"wxDetails"::text LIKE $6` : ``
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
        sortOrder = '"successRate" DESC';
        break;
      case 'hunters':
        sortOrder = '"hunterCount" DESC';
        break;
      default:
        sortOrder = `"wmaName" ASC, "seasonId" DESC, (SELECT MIN((elem->>'start')::date) FROM jsonb_array_elements("huntDates") AS elem) ASC`;
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
      .map(d => ({ ...d, wxHistAvgs: calculateAverages(d.huntDates, d.wxAvgs) }));

    // Remove unneeded property: wxAvgs ...
    data.forEach(d => delete d.wxAvgs);

    // console.log('data', data);

    res.json(data);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
}

function calculateAverages(dateRanges, temperatureData) {
  const result = [];

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
      if (temperature) {
        highTotal += temperature.high;
        lowTotal += temperature.low;
        count++;
      }
    }

    // Calculate averages
    const averageHigh = count ? highTotal / count : 0;
    const averageLow = count ? lowTotal / count : 0;

    // Push averages to result array
    result.push({
      startDate: dateRange.start,
      endDate: dateRange.end,
      avgHigh: +averageHigh.toFixed(2),
      avgLow: +averageLow.toFixed(2)
    });
  });

  return result;
}

const getOneHuntFn = (db) => async (req, res) => {
  const id = req.params.id;
  const query = new pq('SELECT * FROM public."vwHunts3" WHERE "id" = $1');
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