import pkg from 'pg-promise';

const { ParameterizedQuery: pq } = pkg;

const wxDetailedFn = (db) => async (req, res) => {

  const id = req.params.id;
  const wxQuery = new pq('SELECT public.fn_wx_detailed_full($1)');
  const huntQuery = new pq('select weapon, hunter_count as "hunterCount", bucks, does, location, hunt_dates as "huntDates" from public.mvw_hunts where id = $1');

  try {
    const wxData = await db.oneOrNone(wxQuery, id);
    const huntData = await db.oneOrNone(huntQuery, id);
    const returnData = { huntDetails: huntData, ...groupDataByDate(wxData.fn_wx_detailed_full)};
    res.json(returnData);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }

}

function groupDataByDate(data) {
  const groupedData = {
      primetimes: {},
      astros: data.astros,
      histAvgs: data.histAvgs
  };

  // Group primetimes by date
  data.primetimes.forEach(primetime => {
      const date = primetime.huntDate;
      if (!groupedData.primetimes[date]) {
          groupedData.primetimes[date] = [];
      }
      groupedData.primetimes[date].push(primetime);
  });

  // Sort primetimes for each date by stdTime
  for (const date in groupedData.primetimes) {
      groupedData.primetimes[date].sort((a, b) => {
          const timeA = a.stdTime.includes("AM") ? 0 : 1;
          const timeB = b.stdTime.includes("AM") ? 0 : 1;
          return timeA - timeB;
      });
  }

  // Sort dates
  const sortedDates = Object.keys(groupedData.primetimes).sort();

  // Create a new object with sorted dates
  const sortedPrimetimes = {};
  sortedDates.forEach(date => {
      sortedPrimetimes[date] = groupedData.primetimes[date];
  });

  groupedData.primetimes = sortedPrimetimes;

  return groupedData;
}

export { wxDetailedFn };