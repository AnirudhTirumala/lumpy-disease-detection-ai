import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/** Used by Render to verify the application and its required database are ready. */
export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[health]', error);
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
