import { MongoClient, GridFSBucket } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'lumpydb';
if (!MONGODB_URI) throw new Error('Please define MONGODB_URI in .env.local');

declare global { var _mongoClientPromise: Promise<MongoClient> | undefined; }

let clientPromise: Promise<MongoClient>;
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(MONGODB_DB_NAME);
}

export async function getGridFSBucket(bucketName = 'uploads') {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName });
}
