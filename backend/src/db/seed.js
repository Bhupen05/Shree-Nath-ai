require('dotenv').config({ override: true });

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

async function seedRoles(client) {
  await client.query(`
    INSERT INTO roles (name, permissions)
    VALUES
      ('SUPER_ADMIN', '["*"]'::jsonb),
      ('MANAGER', '["inventory:*","billing:*","customers:*","employees:*","dashboard:read","logs:read"]'::jsonb),
      ('BILLING_STAFF', '["billing:*","customers:read","inventory:read","dashboard:read","logs:read"]'::jsonb),
      ('WAREHOUSE_STAFF', '["inventory:*","dashboard:read"]'::jsonb),
      ('VIEW_ONLY', '["dashboard:read","inventory:read","logs:read"]'::jsonb)
    ON CONFLICT (name) DO NOTHING;
  `);
}

async function seedAdminUser(client) {
  const adminName = process.env.ADMIN_NAME || 'System Admin';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@local.test').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await client.query(
    `
      INSERT INTO users (name, email, password_hash, role_id)
      VALUES (
        $1,
        $2,
        $3,
        (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')
      )
      ON CONFLICT (email) DO NOTHING;
    `,
    [adminName, adminEmail, passwordHash]
  );
}

async function runSeeds() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await seedRoles(client);
    await seedAdminUser(client);
    await client.query('COMMIT');
    console.log('[seed] seed run completed');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = {
  runSeeds,
};

if (require.main === module) {
  runSeeds().catch((error) => {
    console.error('[seed] failed:', error.message);
    process.exitCode = 1;
  });
}
