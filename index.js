import { setupRoutes } from "./api/config/routes.config.js";
import cors from 'cors';
import express from 'express';
import * as corsConfig from "./api/config/cors.config.js";
import * as dbConnector from "./api/config/db.config.js";
import { setupAuthRoutes } from "./api/config/routes.auth.config.js";

const db = await dbConnector.connect();
const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.API_PORT || 3000;

app.use(cors(corsConfig));

setupRoutes(app, db);
setupAuthRoutes(app, db);

// Function to print all routes
function printRoutes(app) {
  app._router.stack.forEach(layer => {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${path}`);
    }
  });
}

// Call the function to print routes
printRoutes(app);

// Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`*** GAWMAS API ***`);
  console.log(`Running on ${host}:${port}`);
});

export { app, db };
