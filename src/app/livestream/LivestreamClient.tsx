"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Radio, ShoppingBag, Package, Search, Eye, MessageSquare, DollarSign,
  TrendingUp, Truck, Settings, X, Plus, Play, Square,
  Clock, Hash, User, Phone, MapPin,
  Check, RefreshCw,
  Trash2, MoreHorizontal,
  Zap, Activity,
} from "lucide-react";
import {
  deleteKeyword, simulateOrder,
  createLivestream, startLivestream, endLivestream, deleteLivestream,
  addLiveProduct, deleteLiveProduct,
  createOrderFromComment, updateOrderStatus,
  ignoreComment,
} from "@/lib/actions";
import { getPusherKey, getPusherCluster } from "@/lib/pusher-service";

type Product = { id: number; name: string; selling_price: number | null; price: number; quantity: number; image_url: string | null; sku: string };
type Keyword = { id: number; keyword: string; product_id: number; quantity: number; product_name: string; selling_price: number | null; price: number };
type LiveStream = { id: number; title: string; description: string | null; facebook_page_id: string | null; status: string; scheduled_at: string | null; started_at: string | null; ended_at: string | null; viewer_count: number; comment_count: number; order_count: number; revenue: number; created_at: string };
type LiveProduct = { id: number; livestream_id: number; product_id: number; keyword: string; price_override: number | null; max_quantity: number | null; priority: number; reserve_stock: number; product_name: string; product_sku: string; product_price: number; product_image: string | null; stock: number; sold: number };
type LiveComment = { id: number; livestream_id: number; facebook_comment_id: string; customer_name: string; customer_avatar: string | null; customer_id: string; message: string; detected_keyword: string | null; detected_quantity: number; matched_product_id: number | null; matched_product_name: string | null; status: string; created_at: string };
type LiveOrder = { id: number; livestream_id: number; order_number: string; customer_name: string; customer_phone: string | null; customer_address: string | null; facebook_comment_id: string | null; total: number; status: string; driver_id: number | null; driver_name: string | null; notes: string | null; created_at: string; updated_at: string; items?: LiveOrderItem[] };
type LiveOrderItem = { id: number; order_id: number; product_id: number; product_name: string; quantity: number; price: number; total: number };

type Tab = "control" | "products" | "comments" | "orders" | "delivery" | "settings";

// Keyword detection engine
function detectKeyword(message: string, keywords: { keyword: string; product_name: string; product_id: number; max_quantity: number | null }[]): { keyword: string | null; quantity: number; product_id: number | null; product_name: string | null } {
  const lower = message.toLowerCase();
  for (const k of keywords.sort((a, b) => b.keyword.length - a.keyword.length)) {
    const kw = k.keyword.toLowerCase();
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      const after = message.slice(idx + kw.length).trim();
      const qtyMatch = after.match(/^(?:x|\s*)(\d+)/);
      let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      if (k.max_quantity && qty > k.max_quantity) qty = k.max_quantity;
      return { keyword: k.keyword, quantity: qty, product_id: k.product_id, product_name: k.product_name };
    }
  }
  return { keyword: null, quantity: 1, product_id: null, product_name: null };
}

