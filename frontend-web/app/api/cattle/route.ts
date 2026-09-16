import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';
import type { CattleDoc, AnimalType } from '@/lib/types';

const VALID_TYPES: AnimalType[] = ['Cow', 'Buffalo', 'Bull', 'Calf', 'Heifer', 'Ox'];

export async function GET(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const requestedFarmerId = searchParams.get('farmerId');

    // Farmers can only ever see their own cattle, regardless of what's in the
    // query string. Doctors/admins may look up a specific farmer's herd.
    const farmerId = session.role === 'user' ? session.userId : requestedFarmerId;
    if (!farmerId) return NextResponse.json({ error: 'farmerId required.' }, { status: 400 });

    const db = await getDb();
    const cattle = await db.collection<CattleDoc>('cattle')
      .find({ ownerId: farmerId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      cattle: cattle.map(c => ({
        id: c._id!.toString(),
        name: c.name,
        animalType: c.animalType,
        age: c.age,
        lastStatus: c.lastStatus,
        lastScanDate: c.lastScanDate?.toISOString() || null,
        ownerId: c.ownerId,
      })),
    });
  } catch (e: any) {
    console.error('[cattle GET]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { name, animalType, age } = await request.json();
    if (!name || !animalType)
      return NextResponse.json({ error: 'name and animalType required.' }, { status: 400 });

    if (!VALID_TYPES.includes(animalType))
      return NextResponse.json({ error: `animalType must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });

    const db = await getDb();
    const now = new Date();
    const doc: CattleDoc = {
      ownerId: session.userId, // always the logged-in farmer, never client-supplied
      name: name.trim(),
      animalType,
      age: Number(age) || 1,
      lastStatus: 'unscanned',
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<CattleDoc>('cattle').insertOne(doc);
    return NextResponse.json({ cattle: { id: result.insertedId.toString(), ...doc } }, { status: 201 });
  } catch (e: any) {
    console.error('[cattle POST]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const db = await getDb();
    const cattle = await db.collection<CattleDoc>('cattle').findOne({ _id: new ObjectId(id) });
    if (!cattle) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    // Only the owning farmer or an admin can delete this record.
    if (session.role !== 'admin' && cattle.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await db.collection<CattleDoc>('cattle').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[cattle DELETE]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
