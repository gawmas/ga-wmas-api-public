const adminWmasFn = (db) => async (req, res) => {
  try {

    // Build the base query
    const returnQuery = db.many(`SELECT * FROM vw_wmas vw ORDER BY name;`);

    // Execute the query
    const data = await returnQuery;

    // Send the response
    res.status(200).json(
      data.map(wma => {
        return {
          id: wma.id,
          name: wma.name,
          physLat: wma.phys_lat,
          physLong: wma.phys_long,
          isSP: wma.is_sp,
          isVPA: wma.is_vpa,
          hasBonusQuotas: wma.has_bonus_quotas,
          acres: wma.acres,
          locationId: wma.location_id,
          histClimateTownId: wma.hist_climate_town_id,
          histClimateTown: wma.hist_climate_town,
          histClimateLat: wma.hist_climate_lat,
          histClimateLong: wma.hist_climate_long
        }
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

const updateWmaFn = (db) => async (req, res) => {

  try {

    db.tx(async t => {
      const id = req.params.id;
      const params = req.body;

      // Build the base query
      const wmasQuery = {
        text: `
        update "wmas" 
        set name = $1, 
        phys_lat = $2, 
        phys_long = $3,
        is_sp = $4,
        is_vpa" = $5,
        "hasBonusQuotas" = $6,
        acres = $7
        where id = $8;`,
        values: [params.name, params.physLat, params.physLong,
        params.isSP, params.isVPA, params.hasBonusQuotas, params.acres, id]
      };

      const climateQuery = {
        text: `
        UPDATE public.wma_locations
        set "histClimateId" = $1
        where id = $2;`,
        values: [params.histClimateTownId, params.locationId]
      };

      await t.none(wmasQuery.text, [...wmasQuery.values]);
      await t.none(climateQuery.text, [...climateQuery.values]);

      // Send the response
      res.json({
        status: 'success',
        message: 'WMA updated'
      });

    });


  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
};

export { adminWmasFn, updateWmaFn };