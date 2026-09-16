// backend/seed_mongodb.js  v2 — run: node seed_mongodb.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB  = 'lumpydb';

async function seed() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB);
  console.log('✅ Connected to MongoDB');

  // Indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1, status: 1 });
  await db.collection('cattle').createIndex({ ownerId: 1 });
  await db.collection('scans').createIndex({ farmerId: 1, createdAt: -1 });
  await db.collection('cases').createIndex({ status: 1, createdAt: -1 });
  await db.collection('messages').createIndex({ threadId: 1, createdAt: 1 });
  await db.collection('messages').createIndex({ farmerId: 1 });
  await db.collection('messages').createIndex({ doctorId: 1 });
  await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 });
  console.log('✅ Indexes created');

  const now = new Date();

  const users = [
    { name: 'Ravi Kumar',    email: 'farmer@lumpy.ai', password: 'farmer123', role: 'user',   location: 'Guntur, Andhra Pradesh', status: 'active' },
    { name: 'Priya Sharma',  email: 'vet@lumpy.ai',    password: 'vet123',    role: 'doctor', specialization: 'Bovine Medicine', licenseNumber: 'VET-12345', status: 'active' },
    { name: 'Admin',         email: 'admin@lumpy.ai',  password: 'admin123',  role: 'admin',  status: 'active' },
  ];

  const insertedIds = {};
  for (const u of users) {
    const exists = await db.collection('users').findOne({ email: u.email });
    if (exists) { console.log(`⏭️  Skip ${u.email}`); insertedIds[u.role] = exists._id.toString(); continue; }
    const { password, ...rest } = u;
    const r = await db.collection('users').insertOne({ ...rest, passwordHash: await bcrypt.hash(password, 12), createdAt: now, updatedAt: now });
    insertedIds[u.role] = r.insertedId.toString();
    console.log(`✅ Created ${u.email} / ${password}`);
  }

  // Seed cattle for farmer
  const farmerId = insertedIds['user'];
  if (farmerId) {
    const count = await db.collection('cattle').countDocuments({ ownerId: farmerId });
    if (count === 0) {
      await db.collection('cattle').insertMany([
        { ownerId: farmerId, name: 'Lakshmi',  animalType: 'Cow',     age: 4, lastStatus: 'healthy',  lastScanDate: new Date('2026-06-15'), createdAt: now, updatedAt: now },
        { ownerId: farmerId, name: 'Raja',     animalType: 'Bull',    age: 6, lastStatus: 'lumpy',    lastScanDate: new Date('2026-06-12'), createdAt: now, updatedAt: now },
        { ownerId: farmerId, name: 'Ganga',    animalType: 'Buffalo', age: 3, lastStatus: 'healthy',  lastScanDate: new Date('2026-06-10'), createdAt: now, updatedAt: now },
        { ownerId: farmerId, name: 'Little One', animalType: 'Calf', age: 1, lastStatus: 'unscanned',                                      createdAt: now, updatedAt: now },
      ]);
      console.log('✅ Seeded 4 cattle (Lakshmi, Raja, Ganga, Little One)');
    }
  }

  await client.close();
  console.log('\n🎉 Done! Login credentials:');
  console.log('   farmer@lumpy.ai  / farmer123');
  console.log('   vet@lumpy.ai     / vet123');
  console.log('   admin@lumpy.ai   / admin123');
}

seed().catch(e => { console.error(e); process.exit(1); });
