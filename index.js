import { setupRoutes } from "./api/config/routes.config.js";
import cors from 'cors';
import express from 'express';
import * as corsConfig from "./api/config/cors.config.js";
import * as dbConnector from "./api/config/db.config.js";
import { setupAdminRoutes } from "./api/config/routes.admin.config.js";
// import { transporter, emailTemplate } from "./api/helpers/mailer.js";

const db = await dbConnector.connect();
const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.API_PORT || 3000;

app.use(cors(corsConfig));

setupRoutes(app, db);

if (process.env.PROD_MODE === false || process.env.PROD_MODE === 'false') {
  console.log(`PROD_MODE set to ${process.env.PROD_MODE} ... setting up admin routes`);
  setupAdminRoutes(app, db);
}

// Function to print all routes
function printRoutes(app) {
  console.log('**************** ROUTES ****************');
  app._router.stack.forEach(layer => {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${path}`);
    }
  });
  console.log('****************************************');
}

// Test email ...
// try {
//   const mailOptions = emailTemplate('test', 'http://localhost:3000/verify/1234');
//   const message = { 
//     ...mailOptions, 
//     to: 'david.j.okey@gmail.com', 
//     subject: 'Test email from GAWMAS API2',
//   };
//   // console.log('Sending email ...', message);
//   transporter.sendMail(message).then(() => {
//     console.log('Email sent! %s', message.subject);
//   }).catch(error => {
//     console.error('Error sending email:', error);
//   });
// } catch (error) {
//   console.error('Error sending email:', error);
// }

// Call the function to print routes
printRoutes(app);

// Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`**** API RUNNING on: ${host}:${port} ****`);
  console.log('****************************************');
});

export { app, db };
