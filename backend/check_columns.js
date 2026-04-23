require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'suppliers'
      ORDER BY ordinal_position;
    `);
    console.log('Suppliers columns:');
    result.rows.forEach(row => {
      console.log(row.column_name);
    });
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

checkColumns();
