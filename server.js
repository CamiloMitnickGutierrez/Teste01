require('dotenv').config();
const app = require('./src/app');
const connectMongoDB = require('./src/config/mongodb');

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectMongoDB();
  app.listen(PORT, () => {
    console.log(`MegaStore API running on port ${PORT}`);
  });
};

start();
