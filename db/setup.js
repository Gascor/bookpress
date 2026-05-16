require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setup() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  console.log('✓ Connecté à MySQL');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await conn.query(schema);
  console.log('✓ Schéma créé');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await conn.query(seed);
  console.log('✓ Données insérées');
  await conn.end();
  console.log('\n🚀 Base bookpress prête ! Lancez : npm start');
}

setup().catch(err => { console.error('Erreur setup:', err.message); process.exit(1); });
