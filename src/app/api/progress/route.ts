import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import {
  EMPTY_PROGRESS,
  isProgressState,
  mergeProgress,
} from "@/lib/progressState";

const sql = neon(process.env.DATABASE_URL!);

let tableReady: Promise<unknown> | null = null;
function ensureTable() {
  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  return tableReady;
}

async function requireUser(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function GET() {
  const userId = await requireUser();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  await ensureTable();
  const rows = await sql`SELECT data FROM progress WHERE user_id = ${userId}`;
  return Response.json(rows[0]?.data ?? EMPTY_PROGRESS);
}

export async function PUT(req: Request) {
  const userId = await requireUser();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  let incoming: unknown;
  try {
    incoming = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!isProgressState(incoming)) {
    return Response.json({ error: "invalid progress state" }, { status: 400 });
  }
  if (JSON.stringify(incoming).length > 1_000_000) {
    return Response.json({ error: "too large" }, { status: 413 });
  }
  await ensureTable();
  // merge with stored state so concurrent devices never clobber each other
  const rows = await sql`SELECT data FROM progress WHERE user_id = ${userId}`;
  const stored = rows[0]?.data;
  const merged = isProgressState(stored)
    ? mergeProgress(stored, incoming)
    : incoming;
  await sql`
    INSERT INTO progress (user_id, data, updated_at)
    VALUES (${userId}, ${JSON.stringify(merged)}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
  return Response.json(merged);
}

export async function DELETE() {
  const userId = await requireUser();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  await ensureTable();
  await sql`DELETE FROM progress WHERE user_id = ${userId}`;
  return Response.json(EMPTY_PROGRESS);
}
