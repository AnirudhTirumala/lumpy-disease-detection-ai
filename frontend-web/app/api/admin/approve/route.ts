import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { sendDoctorApprovalEmail } from '@/lib/email';
import { requireRole } from '@/lib/requireAuth';
import type { UserDoc } from '@/lib/types';

// GET /api/admin/approve  → list all pending doctors  (admin only)
export async function GET() {
  const session = requireRole('admin');
  if (session instanceof NextResponse) return session;

  try {
    const db = await getDb();
    const doctors = await db.collection<UserDoc>('users')
      .find({ role: 'doctor', status: { $in: ['pending_approval', 'active', 'rejected'] } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      doctors: doctors.map(d => ({
        id: d._id!.toString(),
        name: d.name,
        email: d.email,
        status: d.status,
        specialization: d.specialization,
        licenseNumber: d.licenseNumber,
        createdAt: d.createdAt,
      })),
    });
  } catch (e: any) {
    console.error('[admin approve GET]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// POST /api/admin/approve  → approve or reject doctor  (admin only)
export async function POST(request: Request) {
  const session = requireRole('admin');
  if (session instanceof NextResponse) return session;

  try {
    const { doctorId, action } = await request.json(); // action: 'approve' | 'reject'
    if (!doctorId || !action)
      return NextResponse.json({ error: 'doctorId and action required.' }, { status: 400 });
    if (!ObjectId.isValid(doctorId))
      return NextResponse.json({ error: 'Invalid doctorId.' }, { status: 400 });
    if (action !== 'approve' && action !== 'reject')
      return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });

    const db = await getDb();
    const newStatus = action === 'approve' ? 'active' : 'rejected';

    const doctor = await db.collection<UserDoc>('users').findOneAndUpdate(
      { _id: new ObjectId(doctorId), role: 'doctor' },
      { $set: { status: newStatus, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );

    if (!doctor)
      return NextResponse.json({ error: 'Doctor not found.' }, { status: 404 });

    await sendDoctorApprovalEmail(doctor.email, doctor.name, action === 'approve');

    await db.collection('notifications').insertOne({
      userId: doctorId,
      title: action === 'approve' ? 'Account approved!' : 'Account not approved',
      body: action === 'approve'
        ? 'Your veterinarian account has been approved. You can now log in.'
        : 'Your account was not approved. Please contact support.',
      type: 'system',
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (e: any) {
    console.error('[approve]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
