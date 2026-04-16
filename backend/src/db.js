const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeSchema() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role_id INTEGER REFERENCES roles(id),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cabinets (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        code VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(room_id, name)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        cabinet_id INTEGER NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        code VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(cabinet_id, name)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS part_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS part_brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS parts (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES part_categories(id),
        brand_id INTEGER REFERENCES part_brands(id),
        cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        reorder_threshold INTEGER NOT NULL DEFAULT 0,
        section_id INTEGER REFERENCES sections(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_compatibility (
        id SERIAL PRIMARY KEY,
        part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
        make VARCHAR(80) NOT NULL,
        model VARCHAR(80) NOT NULL,
        year_from INTEGER,
        year_to INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (year_from IS NULL OR year_from >= 1900),
        CHECK (year_to IS NULL OR year_to >= 1900)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id SERIAL PRIMARY KEY,
        part_id INTEGER NOT NULL REFERENCES parts(id),
        section_id INTEGER REFERENCES sections(id),
        transaction_type VARCHAR(20) NOT NULL,
        quantity_delta INTEGER NOT NULL,
        quantity_after INTEGER,
        reference_id INTEGER,
        performed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (transaction_type IN ('PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT'))
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        email VARCHAR(255),
        address TEXT,
        credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
        outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        email VARCHAR(255),
        address TEXT,
        outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        bill_type VARCHAR(20) NOT NULL,
        bill_number VARCHAR(100) NOT NULL UNIQUE,
        bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
        party_id INTEGER NOT NULL,
        party_type VARCHAR(20) NOT NULL,
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax NUMERIC(12,2) NOT NULL DEFAULT 0,
        discount NUMERIC(12,2) NOT NULL DEFAULT 0,
        total NUMERIC(12,2) NOT NULL DEFAULT 0,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
        amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        due_date DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (bill_type IN ('PURCHASE', 'SALE')),
        CHECK (party_type IN ('CUSTOMER', 'SUPPLIER')),
        CHECK (status IN ('DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'))
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        part_id INTEGER NOT NULL REFERENCES parts(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        line_total NUMERIC(12,2) NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        payment_mode VARCHAR(20) NOT NULL,
        reference_number VARCHAR(120),
        paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        recorded_by INTEGER REFERENCES users(id),
        CHECK (payment_mode IN ('CASH', 'UPI', 'BANK', 'CHEQUE'))
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(120) NOT NULL,
        entity_type VARCHAR(120) NOT NULL,
        entity_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts(sku);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_vehicle_lookup ON vehicle_compatibility(make, model, year_from, year_to);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stock_ledger_part ON stock_ledger(part_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at ON stock_ledger(created_at DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);');

    await client.query(`
      INSERT INTO roles (name, permissions)
      VALUES
        ('SUPER_ADMIN', '["*"]'::jsonb),
        ('MANAGER', '["inventory:*","billing:*","customers:*","dashboard:read"]'::jsonb),
        ('BILLING_STAFF', '["billing:*","customers:read","inventory:read","dashboard:read"]'::jsonb),
        ('WAREHOUSE_STAFF', '["inventory:*","dashboard:read"]'::jsonb),
        ('VIEW_ONLY', '["dashboard:read","inventory:read"]'::jsonb)
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function checkDatabaseConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() AS now');
    return {
      connected: true,
      now: result.rows[0].now,
    };
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  checkDatabaseConnection,
  initializeSchema,
};
