import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

function enabled(): boolean {
  return Boolean(process.env.MONGODB_URL);
}

async function db() {
  if (!enabled()) return null;
  client ??= new MongoClient(process.env.MONGODB_URL as string, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  return client.db();
}

export async function mongoHealth(): Promise<'PASS' | 'SKIPPED' | 'FAIL'> {
  if (!enabled()) return 'SKIPPED';
  try {
    const database = await db();
    await database?.command({ ping: 1 });
    return 'PASS';
  } catch {
    return 'FAIL';
  }
}

export async function persistRun(run: Record<string, unknown>): Promise<void> {
  try {
    const database = await db();
    if (!database) return;
    await database.collection('qa_runs').updateOne({ startedAt: run.startedAt }, { $set: { ...run, updatedAt: new Date().toISOString() } }, { upsert: true });
  } catch {
    client = null;
  }
}

export async function persistSheetSnapshot(profile: Record<string, unknown>): Promise<void> {
  try {
    const database = await db();
    if (!database) return;
    await database.collection('sheet_snapshots').insertOne({ ...profile, capturedAt: new Date().toISOString() });
  } catch {
    client = null;
  }
}
