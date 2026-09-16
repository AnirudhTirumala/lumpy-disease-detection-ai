import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireRole } from '@/lib/requireAuth';

export async function GET() {
  const session = requireRole('admin');
  if (session instanceof NextResponse) return session;

  try {
    const db = await getDb();

    const [
      activeFarmers, activeDoctors, pendingDoctors,
      totalScans, totalDetections, monthly,
    ] = await Promise.all([
      db.collection('users').countDocuments({ role: 'user', status: 'active' }),
      db.collection('users').countDocuments({ role: 'doctor', status: 'active' }),
      db.collection('users').countDocuments({ role: 'doctor', status: 'pending_approval' }),
      db.collection('scans').countDocuments(),
      db.collection('scans').countDocuments({ result: 'lumpy' }),
      db.collection('scans').aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            scans: { $sum: 1 },
            detections: { $sum: { $cond: [{ $eq: ['$result', 'lumpy'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 6 },
      ]).toArray(),
    ]);

    return NextResponse.json({
      activeFarmers,
      activeDoctors,
      totalUsers: activeFarmers + activeDoctors,
      pendingDoctors,
      totalScans,
      totalDetections,
      monthly: monthly.map(m => ({
        month: m._id,
        scans: m.scans,
        detections: m.detections,
      })),
    });
  } catch (e: any) {
    console.error('[admin stats]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
