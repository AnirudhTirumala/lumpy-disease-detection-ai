import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';
import type { ScanDoc } from '@/lib/types';

export async function GET(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const requestedFarmerId = searchParams.get('farmerId');
  const all = searchParams.get('all'); // doctor/admin view across all farmers

  // Only doctors/admins may request the full "all" view. Farmers are always
  // locked to their own scans regardless of what farmerId is in the URL.
  let query: any;
  if (session.role === 'user') {
    query = { farmerId: session.userId };
  } else if (all) {
    query = {};
  } else if (requestedFarmerId) {
    query = { farmerId: requestedFarmerId };
  } else {
    return NextResponse.json({ error: 'farmerId or all required.' }, { status: 400 });
  }

  const db = await getDb();
  const scans = await db.collection<ScanDoc>('scans')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    scans: scans.map(s => ({
      id: s._id!.toString(),
      farmerId: s.farmerId,
      cattleId: s.cattleId,
      cattleName: s.cattleName,
      animalType: s.animalType,
      imageUrl: s.imageFileId ? `/api/images/${s.imageFileId}` : null,
      result: s.result,
      confidence: s.confidence,
      reviewedByDoctor: s.reviewedByDoctor,
      doctorNotes: s.doctorNotes,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
