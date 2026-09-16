import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireRole } from '@/lib/requireAuth';

// DELETE /api/admin/remove  → admin removes a user or doctor  (admin only)
export async function DELETE(request: Request) {
  const session = requireRole('admin');
  if (session instanceof NextResponse) return session;

  try {
    const { userId, permanent } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required.' }, { status: 400 });
    if (!ObjectId.isValid(userId)) return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 });

    const db = await getDb();

    const target = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (target.role === 'admin') return NextResponse.json({ error: 'Cannot remove admin accounts.' }, { status: 403 });

    if (permanent) {
      await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    } else {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { status: 'removed', removedAt: new Date(), updatedAt: new Date() } },
      );
    }

    if (!permanent) {
      await db.collection('notifications').insertOne({
        userId,
        title: 'Account suspended',
        body: 'Your account has been suspended by an administrator. Contact support at cow@lumpy.ai.',
        type: 'system',
        read: false,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[admin remove]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
