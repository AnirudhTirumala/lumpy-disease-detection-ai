import { NextResponse } from 'next/server';
import { ObjectId, GridFSBucket } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';

// NOTE: this is a pragmatic middle ground, not full per-file ACLs. It
// requires a logged-in session before serving ANY stored file, which stops
// anonymous scraping of profile pictures, chat attachments, scan images, and
// doctor verification documents. It does not yet check "is this specific
// chat image one you're a participant in" — that needs the file's metadata
// (threadId/farmerId/etc, already stored at upload time) matched against
// the session. Flagging that as a good next hardening step.
export async function GET(_req: Request, { params }: { params: { fileId: string } }) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    if (!ObjectId.isValid(params.fileId)) {
      return NextResponse.json({ error: 'Invalid file id.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'lumpydb');
    const fileId = new ObjectId(params.fileId);

    for (const bucketName of ['uploads', 'chat_files', 'profile_images', 'doctor_docs']) {
      const bucket = new GridFSBucket(db, { bucketName });
      const files = await bucket.find({ _id: fileId }).toArray();
      if (files.length === 0) continue;

      // New MongoDB driver types store our application MIME type in metadata;
      // retain the legacy field fallback for files uploaded by earlier builds.
      const contentType = (files[0] as any).contentType
        || (files[0].metadata as { contentType?: string } | undefined)?.contentType
        || 'application/octet-stream';
      const chunks: Buffer[] = [];
      const stream = bucket.openDownloadStream(fileId);

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      return new Response(Buffer.concat(chunks), {
        headers: {
          'Content-Type': contentType,
          // Force download rather than inline render for non-image types,
          // which prevents a maliciously-typed upload from executing as
          // HTML/script in the browser.
          'Content-Disposition': contentType.startsWith('image/') ? 'inline' : 'attachment',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  } catch (e: any) {
    console.error('[images GET]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
