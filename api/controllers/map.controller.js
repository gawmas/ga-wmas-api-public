import pkg from 'pg-promise';

const { ParameterizedQuery: pq } = pkg;

const mapDataFn = (db) => async (req, res) => {
  try {

    const stat = req.params.stat;
    const seasonId = req.params.id;

    // Query for weapons data ...
    const weaponsQuery = new pq('SELECT id, name FROM public.weapons;');
    const weapons = await db.many(weaponsQuery);

    // Define the shape of the return data ...
    let returnData = {
      type: stat,
      weapons: [],
      // seasonResults: []
    };

    // Define the pg functions to use based on the params: stat and id
    let dbFuncs = [];
    switch (stat) {
      case 'harvest':
        dbFuncs = ['fn_map_season_weapon_total_harvest', 'fn_map_season_total_harvest'];
        break;
      case 'success':
        dbFuncs = ['fn_map_season_weapon_success', 'fn_map_season_success'];
        break;
      case 'harvestrate':
        dbFuncs = ['fn_map_season_weapon_harvest_per_acre', 'fn_map_season_harvest_per_acre'];
        break;
      default:
        break;
    }

    // Proceed only if the db function names have been defined, else 400 ...
    if (dbFuncs.length > 0) {

      // Loop through the weapons and get the harvest data for each ...
      await weapons.forEach(async weapon => {
        if (weapon.id < 4) {          
          const weaponData = await db.manyOrNone(`SELECT public.${dbFuncs[0]}($1,$2);`, [seasonId, weapon.id]);
          const obj = {
            weapon: weapon.name,
            weaponId: weapon.id,
            data: weaponData[0][`${dbFuncs[0]}`]
          };
          returnData.weapons.push(obj);
        }
      });
  
      // Total harvest for a given season ...
      const seasonTotalsQuery = new pq(`SELECT public.${dbFuncs[1]}($1);`);
      const seasonTotalsData = await db.many(seasonTotalsQuery, seasonId);
 
      returnData.weapons.push({
        weapon: 'Total',
        weaponId: 0,
        data: seasonTotalsData[0][`${dbFuncs[1]}`]
      });
      // returnData.seasonResults = seasonTotalsData[0][`${dbFuncs[1]}`];
  
      // Send the response
      res.json(returnData);

    } else {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request!'
      });
    }

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
    console.error(error);
  }
}

export { mapDataFn };