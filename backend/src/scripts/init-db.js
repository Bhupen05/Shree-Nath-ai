require('dotenv').config({ override: true });

const { runMigrations } = require('../db/migrate');
const { runSeeds } = require('../db/seed');

async function run() {
  try {
    await runMigrations();
    await runSeeds();
    console.log('Database migrations and seeds completed successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    process.exitCode = 1;
  }
}

run();
