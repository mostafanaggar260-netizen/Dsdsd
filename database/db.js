// Cloud database using MongoDB. Replaces the local JSON file system.
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Missing MONGODB_URI in environment variables.');
  process.exit(1);
}

const client = new MongoClient(uri);
let db;

async function connectDB() {
  if (db) return db;
  try {
    await client.connect();
    db = client.db('discord_bot');
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

async function loadJSON(fileName, fallback) {
  try {
    const database = await connectDB();
    const collection = database.collection('json_store');
    const doc = await collection.findOne({ _id: fileName });
    return doc ? doc.data : fallback;
  } catch (err) {
    console.error(`⚠️ Failed to read ${fileName}, using fallback data.`, err);
    return fallback;
  }
}

async function saveJSON(fileName, data) {
  try {
    const database = await connectDB();
    const collection = database.collection('json_store');
    await collection.updateOne(
      { _id: fileName },
      { $set: { data } },
      { upsert: true }
    );
  } catch (err) {
    console.error(`⚠️ Failed to save ${fileName} to MongoDB.`, err);
  }
}

module.exports = { loadJSON, saveJSON };
