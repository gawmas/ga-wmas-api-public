import pkg from 'pg-promise';

const { ParameterizedQuery: pq } = pkg;

const wxDetailedFn = (db) => async (req, res) => {

  const id = req.params.id;
  const query = new pq('SELECT public.fn_wx_detailed_full($1)');

  try {
    const data = await db.oneOrNone(query, id);
    const returnData = groupDataByDate(data.fn_wx_detailed_full);
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