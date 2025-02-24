import pgp from 'pg-promise';
import dotenv from 'dotenv';

// Load environment variables from a .env file
dotenv.config();

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  // Other connection options if needed
};

// Create a database instance
const db = pgp()(dbConfig);

// Function to connect to the database
export async function connect() {
  return db.connect();
}

// Function to execute a query
export async function query(sql, params) {
  return db.any(sql, params);
}

// Function to close the database connection
export function close() {
  db.$pool.end();
}
