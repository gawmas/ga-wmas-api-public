const histClimateLocationsFn = (db) => async (req, res) => {
  try {

    // Build the base query
    const returnQuery = db.many(`SELECT * FROM public.hist_climate_locations ORDER BY town asc;`);

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

const histClimateLocationsCoordsFn = (db) => async (req, res) => {
  try {

    // Build the base query
    const returnQuery = db.many(`SELECT * FROM public.vw_climate_locations;`);

    // Execute the query
    const data = await returnQuery;
    // console.log(...data);
    // Send the response
    res.json(
      data.flatMap(item =>
        item.climate_markers.map(marker => ({
          town: marker.town,
          coords: marker.coords,
          hasDailyData: marker.hasDailyData
        })
      )
    ));

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
}

export { histClimateLocationsFn, histClimateLocationsCoordsFn };