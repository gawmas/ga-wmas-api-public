const allWmasFn = (db) => async (req, res) => {
  try {

    // Build the base query
    // const returnQuery = db.many(`select * from "vwWmas" vw order by name;`);
    const returnQuery = db.many(`select * from public.wmas order by name;`);

    // Execute the query
    const data = await returnQuery;

    // Send the response
    res.json(data);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
}

const wmaCoordsFn = (db) => async (req, res) => {
  try {

    // Build the base query
    const returnQuery = db.many(`select * from "vwWmaLocations";`);

    // Execute the query
    const data = await returnQuery;

    // Send the response
    res.json(data);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
}

const wmaMapCoordsFn = (db) => async (req, res) => {
  try {

    // Build the base query
    const returnQuery = db.many(`SELECT jsonb_agg AS "wmaCoords" FROM public."vwWmaCoords";`);

    // Execute the query
    const data = await returnQuery;
    
    // Send the response
    res.json(data[0].wmaCoords);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
}

export { allWmasFn, wmaCoordsFn, wmaMapCoordsFn };