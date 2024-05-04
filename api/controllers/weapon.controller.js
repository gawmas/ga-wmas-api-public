const allWeaponsFn = (db) => async (req, res) => {
  try {

    // Build the base query
    const returnQuery = db.many(`select * from public.weapons;`);

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

export { allWeaponsFn };