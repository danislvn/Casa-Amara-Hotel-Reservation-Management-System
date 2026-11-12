/**
 * Database Connection Pool using mysql2/promise
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casa_amara_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup and auto-create database container if missing
async function initDatabase() {
  const targetDb = process.env.DB_NAME || 'casa_amara_db';
  try {
    const connection = await pool.getConnection();
    console.log(' Connected to MySQL database:', targetDb);
    connection.release();
  } catch (err) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.warn(` Database "${targetDb}" was not found. Auto-creating database container...`);
      try {
        const rootConn = await mysql.createConnection({
          host: process.env.DB_HOST || '127.0.0.1',
          port: Number(process.env.DB_PORT) || 3306,
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || ''
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await rootConn.end();
        console.log(` Successfully initialized database container "${targetDb}".`);

        const testConn = await pool.getConnection();
        console.log(' Connected to newly initialized MySQL database:', targetDb);
        testConn.release();
      } catch (createErr) {
        console.error(' Failed to auto-create database container:', createErr.message);
      }
    } else {
      console.warn('   MySQL connection notice:', err.message);
      console.warn('   Ensure MySQL is running and DB_PASSWORD in .env matches your MySQL password.');
    }
  }
}

initDatabase();

module.exports = pool;
