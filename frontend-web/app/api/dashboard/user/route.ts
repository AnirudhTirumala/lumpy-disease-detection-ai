import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, getGridFSBucket } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';
import type { ScanDoc, CaseDoc } from '@/lib/types';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Vercel Functions accept bodies up to 4.5 MB. Keeping this slightly lower
// gives a consistent, friendly validation error on both Vercel and Render.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

function mlPredictUrl() {
  const configuredUrl = process.env.ML_BACKEND_URL || 'http://127.0.0.1:5000';
  // Render Blueprints expose private services as "host:port". Node fetch
  // requires a scheme, while externally configured URLs already have one.
  const baseUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `http://${configuredUrl}`;
  return `${baseUrl.replace(/\/$/, '')}/predict`;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  // Farmers, doctors, and admins can all submit a scan (doctors/admins use
  // this for their own "AI Scan" tool, tagged under their own account).
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('image')) as File | null;
    const cattleId   = formData.get('cattleId')  as string | null;
    const cattleName = formData.get('cattleName') as string | null;
    const animalType = formData.get('animalType') as string | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Image must be a JPEG, PNG, or WEBP file.' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 4MB or smaller.' }, { status: 400 });
    }

    // farmerId is always the logged-in farmer — never trusted from the client.
    const farmerId = session.userId;

    const db = await getDb();

    // If a cattleId was provided, make sure it actually belongs to this farmer.
    if (cattleId && ObjectId.isValid(cattleId)) {
      const cattle = await db.collection('cattle').findOne({ _id: new ObjectId(cattleId) });
      if (!cattle || cattle.ownerId !== farmerId) {
        return NextResponse.json({ error: 'Cattle record not found.' }, { status: 404 });
      }
    }

    // ── Forward to Flask YOLO ─────────────────────────────────────────────────
    const flaskForm = new FormData();
    flaskForm.append('image', file);

    let predictions: Array<{ label: string; confidence: number }> = [];
    try {
      const flaskRes = await fetch(mlPredictUrl(), {
        method: 'POST',
        body: flaskForm,
        signal: AbortSignal.timeout(55_000),
      });
      if (flaskRes.ok) {
        const aiResult = await flaskRes.json();
        predictions = aiResult.prediction || [];
      } else {
        return NextResponse.json({ error: 'AI backend error.' }, { status: 502 });
      }
    } catch {
      return NextResponse.json({ error: 'AI scan service is temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    if (predictions.length === 0)
      return NextResponse.json({ error: 'No prediction returned from AI model.' }, { status: 500 });

    const normPredictions = predictions.map(p => ({
      ...p,
      label: p.label.toLowerCase().includes('lumpy') ? 'lumpy' : 'healthy',
    }));

    const top = normPredictions.sort((a, b) => b.confidence - a.confidence)[0];
    const result: 'healthy' | 'lumpy' = top.label === 'lumpy' ? 'lumpy' : 'healthy';
    const confidence = top.confidence;

    // ── Save to MongoDB ───────────────────────────────────────────────────────
    if (cattleId) {
      try {
        const bucket = await getGridFSBucket();
        const now = new Date();

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadStream = bucket.openUploadStream(file.name || 'scan.jpg', {
          metadata: { farmerId, cattleId, contentType: file.type || 'image/jpeg' },
        });
        await new Promise<void>((resolve, reject) => {
          uploadStream.on('finish', resolve); uploadStream.on('error', reject);
          uploadStream.write(buffer); uploadStream.end();
        });

        const scanDoc: ScanDoc = {
          farmerId, cattleId,
          cattleName: cattleName || '',
          animalType: animalType || 'Cattle',
          imageFileId: uploadStream.id.toString(),
          result,
          confidence: Math.round(confidence * 100),
          rawPredictions: normPredictions,
          reviewedByDoctor: false,
          createdAt: now,
        };

        const scanResult = await db.collection<ScanDoc>('scans').insertOne(scanDoc);
        const scanId = scanResult.insertedId.toString();

        if (ObjectId.isValid(cattleId)) {
          await db.collection('cattle').updateOne(
            { _id: new ObjectId(cattleId) },
            { $set: { lastStatus: result, lastScanDate: now, updatedAt: now } },
          );
        }

        const farmerDoc = await db.collection('users').findOne({ _id: new ObjectId(farmerId) });

        const severity: CaseDoc['severity'] = result === 'lumpy'
          ? (confidence >= 0.85 ? 'High' : confidence >= 0.65 ? 'Medium' : 'Low')
          : 'Low';

        await db.collection<CaseDoc>('cases').insertOne({
          scanId,
          farmerId,
          farmerName: farmerDoc?.name || 'Unknown Farmer',
          cattleId,
          cattleName: cattleName || '',
          animalType: animalType || 'Cattle',
          confidence: Math.round(confidence * 100),
          severity,
          status: 'Pending',
          createdAt: now,
          updatedAt: now,
        });

        const doctors = await db.collection('users').find({ role: 'doctor', status: 'active' }).toArray();
        if (doctors.length > 0) {
          await db.collection('notifications').insertMany(doctors.map(d => ({
            userId: d._id!.toString(),
            title: result === 'lumpy' ? '🔴 Lumpy case detected' : '🟢 New scan for review',
            body: `${farmerDoc?.name || 'A farmer'}'s ${animalType || 'cattle'} "${cattleName}" — ${result} at ${Math.round(confidence * 100)}% confidence.`,
            type: 'case',
            read: false,
            createdAt: now,
          })));
        }

        await db.collection('notifications').insertOne({
          userId: farmerId,
          title: result === 'lumpy' ? '⚠️ Lumpy skin detected' : '✅ Scan complete — Healthy',
          body: result === 'lumpy'
            ? `${cattleName} flagged at ${Math.round(confidence * 100)}% confidence. Case sent to vet.`
            : `${cattleName} looks healthy (${Math.round(confidence * 100)}%). Sent to vet for confirmation.`,
          type: 'scan',
          read: false,
          createdAt: now,
        });
      } catch (dbErr) {
        console.error('[scan db save]', dbErr);
      }
    }

    return NextResponse.json({ success: true, predictions: normPredictions });

  } catch (error: any) {
    console.error('[dashboard/user POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