function formatCurrency(n: number) { return "$" + n.toFixed(2); }
function timeAgo(dateStr: string) {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  live: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ended: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  matched: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ordered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ignored: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  packed: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  delivery: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function LivestreamClient({
  products, keywords: fbKeywords,
  fbPageUrl, fbPageName, fbPageId, fbAccessToken, fbAppId,
  livestreams: initialStreams, drivers: initialDrivers,
}: {
  products: Product[]; keywords: Keyword[];
  fbPageUrl: string; fbPageName: string; fbPageId: string; fbAccessToken: string; fbAppId: string;
  livestreams: LiveStream[]; drivers: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("control");
  const [mobileMenu, setMobileMenu] = useState(false);

  // Data state
  const [streams, setStreams] = useState<LiveStream[]>(initialStreams);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [liveProducts, setLiveProducts] = useState<LiveProduct[]>([]);
  const [drivers] = useState<{ id: number; name: string }[]>(initialDrivers);
  const [loading] = useState(false);

  // Selected live stream
  const [activeStreamId, setActiveStreamId] = useState<number | null>(null);
  const activeStream = useMemo(() => streams.find((s) => s.id === activeStreamId) || streams[0] || null, [streams, activeStreamId]);

  // Load data for active stream
  const loadStreamData = useCallback(async (streamId: number) => {
    try {
      const res = await fetch(`/api/livestream/${streamId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setLiveOrders(data.orders || []);
        setLiveProducts(data.products || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeStream) {
      loadStreamData(activeStream.id);
      setActiveStreamId(activeStream.id);
    }
  }, [activeStream, loadStreamData]);

  // Pusher realtime
  useEffect(() => {
    if (!activeStreamId || activeStream?.status !== "live") return;
    let pusherClient: any = null;
    import("pusher-js").then(({ default: PusherClient }) => {
      pusherClient = new PusherClient(getPusherKey(), { cluster: getPusherCluster() });
      const channel = pusherClient.subscribe(`live-${activeStreamId}`);
      channel.bind("new_comment", (data: any) => {
        setComments((prev) => [data.comment, ...prev].slice(0, 200));
      });
      channel.bind("new_order", (data: any) => {
        setLiveOrders((prev) => [data.order, ...prev]);
      });
      channel.bind("order_updated", (data: any) => {
        setLiveOrders((prev) => prev.map((o) => o.id === data.order.id ? { ...o, ...data.order } : o));
      });
      channel.bind("viewer_updated", (data: any) => {
        setStreams((prev) => prev.map((s) => s.id === activeStreamId ? { ...s, viewer_count: data.count } : s));
      });
    }).catch(() => {});
    return () => { if (pusherClient) pusherClient.disconnect(); };
  }, [activeStreamId, activeStream?.status]);

  // Current time (updated every 30s) for stats calculations
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);

  // Stats
  const stats = useMemo(() => {
    if (!activeStream) return { viewers: 0, comments: 0, orders: 0, revenue: 0, conversion: 0, topProduct: null as string | null, opm: 0 };
    const recentOrders = liveOrders.filter((o) => new Date(o.created_at).getTime() > now - 3600000);
    const topProduct = liveOrders.length > 0 ? [...liveOrders].sort((a, b) => b.total - a.total)[0]?.items?.[0]?.product_name || null : null;
    return {
      viewers: activeStream.viewer_count,
      comments: activeStream.comment_count,
      orders: activeStream.order_count,
      revenue: activeStream.revenue,
      conversion: activeStream.viewer_count > 0 ? ((activeStream.order_count / activeStream.viewer_count) * 100) : 0,
      topProduct,
      opm: recentOrders.length > 0 ? recentOrders.length / 60 : 0,
    };
  }, [activeStream, liveOrders, now]);

  // Create Live Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createScheduled, setCreateScheduled] = useState("");

  const handleCreateLive = async () => {
    if (!createTitle.trim()) return;
    const fd = new FormData();
    fd.set("title", createTitle);
    fd.set("description", createDesc);
    fd.set("facebook_page_id", fbPageId || "");
    fd.set("scheduled_at", createScheduled);
    await createLivestream(fd);
    setShowCreateModal(false);
    setCreateTitle(""); setCreateDesc(""); setCreateScheduled("");
    router.refresh();
  };

  // Product keyword modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [pkProductId, setPkProductId] = useState("");
  const [pkKeyword, setPkKeyword] = useState("");
  const [pkPriceOverride, setPkPriceOverride] = useState("");
  const [pkMaxQty, setPkMaxQty] = useState("");

  const handleAddProduct = async () => {
    if (!activeStream || !pkProductId || !pkKeyword.trim()) return;
    const fd = new FormData();
    fd.set("livestream_id", String(activeStream.id));
    fd.set("product_id", pkProductId);
    fd.set("keyword", pkKeyword.trim().toUpperCase());
    fd.set("price_override", pkPriceOverride);
    fd.set("max_quantity", pkMaxQty);
    fd.set("priority", "0");
    const res = await addLiveProduct(fd);
    if (res?.error) alert(res.error);
    else {
      setShowProductModal(false);
      setPkProductId(""); setPkKeyword(""); setPkPriceOverride(""); setPkMaxQty("");
      if (activeStream) loadStreamData(activeStream.id);
    }
  };

  // Simulate comment
  const [simComment, setSimComment] = useState("");
  const [simName, setSimName] = useState("");

  const handleSimulate = async () => {
    if (!activeStream || !simComment.trim()) return;
    const fd = new FormData();
    fd.set("keyword", simComment.trim());
    fd.set("customerName", simName.trim() || "Test User");
    const res = await simulateOrder(fd);
    if (res?.error) {
      // Try as live comment
      try {
        await fetch("/api/livestream/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            livestream_id: activeStream.id,
            facebook_comment_id: `sim-${Date.now()}`,
            customer_name: simName.trim() || "Test User",
            customer_id: `test-${Date.now()}`,
            message: simComment.trim(),
          }),
        });
      } catch {}
    }
    setSimComment(""); setSimName("");
    if (activeStream) loadStreamData(activeStream.id);
    router.refresh();
  };

  // Create order from comment
  const handleCreateOrder = async (commentId: number) => {
    const fd = new FormData();
    fd.set("comment_id", String(commentId));
    const res = await createOrderFromComment(fd);
    if (res?.error) alert(res.error);
    else if (activeStream) loadStreamData(activeStream.id);
  };

  // Order status update
  const handleUpdateOrder = async (orderId: number, status: string) => {
    const fd = new FormData();
    fd.set("id", String(orderId));
    fd.set("status", status);
    await updateOrderStatus(fd);
    if (activeStream) loadStreamData(activeStream.id);
    router.refresh();
  };

  // Order detail drawer
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);

  // Comment keyword detection preview
  const detectedKeyword = useMemo(() => {
    if (!simComment.trim()) return null;
    const kws = liveProducts.map((p) => ({ keyword: p.keyword, product_name: p.product_name, product_id: p.product_id, max_quantity: p.max_quantity }));
    return detectKeyword(simComment, kws);
  }, [simComment, liveProducts]);

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "control", label: "Stream", icon: Radio },
    { id: "products", label: "Products", icon: Package, count: liveProducts.length },
    { id: "comments", label: "Comments", icon: MessageSquare, count: comments.filter((c) => c.status === "pending" || c.status === "matched").length },
    { id: "orders", label: "Orders", icon: ShoppingBag, count: liveOrders.filter((o) => o.status === "processing" || o.status === "packed").length },
    { id: "delivery", label: "Delivery", icon: Truck, count: liveOrders.filter((o) => o.status === "delivery").length },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-main)" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/20">
              <Radio className="size-6 text-rose-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Live Commerce</h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{activeStream?.title || "No active stream"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Stream selector */}
            <select
              value={activeStreamId || ""}
              onChange={(e) => setActiveStreamId(parseInt(e.target.value))}
              className="h-9 px-3 rounded-lg border text-xs outline-none"
              style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
            >
              {streams.map((s) => (
                <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
              ))}
            </select>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
              <Plus className="size-3.5" /> Create Live
            </button>
            <button onClick={() => { if (activeStream) loadStreamData(activeStream.id); }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs border cursor-pointer"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenu(!mobileMenu)}
              className="lg:hidden flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs border cursor-pointer"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
              {mobileMenu ? <X className="size-3.5" /> : <MoreHorizontal className="size-3.5" />}
            </button>
          </div>
        </div>
        {/* Stats bar */}
        {activeStream && activeStream.status === "live" && (
          <div className="flex items-center gap-4 px-4 lg:px-6 py-2 overflow-x-auto text-xs" style={{ backgroundColor: "var(--bg-main)", borderTop: "1px solid var(--border-color)" }}>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
            <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}><Eye className="size-3.5" /> {stats.viewers}</span>
            <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}><MessageSquare className="size-3.5" /> {stats.comments}</span>
            <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}><ShoppingBag className="size-3.5" /> {stats.orders}</span>
            <span className="flex items-center gap-1 font-medium text-emerald-400"><DollarSign className="size-3.5" /> {formatCurrency(stats.revenue)}</span>
            <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}><TrendingUp className="size-3.5" /> {stats.conversion.toFixed(1)}% conv</span>
          </div>
        )}
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:flex flex-col w-56 shrink-0 border-r min-h-[calc(100vh-4rem)] p-3 gap-1" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30 border border-transparent"
              }`}>
              <tab.icon className="size-4" />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab.id === "comments" ? "bg-amber-500/20 text-amber-400" :
                  tab.id === "orders" ? "bg-blue-500/20 text-blue-400" :
                  "bg-zinc-500/20 text-zinc-400"
                }`}>
                  {tab.count > 99 ? "99+" : tab.count}
                </span>
              )}
            </button>
          ))}

          {/* Stream actions */}
          {activeStream && (
            <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "var(--border-color)" }}>
              {activeStream.status === "draft" && (
                <button onClick={async () => { await startLivestream(activeStream.id); router.refresh(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer">
                  <Play className="size-4" /> Start Live
                </button>
              )}
              {activeStream.status === "live" && (
                <button onClick={async () => { await endLivestream(activeStream.id); router.refresh(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 transition-all cursor-pointer">
                  <Square className="size-4" /> End Live
                </button>
              )}
              {activeStream.status !== "live" && (
                <button onClick={async () => { await deleteLivestream(activeStream.id); router.refresh(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer">
                  <Trash2 className="size-4" /> Delete
                </button>
              )}
            </div>
          )}

          {/* Facebook page status */}
          {fbPageUrl && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: "var(--bg-main)" }}>
                <div className="size-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <svg className="size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{fbPageName || "Facebook Page"}</p>
                  <p className="text-emerald-400">Connected</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="lg:hidden fixed inset-0 z-20" onClick={() => setMobileMenu(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute left-0 top-16 bottom-0 w-64 p-3 space-y-1 overflow-y-auto" style={{ backgroundColor: "var(--bg-card)", borderRight: "1px solid var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}>
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                      : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30 border border-transparent"
                  }`}>
                  <tab.icon className="size-4" />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-4 lg:p-6 space-y-6">
          {!activeStream ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Radio className="size-16 mb-4 opacity-20" style={{ color: "var(--text-secondary)" }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>No Live Streams Yet</h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Create your first live stream to start selling</p>
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
                <Plus className="size-4" /> Create Live Stream
              </button>
            </div>
          ) : (
            <>
              {/* Tab: Stream Control */}
              {activeTab === "control" && (
                <div className="space-y-6">
                  {/* Stream Info Card */}
                  <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{activeStream.title}</h2>
                        {activeStream.description && <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{activeStream.description}</p>}
                        <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusColors[activeStream.status] || ""}`}>
                            {activeStream.status.toUpperCase()}
                          </span>
                          {activeStream.scheduled_at && <span><Clock className="size-3 inline mr-1" />Scheduled: {new Date(activeStream.scheduled_at).toLocaleString()}</span>}
                          {activeStream.started_at && <span><Play className="size-3 inline mr-1" />Started: {new Date(activeStream.started_at).toLocaleString()}</span>}
                          <span><Hash className="size-3 inline mr-1" />ID: {activeStream.id}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {activeStream.status === "draft" && (
                          <button onClick={async () => { await startLivestream(activeStream.id); router.refresh(); }}
                            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer">
                            <Play className="size-3.5" /> Start Live
                          </button>
                        )}
                        {activeStream.status === "live" && (
                          <button onClick={async () => { await endLivestream(activeStream.id); router.refresh(); }}
                            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 transition-all cursor-pointer">
                            <Square className="size-3.5" /> End Live
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: "Viewers", value: stats.viewers, icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
                      { label: "Comments", value: stats.comments, icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-500/10" },
                      { label: "Orders", value: stats.orders, icon: ShoppingBag, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                      { label: "Revenue", value: formatCurrency(stats.revenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                      { label: "Conversion", value: `${stats.conversion.toFixed(1)}%`, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
                      { label: "Orders/min", value: stats.opm.toFixed(2), icon: Activity, color: "text-rose-400", bg: "bg-rose-500/10" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                            <stat.icon className={`size-4 ${stat.color}`} />
                          </div>
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Simulate Comment */}
                  <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <MessageSquare className="size-4" /> Simulate Comment
                    </h3>
                    <div className="flex gap-3">
                      <input value={simName} onChange={(e) => setSimName(e.target.value)}
                        placeholder="Customer name" className="h-10 px-3 rounded-lg border text-sm outline-none w-40"
                        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                      <input value={simComment} onChange={(e) => setSimComment(e.target.value)}
                        placeholder='e.g. "A1 2" or "I want A1"' className="flex-1 h-10 px-3 rounded-lg border text-sm outline-none"
                        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                      <button onClick={handleSimulate}
                        className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer">
                        <Zap className="size-4" /> Simulate
                      </button>
                    </div>
                    {detectedKeyword && (
                      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <Search className="size-3.5" />
                        Detected: <strong className="text-rose-400">{detectedKeyword.keyword}</strong> → {detectedKeyword.product_name} x{detectedKeyword.quantity}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Products */}
              {activeTab === "products" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Live Selling Products</h2>
                    <button onClick={() => setShowProductModal(true)}
                      className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
                      <Plus className="size-3.5" /> Add Product
                    </button>
                  </div>

                  {liveProducts.length === 0 ? (
                    <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                      <Package className="size-8 mx-auto mb-2 opacity-30" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No products mapped</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Add products with keywords for this live stream</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: "var(--bg-card)" }}>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Keyword</th>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Product</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Price</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Stock</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Sold</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Max Qty</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveProducts.map((lp) => (
                            <tr key={lp.id} className="border-t" style={{ borderColor: "var(--border-color)" }}>
                              <td className="px-4 py-3">
                                <span className="font-bold text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  {lp.keyword}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {lp.product_image && (
                                    <img src={lp.product_image} alt="" className="size-8 rounded-lg object-cover" />
                                  )}
                                  <div>
                                    <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{lp.product_name}</p>
                                    <p className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{lp.product_sku}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--text-primary)" }}>
                                {lp.price_override ? formatCurrency(lp.price_override) : formatCurrency(lp.product_price)}
                              </td>
                              <td className="px-4 py-3 text-right" style={{ color: lp.stock < 5 ? "rgb(251, 113, 133)" : "var(--text-secondary)" }}>
                                {lp.stock}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-400">{lp.sold}</td>
                              <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{lp.max_quantity || "∞"}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={async () => { await deleteLiveProduct(lp.id); if (activeStream) loadStreamData(activeStream.id); }}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Comments */}
              {activeTab === "comments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Live Comments</h2>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{comments.length} total</span>
                  </div>

                  {comments.length === 0 ? (
                    <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                      <MessageSquare className="size-8 mx-auto mb-2 opacity-30" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No comments yet</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Comments from Facebook will appear here in realtime</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((c) => (
                        <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-gradient-to-br from-rose-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ color: "var(--text-primary)" }}>
                              {c.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{c.customer_name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColors[c.status] || ""}`}>
                                  {c.status}
                                </span>
                                <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{timeAgo(c.created_at)}</span>
                              </div>
                              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{c.message}</p>
                              {c.detected_keyword && (
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    {c.detected_keyword}
                                  </span>
                                  <span style={{ color: "var(--text-secondary)" }}>→</span>
                                  <span className="font-medium text-emerald-400">{c.matched_product_name}</span>
                                  <span style={{ color: "var(--text-secondary)" }}>x{c.detected_quantity}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {c.status === "matched" && (
                                <button onClick={() => handleCreateOrder(c.id)}
                                  className="flex items-center gap-1 px-3 h-7 rounded-lg text-[10px] font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all cursor-pointer">
                                  <ShoppingBag className="size-3" /> Order
                                </button>
                              )}
                              {c.status === "pending" || c.status === "matched" ? (
                                <button onClick={async () => { await ignoreComment(c.id); if (activeStream) loadStreamData(activeStream.id); }}
                                  className="flex items-center gap-1 px-3 h-7 rounded-lg text-[10px] font-medium text-zinc-400 border border-zinc-500/30 hover:bg-zinc-500/10 transition-all cursor-pointer">
                                  <X className="size-3" /> Ignore
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Orders */}
              {activeTab === "orders" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Incoming Orders</h2>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{liveOrders.length} total</span>
                  </div>

                  {liveOrders.length === 0 ? (
                    <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                      <ShoppingBag className="size-8 mx-auto mb-2 opacity-30" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No orders yet</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Orders from matched comments will appear here</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: "var(--bg-card)" }}>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Order</th>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Customer</th>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Items</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Total</th>
                            <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Status</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveOrders.map((o) => (
                            <tr key={o.id} className="border-t cursor-pointer hover:bg-zinc-800/20 transition-colors"
                              style={{ borderColor: "var(--border-color)" }}
                              onClick={() => setSelectedOrder(o)}>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs font-medium" style={{ color: "var(--text-primary)" }}>#{o.order_number}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{o.customer_name}</span>
                              </td>
                              <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                                {o.items?.map((i) => `${i.product_name} x${i.quantity}`).join(", ") || "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-400">{formatCurrency(o.total)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[o.status] || ""}`}>
                                  {o.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex gap-1 justify-end">
                                  {o.status === "processing" && (
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateOrder(o.id, "packed"); }}
                                      className="px-2.5 h-7 rounded-lg text-[10px] font-medium text-violet-400 border border-violet-500/30 hover:bg-violet-500/10 transition-all cursor-pointer">
                                      Pack
                                    </button>
                                  )}
                                  {o.status === "packed" && (
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateOrder(o.id, "delivery"); }}
                                      className="px-2.5 h-7 rounded-lg text-[10px] font-medium text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all cursor-pointer">
                                      Ship
                                    </button>
                                  )}
                                  {o.status === "delivery" && (
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateOrder(o.id, "completed"); }}
                                      className="px-2.5 h-7 rounded-lg text-[10px] font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all cursor-pointer">
                                      Complete
                                    </button>
                                  )}
                                  {(o.status === "processing" || o.status === "packed") && (
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateOrder(o.id, "cancelled"); }}
                                      className="px-2.5 h-7 rounded-lg text-[10px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer">
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Delivery */}
              {activeTab === "delivery" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Delivery Queue</h2>
                  {liveOrders.filter((o) => o.status === "packed" || o.status === "delivery").length === 0 ? (
                    <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                      <Truck className="size-8 mx-auto mb-2 opacity-30" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No orders in delivery</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Packed orders waiting for shipment will appear here</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: "var(--bg-card)" }}>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Order</th>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Customer</th>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Address</th>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Phone</th>
                            <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Status</th>
                            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Driver</th>
                            <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--text-secondary)" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveOrders.filter((o) => o.status === "packed" || o.status === "delivery").map((o) => (
                            <tr key={o.id} className="border-t" style={{ borderColor: "var(--border-color)" }}>
                              <td className="px-4 py-3 font-mono text-xs font-medium" style={{ color: "var(--text-primary)" }}>#{o.order_number}</td>
                              <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{o.customer_name}</td>
                              <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: "var(--text-secondary)" }}>{o.customer_address || "—"}</td>
                              <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{o.customer_phone || "—"}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[o.status] || ""}`}>
                                  {o.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={o.driver_id || ""}
                                  onChange={async (e) => {
                                    const fd = new FormData();
                                    fd.set("id", String(o.id));
                                    fd.set("status", o.status);
                                    fd.set("driver_id", e.target.value);
                                    await updateOrderStatus(fd);
                                    if (activeStream) loadStreamData(activeStream.id);
                                    router.refresh();
                                  }}
                                  className="h-7 px-2 rounded-lg border text-[10px] outline-none"
                                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}>
                                  <option value="">Unassigned</option>
                                  {drivers.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex gap-1 justify-end">
                                  {o.status === "packed" && (
                                    <button onClick={() => handleUpdateOrder(o.id, "delivery")}
                                      className="px-2.5 h-7 rounded-lg text-[10px] font-medium text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all cursor-pointer">
                                      Ship
                                    </button>
                                  )}
                                  {o.status === "delivery" && (
                                    <button onClick={() => handleUpdateOrder(o.id, "completed")}
                                      className="px-2.5 h-7 rounded-lg text-[10px] font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all cursor-pointer">
                                      ✓ Delivered
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Settings */}
              {activeTab === "settings" && (
                <div className="space-y-6 max-w-2xl">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Livestream Settings</h2>

                  {/* Facebook Connection */}
                  <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <svg className="size-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook Business
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Status</span>
                        <span className={fbPageUrl ? "text-emerald-400 font-medium" : "text-zinc-500"}>
                          {fbPageUrl ? "Connected" : "Not connected"}
                        </span>
                      </div>
                      {fbPageName && <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Page Name</span><span style={{ color: "var(--text-primary)" }}>{fbPageName}</span>
                      </div>}
                      {fbPageId && <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Page ID</span><span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{fbPageId}</span>
                      </div>}
                      {fbAppId && <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>App ID</span><span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{fbAppId}</span>
                      </div>}
                      {fbAccessToken && <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Token</span><span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>•••••{fbAccessToken.slice(-4)}</span>
                      </div>}
                    </div>
                  </div>

                  {/* Automation */}
                  <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <Zap className="size-4 text-amber-400" /> Automation
                    </h3>
                    <div className="space-y-3 text-sm">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-rose-500 size-4" />
                        <span style={{ color: "var(--text-primary)" }}>Auto-create orders from matched comments</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-rose-500 size-4" />
                        <span style={{ color: "var(--text-primary)" }}>Send Telegram notifications on new orders</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="accent-rose-500 size-4" />
                        <span style={{ color: "var(--text-primary)" }}>Reserve inventory when order is created</span>
                      </label>
                      <div className="pt-2">
                        <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Duplicate protection window (seconds)</label>
                        <input type="number" defaultValue={30} min={0} max={300}
                          className="w-24 h-8 px-2 rounded-lg border text-xs outline-none mt-1"
                          style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                      </div>
                    </div>
                  </div>

                  {/* FB Keywords (existing) */}
                  <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <Hash className="size-4 text-rose-400" /> Global Keyword Mappings
                    </h3>
                    {fbKeywords.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No global keywords mapped.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {fbKeywords.map((k) => (
                          <div key={k.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: "var(--bg-main)" }}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">{k.keyword}</span>
                              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>→ {k.product_name} x{k.quantity}</span>
                            </div>
                            <button onClick={async () => { await deleteKeyword(k.id); router.refresh(); }}
                              className="p-1 rounded hover:bg-red-500/10 text-red-400 cursor-pointer">
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Live Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl border p-6 space-y-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Create Live Stream</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-zinc-800 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Title *</label>
                <input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Friday Night Sale" required
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
                <textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} rows={2}
                  placeholder="Describe your live stream..."
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Schedule (optional)</label>
                <input type="datetime-local" value={createScheduled} onChange={(e) => setCreateScheduled(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
              </div>
              {fbPageName && (
                <div className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{ backgroundColor: "var(--bg-main)" }}>
                  <span className="text-emerald-400">✓</span>
                  <span style={{ color: "var(--text-secondary)" }}>Facebook Page: <strong style={{ color: "var(--text-primary)" }}>{fbPageName}</strong></span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreateLive}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
                Create Stream
              </button>
              <button onClick={() => setShowCreateModal(false)}
                className="px-5 h-10 rounded-xl text-sm font-medium border cursor-pointer"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowProductModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl border p-6 space-y-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Live Product</h2>
              <button onClick={() => setShowProductModal(false)} className="p-1 rounded-lg hover:bg-zinc-800 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Keyword *</label>
                <input value={pkKeyword} onChange={(e) => setPkKeyword(e.target.value.toUpperCase())}
                  placeholder="e.g. A1" required
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none font-mono uppercase"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Product *</label>
                <select value={pkProductId} onChange={(e) => setPkProductId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}>
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.selling_price || p.price)} (Stock: {p.quantity})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Price Override</label>
                  <input type="number" step="0.01" value={pkPriceOverride} onChange={(e) => setPkPriceOverride(e.target.value)}
                    placeholder="Default price" className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Max Qty/Order</label>
                  <input type="number" value={pkMaxQty} onChange={(e) => setPkMaxQty(e.target.value)}
                    placeholder="No limit" className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleAddProduct}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
                Add Product
              </button>
              <button onClick={() => setShowProductModal(false)}
                className="px-5 h-10 rounded-xl text-sm font-medium border cursor-pointer"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedOrder(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md bg-[var(--bg-card)] border-l h-full overflow-y-auto p-6 space-y-5" style={{ borderColor: "var(--border-color)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Order #{selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg hover:bg-zinc-800 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <X className="size-5" />
              </button>
            </div>

            <div className={`text-xs px-2 py-1 rounded-full border inline-block font-medium ${statusColors[selectedOrder.status] || ""}`}>
              {selectedOrder.status.toUpperCase()}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Customer</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                  <span style={{ color: "var(--text-primary)" }}>{selectedOrder.customer_name}</span>
                </div>
                {selectedOrder.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                    <span style={{ color: "var(--text-primary)" }}>{selectedOrder.customer_phone}</span>
                  </div>
                )}
                {selectedOrder.customer_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                    <span style={{ color: "var(--text-primary)" }}>{selectedOrder.customer_address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Items</h3>
              <div className="space-y-2">
                {(selectedOrder.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--bg-main)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.product_name}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatCurrency(item.price)} x{item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>Total</span>
                <span className="font-bold text-emerald-400">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>

            {selectedOrder.driver_name && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Driver</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                  <span style={{ color: "var(--text-primary)" }}>{selectedOrder.driver_name}</span>
                </div>
              </div>
            )}

            {selectedOrder.notes && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Notes</h3>
                <p className="text-sm p-3 rounded-xl" style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}>{selectedOrder.notes}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.status === "processing" && (
                  <button onClick={() => { handleUpdateOrder(selectedOrder.id, "packed"); setSelectedOrder(null); }}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-600 transition-all cursor-pointer">
                    <Package className="size-3.5" /> Mark Packed
                  </button>
                )}
                {selectedOrder.status === "packed" && (
                  <button onClick={() => { handleUpdateOrder(selectedOrder.id, "delivery"); setSelectedOrder(null); }}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 transition-all cursor-pointer">
                    <Truck className="size-3.5" /> Ship
                  </button>
                )}
                {selectedOrder.status === "delivery" && (
                  <button onClick={() => { handleUpdateOrder(selectedOrder.id, "completed"); setSelectedOrder(null); }}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 transition-all cursor-pointer">
                    <Check className="size-3.5" /> Mark Delivered
                  </button>
                )}
                {(selectedOrder.status === "processing" || selectedOrder.status === "packed") && (
                  <button onClick={() => { handleUpdateOrder(selectedOrder.id, "cancelled"); setSelectedOrder(null); }}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer">
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
