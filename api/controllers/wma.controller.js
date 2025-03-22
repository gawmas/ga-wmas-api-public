const allWmasFn = (db) => async (req, res) => {
  try {

    // Build the base query
    // const returnQuery = db.many(`select * from "vwWmas" vw order by name;`);
    const returnQuery = db.many(`select * from public.wmas order by name;`);

    // Execute the query
    const data = await returnQuery;

    // Send the response
    res.status(200).json(
      data.map(wma => {
        return {
          id: wma.id,
          name: wma.name,
          acres: wma.acres,
          locationId: wma.location_id,
          hasBonusQuotas: wma.has_bonus_quotas,
          isSP: wma.is_sp,
          isVPA: wma.is_vpa,
          physLat: wma.phys_lat,
          physLong: wma.phys_long,
        };
      })
    );

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
    const returnQuery = db.many(`select * from public.vw_wma_locations";`);

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
    const returnQuery = db.many(`SELECT jsonb_agg AS "wmaCoords" FROM public.vw_wma_coords;`);

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