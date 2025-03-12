import { Router } from 'express';
import bodyParser from 'body-parser';
import { updateHuntFn } from '../controllers/admin/admin.hunt.controller.js';
import { adminWmasFn, updateWmaFn } from '../controllers/admin/admin.wma.controller.js';
import { scrapedHuntsFn, addHuntFn, testWeatherStackFn } from '../controllers/admin/add-hunts.controller.js';

export function setupAdminRoutes(app, db) {

  const router = Router();

  const adminSlug = process.env.ADMIN_SLUG || 'api/admin';
  const jsonParser = bodyParser.json();

  // Admin Routes
  app.put(`/${adminSlug}/hunt/:id`, jsonParser, updateHuntFn(db));
  app.use(`/${adminSlug}/adminWmas`, adminWmasFn(db));
  app.put(`/${adminSlug}/wma/:id`, jsonParser, updateWmaFn(db));
  app.use(`/${adminSlug}/scraped`, scrapedHuntsFn());
  app.post(`/${adminSlug}/hunt`, jsonParser, addHuntFn(db));
  app.use(`/${adminSlug}/test`, testWeatherStackFn());

  // Use the router in the app
  app.use('/', router);

  return router;

}