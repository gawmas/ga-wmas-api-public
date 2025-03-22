import pkg from 'pg-promise';

const { ParameterizedQuery: pq } = pkg;

const updateHuntFn = (db) => async (req, res) => {
  const id = req.params.id;
  const { wmaId, seasonId,
    details, weaponId, hunterCount,
    does, bucks, startDates, endDates,
    isBonusQuota, quota } = req.body;

  const seasonDateIsNull = await db.oneOrNone(
    `SELECT start_date IS NULL as "startDateIsNull", 
    end_date IS NULL as "endDateIsNull" 
    FROM public.hunts WHERE id = $1`, id);

  let dateUpdateQuery = undefined;

  if (!seasonDateIsNull.startDateIsNull || !seasonDateIsNull.endDateIsNull) {
    dateUpdateQuery = `UPDATE public.hunts 
        SET start_date = TO_DATE($1, 'MM/DD/YYYY'), end_date = TO_DATE($2, 'MM/DD/YYYY') 
        WHERE id = $3`;
  }

  try {
    db.tx(async t => {

      if (dateUpdateQuery) {
        await t.none(dateUpdateQuery, [startDates[0], endDates[0], id]);
      } else {
        const dateIds = await t.manyOrNone(
          'SELECT ARRAY_TO_JSON(ARRAY(SELECT id FROM public.hunt_season_dates WHERE hunt_id = $1)) AS ids_array;', id);

        for (let i = 0; i < startDates.length; i++) {
          await t.none(`UPDATE public.hunt_season_dates 
            SET start_date = TO_DATE($1, 'MM/DD/YYYY'), end_date = TO_DATE($2, 'MM/DD/YYYY')
            WHERE id = $3`, [startDates[i], endDates[i], dateIds[0].ids_array[i]]);
        }
      }

      await t.none(`
        UPDATE public.hunts 
        SET wma_id = $1, 
        season_id = $2, 
        details = $3, 
        weapon_id = $4, 
        hunter_count = $5, 
        does = $6, bucks = $7, 
        is_bonus = $8, 
        quota = $9 
        WHERE id = $10`,
        [wmaId, seasonId, details, weaponId, hunterCount,
          does, bucks, isBonusQuota ?? false, +quota, +id])
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }

  const returnHunt = {
    ...req.body,
    huntDates: startDates.map((startDate, index) => ({
      start: startDate,
      end: endDates[index]
    }))
  }

  return res.json(returnHunt);

};

export { updateHuntFn };