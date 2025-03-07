import pkg from 'pg-promise';

const { ParameterizedQuery: pq } = pkg;

const updateHuntFn = (db) => async (req, res) => {
  const id = req.params.id;
  const { wmaId, seasonId,
    details, weaponId, hunterCount,
    does, bucks, startDates, endDates,
    isBonusQuota, quota } = req.body;

  const seasonDateIsNull = await db.oneOrNone(
    `SELECT "startDate" IS NULL as "startDateIsNull", 
    "endDate" IS NULL as "endDateIsNull" 
    FROM public.hunts2 WHERE "id" = $1`, id);

  let dateUpdateQuery = undefined;

  if (!seasonDateIsNull.startDateIsNull || !seasonDateIsNull.endDateIsNull) {
    dateUpdateQuery = `UPDATE public.hunts2 
        SET "startDate" = TO_DATE($1, 'MM/DD/YYYY'), "endDate" = TO_DATE($2, 'MM/DD/YYYY') 
        WHERE "id" = $3`;
  }

  try {
    db.tx(async t => {

      if (dateUpdateQuery) {
        await t.none(dateUpdateQuery, [startDates[0], endDates[0], id]);
      } else {
        const dateIds = await t.manyOrNone(
          'SELECT ARRAY_TO_JSON(ARRAY(SELECT id FROM public."huntSeasonDates3" WHERE "huntId" = $1)) AS ids_array;', id);

        for (let i = 0; i < startDates.length; i++) {
          await t.none(`UPDATE public."huntSeasonDates3" 
            SET "startDate" = TO_DATE($1, 'MM/DD/YYYY'), "endDate" = TO_DATE($2, 'MM/DD/YYYY')
            WHERE id = $3`, [startDates[i], endDates[i], dateIds[0].ids_array[i]]);
        }
      }

      await t.none(`
        UPDATE public.hunts2 
        SET "wmaId" = $1, 
        "seasonId" = $2, 
        "details" = $3, 
        "weaponId" = $4, 
        "hunterCount" = $5, 
        "does" = $6, "bucks" = $7, 
        "isBonus" = $8, 
        "quota" = $9 
        WHERE "id" = $10`,
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