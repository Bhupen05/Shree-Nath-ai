require('dotenv').config({ override: true });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function applyMigration(client, filename) {
  const migrationPath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`[migrate] applied ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function runMigrations() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    for (const filename of files) {
      if (applied.has(filename)) {
        continue;
      }
      await applyMigration(client, filename);
    }

    console.log('[migrate] migration run completed');
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = {
  runMigrations,
};

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('[migrate] failed:', error.message);
    process.exitCode = 1;
  });
}
