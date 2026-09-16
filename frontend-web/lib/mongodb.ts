import { MongoClient, GridFSBucket } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'lumpydb';
if (!MONGODB_URI) throw new Error('Please define MONGODB_URI in .env.local');

declare global { var _mongoClientPromise: Promise<MongoClient> | undefined; }

// A warm serverless function can handle many requests. Reuse one bounded
// client pool for its lifetime instead of creating a new pool when this
// module is evaluated. Keeping the pool small also avoids exhausting Atlas
// connections when Vercel scales out during bursts of dashboard polling.
if (!global._mongoClientPromise) {
  global._mongoClientPromise = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8_000,
    waitQueueTimeoutMS: 8_000,
  }).connect();
}

const clientPromise = global._mongoClientPromise;

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(MONGODB_DB_NAME);
}

export async function getGridFSBucket(bucketName = 'uploads') {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName });
}
