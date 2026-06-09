import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// RETIRED. The hourly sync used to pull the crew X list from twitterapi.io and
// merge it into KV. That cron has been killed to stop draining API usage — the
// ship now just shows the frozen timeline already stored in KV (see
// lib/members.ts → getLiveCrew). This endpoint is intentionally a no-op so any
// lingering scheduler or manual hit can never trigger another upstream fetch.
export async function GET() {
  return NextResponse.json(
    { ok: false, retired: true, message: 'Post sync is disabled; the timeline is served frozen from KV.' },
    { status: 410 },
  );
}
