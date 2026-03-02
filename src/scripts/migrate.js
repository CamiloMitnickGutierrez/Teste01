require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectMongoDB = require('../config/mongodb');
const { parseCSV, migrateData } = require('../controllers/migrationController');
const path = require('path');

const run = async () => {
  await connectMongoDB();
  const csvPath = path.join(__dirname, '../../docs/AM-prueba-desempeno-data_m4.csv');
  console.log('Parsing CSV...');
  const rows = await parseCSV(csvPath);
  console.log(`Found ${rows.length} rows. Starting migration...`);
  const summary = await migrateData(rows);
  console.log('Migration Summary:', JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
