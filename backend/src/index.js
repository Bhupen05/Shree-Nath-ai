require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const { checkDatabaseConnection, pool } = require('./db');

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: clientOrigin,
  })
);
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const db = await checkDatabaseConnection();
    res.json({
      status: 'ok',
      message: 'Backend and PostgreSQL are connected',
      databaseTime: db.now,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Backend is running but PostgreSQL is not reachable',
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
