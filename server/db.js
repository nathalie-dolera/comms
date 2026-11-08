const { MongoClient } = require('mongodb');

let clientPromise;

function getClient() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
      appName: 'comms-tracker-and-portfolio'
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB_NAME || 'comms');
}

module.exports = { getDb };
