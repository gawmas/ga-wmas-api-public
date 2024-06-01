import { Router } from 'express';
import { queryHuntsFn, getOneHuntFn } from '../controllers/hunt.controller.js'; 
import { allWmasFn, wmaCoordsFn, wmaMapCoordsFn } from '../controllers/wma.controller.js';
import { allSeasonsFn } from '../controllers/season.controller.js';
import { allWeaponsFn } from '../controllers/weapon.controller.js';
import { histClimateLocationsFn, histClimateLocationsCoordsFn } from '../controllers/histClimateLocation.controller.js';
import { wxDetailedFn } from '../controllers/wx.controller.js';
import { mapDataFn } from '../controllers/map.controller.js';

export function setupRoutes(app, db) {
  const router = Router();

  const slug = process.env.SLUG || 'api';

  app.use(`/${slug}/hunts`, queryHuntsFn(db));
  app.get(`/${slug}/hunt/:id`, getOneHuntFn(db));

  app.use(`/${slug}/wmas`, allWmasFn(db));

  app.use(`/${slug}/seasons`, allSeasonsFn(db));
  app.use(`/${slug}/weapons`, allWeaponsFn(db));
  app.use(`/${slug}/histClimateLocations`, histClimateLocationsFn(db));

  app.use(`/${slug}/climateCoords`, histClimateLocationsCoordsFn(db));
  app.use(`/${slug}/wmaCoords`, wmaCoordsFn(db));

  app.get(`/${slug}/wx/:id`, wxDetailedFn(db));

  app.get(`/${slug}/map/wmacoords`, wmaMapCoordsFn(db));
  app.get(`/${slug}/map/:stat/:id`, mapDataFn(db));

  // Use the router in the app
  app.use('/', router);

  return router;
}
