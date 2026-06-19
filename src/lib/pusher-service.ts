import Pusher from "pusher";

const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "ap1",
  useTLS: true,
});

export async function broadcastEvent(channel: string, event: string, data: unknown) {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (e) {
    console.error("Pusher broadcast failed:", e);
  }
}

export function getPusherKey() {
  return process.env.PUSHER_KEY || "";
}

export function getPusherCluster() {
  return process.env.PUSHER_CLUSTER || "ap1";
}
