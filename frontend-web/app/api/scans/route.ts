import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';
import type { ScanDoc } from '@/lib/types';

export async function GET(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const requestedFarmerId = searchParams.get('farmerId');
  const all = searchParams.get('all'); // doctor/admin view across all farmers
  const includeFarmer = searchParams.get('includeFarmer') === '1';

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

  // Doctors and admins can view all returned records; farmers can only view
  // their own. Add display/location data with one batched lookup when the
  // caller is authorised for it, instead of sending the client to the
  // admin-only users endpoint once per screen (or per row).
  const farmerDetails = new Map<string, { name?: string; location?: string }>();
  if (session.role !== 'user' || includeFarmer) {
    const farmerIds = Array.from(new Set(scans.map((scan) => scan.farmerId)))
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    if (farmerIds.length > 0) {
      const farmers = await db.collection('users').find(
        { _id: { $in: farmerIds } },
        { projection: { name: 1, location: 1 } },
      ).toArray();
      farmers.forEach((farmer) => farmerDetails.set(farmer._id.toString(), {
        name: farmer.name,
        location: farmer.location,
      }));
    }
  }

  return NextResponse.json({
    scans: scans.map(s => ({
      id: s._id!.toString(),
      farmerId: s.farmerId,
      cattleId: s.cattleId,
      cattleName: s.cattleName,
      animalType: s.animalType,
      farmerName: farmerDetails.get(s.farmerId)?.name,
      farmerLocation: farmerDetails.get(s.farmerId)?.location,
      imageUrl: s.imageFileId ? `/api/images/${s.imageFileId}` : null,
      result: s.result,
      confidence: s.confidence,
      reviewedByDoctor: s.reviewedByDoctor,
      doctorNotes: s.doctorNotes,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
