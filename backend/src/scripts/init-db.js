require('dotenv').config({ override: true });

const { initializeSchema, pool } = require('../db');

async function run() {
  try {
    await initializeSchema();
    console.log('Database schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize schema:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
