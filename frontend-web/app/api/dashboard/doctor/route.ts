import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireRole } from '@/lib/requireAuth';
import type { CaseDoc, MessageDoc } from '@/lib/types';

export async function GET() {
  const session = requireRole(['doctor', 'admin']);
  if (session instanceof NextResponse) return session;

  try {
    const db = await getDb();
    const cases = await db.collection<CaseDoc>('cases')
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const enriched = await Promise.all(cases.map(async c => {
      let imageUrl: string | null = null;
      let farmerLocation: string | null = null;

      if (c.scanId && ObjectId.isValid(c.scanId)) {
        const scan = await db.collection('scans').findOne({ _id: new ObjectId(c.scanId) });
        if (scan?.imageFileId) imageUrl = `/api/images/${scan.imageFileId}`;
      }

      if (c.farmerId && ObjectId.isValid(c.farmerId)) {
        const farmer = await db.collection('users').findOne({ _id: new ObjectId(c.farmerId) });
        farmerLocation = farmer?.location || null;
      }

      return {
        id: c._id!.toString(),
        scanId: c.scanId,
        farmer: c.farmerName,
        farmerId: c.farmerId,
        farmerLocation,
        cattle: c.cattleName,
        animalType: c.animalType,
        submitted: c.createdAt.toISOString(),
        confidence: c.confidence,
        severity: c.severity,
        status: c.status,
        result: c.confidence >= 50 ? (
          c.severity === 'Low' && c.confidence < 60 ? 'healthy' : 'lumpy'
        ) : 'healthy',
        doctorNotes: c.doctorNotes,
        flagged: (c as any).flagged || false,
        treatmentNotes: (c as any).treatmentNotes || '',
        imageUrl,
      };
    }));

    const open     = cases.filter(c => c.status === 'Pending').length;
    const underRev = cases.filter(c => c.status === 'Under Review').length;
    const high     = cases.filter(c => c.severity === 'High').length;
    const resolved = cases.filter(c => c.status === 'Reviewed' || c.status === 'Closed').length;

    return NextResponse.json({
      stats: { open, underReview: underRev, high, resolved },
      cases: enriched,
    });
  } catch (e: any) {
    console.error('[doctor GET]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = requireRole(['doctor', 'admin']);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { id, status, doctorNotes, flagged, treatmentNotes } = body;
    if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    // doctorId always comes from the session — a vet can no longer attribute
    // a review to a different doctor.
    const doctorId = session.userId;

    const db = await getDb();
    const updateFields: any = { updatedAt: new Date() };
    if (status)         updateFields.status = status;
    updateFields.assignedDoctorId = doctorId;
    if (doctorNotes !== undefined) updateFields.doctorNotes = doctorNotes;
    if (flagged !== undefined)     updateFields.flagged = flagged;
    if (treatmentNotes !== undefined) updateFields.treatmentNotes = treatmentNotes;

    await db.collection<CaseDoc>('cases').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields },
    );

    const caseDoc = await db.collection<CaseDoc>('cases').findOne({ _id: new ObjectId(id) });

    if ((status === 'Reviewed' || status === 'Closed') && caseDoc?.scanId && ObjectId.isValid(caseDoc.scanId)) {
      await db.collection('scans').updateOne(
        { _id: new ObjectId(caseDoc.scanId) },
        { $set: { reviewedByDoctor: true, reviewedBy: doctorId, doctorNotes } },
      );
    }

    if (caseDoc?.farmerId && (status || doctorNotes)) {
      const doctor = await db.collection('users').findOne({ _id: new ObjectId(doctorId) });

      let notifTitle = '';
      let notifBody = '';

      if (status === 'Reviewed') {
        notifTitle = '✅ Case reviewed by vet';
        notifBody = `Dr. ${doctor?.name || 'Veterinarian'} reviewed your case for ${caseDoc.cattleName}. Check your reports for notes.`;
      } else if (status === 'Under Review') {
        notifTitle = '🔄 Case under treatment';
        notifBody = `Dr. ${doctor?.name || 'Veterinarian'} is treating ${caseDoc.cattleName}. Updates will appear in your reports.`;
      } else if (status === 'Closed') {
        notifTitle = '🔒 Case closed';
        notifBody = `Your case for ${caseDoc.cattleName} has been closed by Dr. ${doctor?.name || 'Veterinarian'}.`;
      } else if (doctorNotes) {
        notifTitle = '📋 Doctor added notes';
        notifBody = `Dr. ${doctor?.name || 'Veterinarian'} added notes for ${caseDoc.cattleName}: "${doctorNotes.slice(0, 80)}"`;
      }

      if (notifTitle) {
        await db.collection('notifications').insertOne({
          userId: caseDoc.farmerId,
          title: notifTitle,
          body: notifBody,
          type: 'case',
          read: false,
          createdAt: new Date(),
        });
      }

      if ((status === 'Reviewed' || status === 'Closed') && doctorNotes) {
        const threadId = [caseDoc.farmerId, doctorId].sort().join('_');
        const now = new Date();
        const msg: MessageDoc = {
          threadId,
          farmerId: caseDoc.farmerId,
          doctorId,
          sender: 'doctor',
          senderId: doctorId,
          senderName: doctor?.name || 'Veterinarian',
          type: 'text',
          text: `📋 Case Review for ${caseDoc.cattleName}: ${doctorNotes}`,
          readBy: [doctorId],
          deliveredTo: [doctorId],
          createdAt: now,
        };
        await db.collection<MessageDoc>('messages').insertOne(msg);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[doctor PATCH]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
