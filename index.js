import { setupRoutes } from "./api/config/routes.config.js";
import cors from 'cors';
import express from 'express';
import * as corsConfig from "./api/config/cors.config.js";
import * as dbConnector from "./api/config/db.config.js";

const db = await dbConnector.connect();
const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

app.use(cors(corsConfig));

setupRoutes(app, db);

// Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`*** PUBLIC API ***`);
  console.log(`Running on ${host}:${port}`);
});

export { app, db };
