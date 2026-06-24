import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { error } = await requireApiPermission("livestream.manage");
  if (error) return error;

  const { liveVideoId, pageId, accessToken } = await req.json();
  if (!accessToken) return NextResponse.json({ error: "accessToken required" }, { status: 400 });

  const endpoint = liveVideoId
    ? `https://graph.facebook.com/v22.0/${liveVideoId}/comments?fields=message,from{name,id},created_time,id&access_token=${accessToken}&limit=100&order=reverse_chronological`
    : pageId
      ? `https://graph.facebook.com/v22.0/${pageId}/feed?fields=comments{message,from{name,id},created_time,id}&access_token=${accessToken}&limit=10`
      : null;

  if (!endpoint) return NextResponse.json({ error: "liveVideoId or pageId required" }, { status: 400 });

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    let comments: Array<{ id: string; message: string; customer_name: string; customer_id: string; created_time: string }> = [];

    if (liveVideoId) {
      comments = (data.data || []).map((c: any) => ({
        id: c.id,
        message: c.message,
        customer_name: c.from?.name || "Facebook User",
        customer_id: c.from?.id,
        created_time: c.created_time,
      }));
    } else {
      (data.data || []).forEach((post: any) => {
        if (post.comments?.data) {
          post.comments.data.forEach((c: any) => {
            comments.push({
              id: c.id,
              message: c.message,
              customer_name: c.from?.name || "Facebook User",
              customer_id: c.from?.id,
              created_time: c.created_time,
            });
          });
        }
      });
    }

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}
