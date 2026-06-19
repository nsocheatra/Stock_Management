import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function GET() {
  const streams = await db.prepare("SELECT * FROM livestreams ORDER BY created_at DESC").all();
  return NextResponse.json(streams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, facebook_page_id, scheduled_at } = body;
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  const result = await db.prepare(`
    INSERT INTO livestreams (title, description, facebook_page_id, status, scheduled_at)
    VALUES (?, ?, ?, 'draft', ?)
  `).run(title, description || null, facebook_page_id || null, scheduled_at || null);
  revalidatePath("/livestream");
  return NextResponse.json({ id: result.lastInsertRowid });
}
