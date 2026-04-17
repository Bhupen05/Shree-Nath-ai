const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    let customer = await pool.query('SELECT id FROM customers WHERE email = $1 LIMIT 1', [
      'phase5.customer@example.com',
    ]);

    if (customer.rowCount === 0) {
      customer = await pool.query(
        'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING id',
        ['Phase5 Customer', '9999999999', 'phase5.customer@example.com']
      );
    }

    let supplier = await pool.query('SELECT id FROM suppliers WHERE email = $1 LIMIT 1', [
      'phase5.supplier@example.com',
    ]);

    if (supplier.rowCount === 0) {
      supplier = await pool.query(
        'INSERT INTO suppliers (name, phone, email) VALUES ($1, $2, $3) RETURNING id',
        ['Phase5 Supplier', '8888888888', 'phase5.supplier@example.com']
      );
    }

    console.log(
      JSON.stringify({
        customerId: customer.rows[0].id,
        supplierId: supplier.rows[0].id,
      })
    );
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
