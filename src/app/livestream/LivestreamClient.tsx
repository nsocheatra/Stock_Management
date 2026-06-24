"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { simulateOrder, processOrder, clearOrders, saveFacebookPage, clearFacebookPage } from "@/lib/actions";
import {
  Radio, LayoutDashboard, MonitorPlay, ShoppingBag, BarChart3, Plus, Trash2, Package, Search, RefreshCw,
  MessageCircle, User, XCircle, Calendar, Clock, DollarSign, TrendingUp,
  Play, Pause, CheckCircle2, Eye, Globe, Camera
} from "lucide-react";

type Product = { id: number; name: string; sku?: string; selling_price: number | null; price: number; quantity?: number; image_url?: string | null };
type Stream = { id: number; title: string; description?: string; facebook_page_id?: string; status: string; scheduled_at?: string; comment_count: number; order_count: number; revenue: number; viewer_count: number; created_at: string; updated_at?: string };
type LiveProduct = { id: number; livestream_id: number; product_id: number; keyword: string; price_override?: number | null; max_quantity?: number | null; priority: number; reserve_stock: number; product_name: string; product_sku?: string; selling_price?: number | null; price: number; stock?: number; image_url?: string | null };
type LiveOrder = { id: number; livestream_id: number; order_number: string; customer_name: string; customer_phone?: string; customer_address?: string; facebook_comment_id?: string; total: number; status: string; driver_id?: number | null; driver_name?: string | null; created_at: string; updated_at?: string };
type LiveComment = { id: number; livestream_id: number; facebook_comment_id?: string; customer_name: string; customer_avatar?: string; customer_id?: string; message: string; detected_keyword?: string; detected_quantity: number; matched_product_id?: number | null; matched_product_name?: string | null; status: string; created_at: string };
type User = { id: number; name: string; role: string };
type FbOrder = { id: number; keyword: string; customer_name: string; product_id: number; product_name: string; quantity: number; total: number; processed: number; created_at: string };
type Keyword = { id: number; keyword: string; product_id: number; quantity: number; created_at: string; product_name: string; selling_price: number | null; price: number };

type Props = {
  products: Product[];
  streams: Stream[];
  liveProducts: LiveProduct[];
  liveOrders: LiveOrder[];
  liveComments: LiveComment[];
  users: User[];
  allOrders: FbOrder[];
  allKeywords: Keyword[];
  fbPageUrl: string; fbPageName: string; fbPageId: string; fbBusinessId: string; fbAccessToken: string; fbAppId: string;
  totalSales: number; totalOrders: number; pendingOrders: number;
};

type Tab = "dashboard" | "studio" | "orders" | "analytics";

export default function LivestreamClient({
  products: initialProducts, streams: initialStreams, liveProducts: initialLiveProducts,
  liveOrders: initialLiveOrders, liveComments: initialLiveComments, users, allOrders: initialOrders,
  allKeywords: initialKeywords, fbPageUrl: initFbUrl, fbPageName: initFbName, fbPageId: initFbPageId,
  fbBusinessId: initFbBizId, fbAccessToken: initFbToken, fbAppId: initFbAppId,
  totalSales: initSales, totalOrders: initTotalOrders, pendingOrders: initPending,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");

  const [products] = useState(initialProducts);
  const [streams] = useState(initialStreams);
  const [liveProducts] = useState(initialLiveProducts);
  const [liveOrders] = useState(initialLiveOrders);
  const [liveComments] = useState(initialLiveComments);
  const [orders] = useState(initialOrders);
  const [keywords] = useState(initialKeywords);
  const [fbPageUrl, setFbPageUrl] = useState(initFbUrl);
  const [fbPageName, setFbPageName] = useState(initFbName);
  const [fbPageId, setFbPageId] = useState(initFbPageId);
  const [fbBusinessId, setFbBizId] = useState(initFbBizId);
  const [fbAccessToken, setFbToken] = useState(initFbToken);
  const [fbAppId, setFbAppId] = useState(initFbAppId);
  const [totalSales] = useState(initSales);
  const [totalOrders] = useState(initTotalOrders);
  const [pendingOrders] = useState(initPending);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [fetchingComments, setFetching] = useState(false);
  const [fbComments, setFbComments] = useState<Array<{ id: string; message: string; customer_name: string; customer_id: string; created_time: string }>>([]);
  const [liveVideoId, setLiveVideoId] = useState("");
  const [creatingFromComment, setCreating] = useState<string | null>(null);
  const [showFbForm, setShowFbForm] = useState(false);
  const [fbForm, setFbForm] = useState({ url: initFbUrl, name: initFbName, pageId: initFbPageId, bizId: initFbBizId, token: initFbToken, appId: initFbAppId });
  const [streamForm, setStreamForm] = useState({ title: "", description: "", scheduled_at: "" });
  const [showStreamForm, setShowStreamForm] = useState(false);
  const [showKeywordForm, setShowKeywordForm] = useState(false);
  const [keywordForm, setKeywordForm] = useState({ keyword: "", productId: "", qty: "1" });
  const [simComment, setSimComment] = useState("");
  const [simName, setSimName] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const selectedStream = streams.find(s => s.id === selectedStreamId);
  const streamProducts = liveProducts.filter(lp => lp.livestream_id === selectedStreamId);
  const streamOrders = liveOrders.filter(o => o.livestream_id === selectedStreamId);
  const streamComments = liveComments.filter(c => c.livestream_id === selectedStreamId);

  const msg = (text: string, ok: boolean) => { setMessage({ text, ok }); setTimeout(() => setMessage(null), 3000); };

  const refresh = () => router.refresh();

  const handleCreateStream = async () => {
    if (!streamForm.title.trim()) return;
    const res = await fetch("/api/livestream", {
      method: "POST",
      body: JSON.stringify({ title: streamForm.title, description: streamForm.description, scheduled_at: streamForm.scheduled_at || null }),
    });
    const data = await res.json();
    if (data.id) { setShowStreamForm(false); setStreamForm({ title: "", description: "", scheduled_at: "" }); msg("Stream created!", true); refresh(); }
    else { msg(data.error || "Failed to create stream", false); }
  };

  const handleUpdateStreamStatus = async (id: number, status: string) => {
    await fetch(`/api/livestream/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    refresh();
  };

  const handleDeleteStream = async (id: number) => {
    if (!window.confirm("Delete this stream and all associated data?")) return;
    await fetch(`/api/livestream/${id}`, { method: "DELETE" });
    if (selectedStreamId === id) setSelectedStreamId(null);
    msg("Stream deleted", true);
    refresh();
  };

  const handleAddProductToStream = async () => {
    if (!keywordForm.keyword.trim() || !keywordForm.productId || !selectedStreamId) return;
    const res = await fetch("/api/livestream/products", {
      method: "POST",
      body: JSON.stringify({
        livestream_id: selectedStreamId, product_id: parseInt(keywordForm.productId),
        keyword: keywordForm.keyword.trim(), max_quantity: parseInt(keywordForm.qty) || 1,
      }),
    });
    const data = await res.json();
    if (data.id) { setKeywordForm({ keyword: "", productId: "", qty: "1" }); msg("Product added to stream!", true); refresh(); }
    else { msg(data.error || "Failed to add product", false); }
  };

  const handleRemoveLiveProduct = async (id: number) => {
    await fetch("/api/livestream/products", { method: "DELETE", body: JSON.stringify({ id }) });
    refresh();
  };

  const handleFetchComments = async () => {
    if (!fbPageId || !fbAccessToken) { msg("Connect a Facebook Page first", false); return; }
    setFetching(true);
    try {
      const res = await fetch("/api/livestream/fetch-comments", {
        method: "POST",
        body: JSON.stringify({
          liveVideoId: liveVideoId.trim() || null,
          pageId: fbPageId,
          accessToken: fbAccessToken,
        }),
      });
      const data = await res.json();
      if (data.error) { msg(data.error, false); setFbComments([]); }
      else { setFbComments(data.comments); msg(`Found ${data.comments.length} comment(s)`, true); }
    } catch { msg("Failed to fetch comments", false); }
    setFetching(false);
  };

  const handleCommentOrder = async (comment: { id: string; message: string; customer_name: string }) => {
    if (!selectedStreamId) { msg("Select a stream first", false); return; }
    const lower = comment.message.toLowerCase();
    const match = streamProducts.find(p => lower.includes(p.keyword.toLowerCase()));
    if (!match) { msg("No matching keyword", false); return; }
    setCreating(comment.id);
    const body = {
      livestream_id: selectedStreamId, facebook_comment_id: null, customer_name: comment.customer_name,
      items: [{ product_id: match.product_id, product_name: match.product_name, quantity: match.max_quantity || 1, price: match.price_override ?? match.selling_price ?? match.price }],
    };
    const res = await fetch("/api/livestream/orders", { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    if (data.id) msg(`Order created: ${data.items?.[0]?.product_name || ""} $${data.total?.toFixed(2)}`, true);
    else msg(data.error || "Failed", false);
    setCreating(null);
    refresh();
  };

  const handleProcessOrder = async (id: number) => {
    const res = await fetch("/api/livestream/orders", { method: "PATCH", body: JSON.stringify({ id, status: "confirmed" }) });
    if (!res.ok) { msg("Failed to confirm order", false); return; }
    msg("Order confirmed", true); refresh();
  };

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm("Cancel this order (stock will be restored)?")) return;
    const res = await fetch("/api/livestream/orders", { method: "PATCH", body: JSON.stringify({ id, status: "cancelled" }) });
    if (!res.ok) { msg("Failed to cancel order", false); return; }
    msg("Order cancelled", true); refresh();
  };

  const handleAssignDriver = async (orderId: number, driverId: number) => {
    const res = await fetch("/api/livestream/orders", { method: "PATCH", body: JSON.stringify({ id: orderId, driver_id: driverId, status: "delivery" }) });
    if (!res.ok) { msg("Failed to assign driver", false); return; }
    msg("Driver assigned", true); refresh();
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simComment.trim()) return;
    const fd = new FormData();
    fd.set("keyword", detectedKeyword?.keyword || "");
    fd.set("customerName", simName.trim() || "Test User");
    const res = await simulateOrder(fd);
    if (res?.error) msg(res.error, false);
    else msg(`Order: ${(res as any).product_name} x${(res as any).quantity} — $${(res as any).total?.toFixed(2)}`, true);
    setSimComment(""); setSimName(""); refresh();
  };

  const handleSaveFb = async () => {
    const fd = new FormData();
    fd.set("facebook_page_url", fbForm.url); fd.set("facebook_page_name", fbForm.name);
    fd.set("facebook_page_id", fbForm.pageId); fd.set("facebook_business_id", fbForm.bizId);
    fd.set("facebook_access_token", fbForm.token); fd.set("facebook_app_id", fbForm.appId);
    await saveFacebookPage(fd);
    setFbPageUrl(fbForm.url); setFbPageName(fbForm.name); setFbPageId(fbForm.pageId);
    setFbBizId(fbForm.bizId); setFbToken(fbForm.token); setFbAppId(fbForm.appId);
    setShowFbForm(false); msg("Facebook connected!", true); refresh();
  };

  const handleClearFb = async () => {
    if (!window.confirm("Disconnect Facebook?")) return;
    await clearFacebookPage();
    setFbPageUrl(""); setFbPageName(""); setFbPageId(""); setFbBizId(""); setFbToken(""); setFbAppId("");
    setFbForm({ url: "", name: "", pageId: "", bizId: "", token: "", appId: "" });
    msg("Facebook disconnected", true); refresh();
  };

  const handleFacebookLogin = () => {
    const appId = fbForm.appId.trim();
    if (!appId) { msg("Enter your App ID first", false); return; }
    const redirectUri = `${window.location.origin}/livestream/facebook-callback`;
    const scope = "pages_show_list,pages_read_engagement,business_management,public_profile";
    const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;
    window.open(url, "facebook-login", "width=600,height=700");
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "facebook-pages") {
        const pages = e.data.pages as Array<{ id: string; name: string; access_token: string; picture?: string }>;
        if (pages.length > 0) {
          const page = pages[0];
          setFbForm(p => ({
            ...p,
            pageId: page.id,
            name: page.name,
            token: page.access_token,
            url: `https://facebook.com/${page.id}`,
          }));
          msg(`Connected as ${page.name}`, true);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const detectedKeyword = streamProducts.find(p => simComment.toLowerCase().includes(p.keyword.toLowerCase()));
  const filteredOrders = orders.filter(o => orderFilter === "all" ? true : orderFilter === "processed" ? o.processed : !o.processed);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "studio", label: "Live Studio", icon: MonitorPlay },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-zinc-500/20 text-zinc-300", scheduled: "bg-blue-500/20 text-blue-400",
      live: "bg-emerald-500/20 text-emerald-400", ended: "bg-zinc-500/10 text-zinc-400",
      pending: "bg-amber-500/20 text-amber-400", confirmed: "bg-blue-500/20 text-blue-400",
      delivery: "bg-purple-500/20 text-purple-400", delivered: "bg-emerald-500/20 text-emerald-400",
      cancelled: "bg-red-500/20 text-red-400",
    };
    return map[s] || "bg-zinc-500/20 text-zinc-300";
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/20">
              <Radio className="size-7 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Live Commerce</h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Facebook Live selling & order automation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
              ? Guide
            </button>
            {fbPageUrl ? (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Globe className="size-3" /> {fbPageName || "Connected"}
              </span>
            ) : (
              <button onClick={() => setShowFbForm(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors cursor-pointer">
                <Camera className="size-3.5" /> Connect Facebook
              </button>
            )}
          </div>
        </div>

        {/* How to Use Guide */}
        {showGuide && (
          <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Radio className="size-4 text-rose-400" /> How to Use Live Commerce
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                <div className="size-7 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                  <Camera className="size-3.5 text-blue-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>1. Connect Facebook</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  Go to <strong>developers.facebook.com</strong> → My Apps → Create App (Business type). Then fill the 5 fields:
                </p>
                <ul className="mt-1.5 space-y-1 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  <li><strong className="text-blue-400">App ID</strong> — Dashboard of your Facebook App</li>
                  <li><strong className="text-blue-400">Page ID</strong> — Your Facebook Page → About → Page ID</li>
                  <li><strong className="text-blue-400">Page Name</strong> — Your Facebook Page name</li>
                  <li><strong className="text-blue-400">Page URL</strong> — Full URL of your Facebook Page</li>
                  <li><strong className="text-blue-400">Access Token</strong> — Tools → Graph API Explorer → select App + Page → get <code className="text-blue-400">pages_read_engagement</code> token</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                <div className="size-7 rounded-full bg-rose-500/20 flex items-center justify-center mb-2">
                  <MonitorPlay className="size-3.5 text-rose-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>2. Create a Stream</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  Click "New Stream", give it a title, and optionally schedule it. Open the stream in Studio to manage products and orders.
                </p>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                <div className="size-7 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                  <Package className="size-3.5 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>3. Add Products</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  In Studio, click "Add" under Products. Enter a keyword (e.g. "buy"), select a product, and set the max quantity. Customers type this keyword in comments to order.
                </p>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                <div className="size-7 rounded-full bg-amber-500/20 flex items-center justify-center mb-2">
                  <Play className="size-3.5 text-amber-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>4. Go Live & Fetch</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  Click "Go Live" to activate the stream. Use "Fetch Comments" to pull comments from your Facebook Page. Comments containing keywords are auto-matched to products.
                </p>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                <div className="size-7 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                  <ShoppingBag className="size-3.5 text-purple-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>5. Process Orders</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  Review matched orders in the Orders panel. Confirm orders to reduce stock. Assign drivers for delivery. Use the Comment Simulator to test keyword matching.
                </p>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                <div className="size-7 rounded-full bg-violet-500/20 flex items-center justify-center mb-2">
                  <BarChart3 className="size-3.5 text-violet-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>6. Track Analytics</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  View stream performance, conversion rates, revenue, and order summaries in the Analytics tab. Monitor viewer counts and comment activity in real time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Total Revenue" value={`$${Number(totalSales).toFixed(2)}`} color="emerald" />
          <StatCard icon={ShoppingBag} label="Total Orders" value={String(totalOrders)} color="blue" />
          <StatCard icon={Clock} label="Pending" value={String(pendingOrders)} color="amber" />
          <StatCard icon={TrendingUp} label="Conversion" value={totalOrders > 0 && streams.length > 0 ? `${((totalOrders / Math.max(1, streams.reduce((a, s) => a + s.viewer_count, 0))) * 100).toFixed(1)}%` : "0%"} color="violet" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === t.id ? "bg-gradient-to-r from-rose-500/20 to-purple-500/20 text-white shadow-sm" : "text-faint hover:text-white"}`}>
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message.text}
          </div>
        )}

        {/* ───── DASHBOARD ───── */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Live Streams</h2>
                <button onClick={() => setShowStreamForm(true)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
                  <Plus className="size-3.5" /> New Stream
                </button>
              </div>

              {showStreamForm && (
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                  <input value={streamForm.title} onChange={e => setStreamForm(p => ({ ...p, title: e.target.value }))} placeholder="Stream title" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                  <textarea value={streamForm.description} onChange={e => setStreamForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                  <input type="datetime-local" value={streamForm.scheduled_at} onChange={e => setStreamForm(p => ({ ...p, scheduled_at: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                  <div className="flex gap-2">
                    <button onClick={handleCreateStream} className="px-4 h-9 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 cursor-pointer">Create Stream</button>
                    <button onClick={() => { setShowStreamForm(false); setStreamForm({ title: "", description: "", scheduled_at: "" }); }}
                      className="px-4 h-9 rounded-lg text-sm border cursor-pointer" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>Cancel</button>
                  </div>
                </div>
              )}

              {streams.length === 0 ? (
                <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                  <Radio className="size-10 mx-auto mb-2" style={{ color: "var(--text-secondary)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No streams yet</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Create your first live stream to start selling</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {streams.map(s => (
                    <div key={s.id} className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{s.title}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                          </div>
                          {s.description && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{s.description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {s.scheduled_at && <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(s.scheduled_at).toLocaleString()}</span>}
                            <span className="flex items-center gap-1"><Eye className="size-3" />{s.viewer_count} viewers</span>
                            <span className="flex items-center gap-1"><MessageCircle className="size-3" />{s.comment_count}</span>
                            <span className="flex items-center gap-1"><ShoppingBag className="size-3" />{s.order_count} orders</span>
                            <span className="flex items-center gap-1 font-medium text-emerald-400"><DollarSign className="size-3" />${s.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => { setSelectedStreamId(s.id); setTab("studio"); }}
                            className="px-3 h-8 rounded-lg text-xs font-medium bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
                            Open Studio
                          </button>
                          {s.status === "draft" && (
                            <button onClick={() => handleUpdateStreamStatus(s.id, "scheduled")}
                              className="px-3 h-8 rounded-lg text-xs border cursor-pointer" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                              Schedule
                            </button>
                          )}
                          {(s.status === "draft" || s.status === "ended") && (
                            <button onClick={() => handleDeleteStream(s.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 cursor-pointer">
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Facebook Connection Panel */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Facebook</h2>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                {showFbForm ? (
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Facebook Business credentials</p>
                    <input value={fbForm.appId} onChange={e => setFbForm(p => ({ ...p, appId: e.target.value }))} placeholder="App ID" className="w-full h-9 px-3 rounded-lg border text-xs outline-none font-mono" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                    <input value={fbForm.pageId} onChange={e => setFbForm(p => ({ ...p, pageId: e.target.value }))} placeholder="Page ID" className="w-full h-9 px-3 rounded-lg border text-xs outline-none font-mono" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                    <input value={fbForm.name} onChange={e => setFbForm(p => ({ ...p, name: e.target.value }))} placeholder="Page Name" className="w-full h-9 px-3 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                    <div className="flex gap-2">
                      <input type={showSecret ? "text" : "password"} value={fbForm.token} onChange={e => setFbForm(p => ({ ...p, token: e.target.value }))} placeholder="Access Token" className="flex-1 h-9 px-3 rounded-lg border text-xs outline-none font-mono" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                      <button onClick={() => setShowSecret(!showSecret)} className="px-2 h-9 rounded-lg text-xs border cursor-pointer" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>{showSecret ? "Hide" : "Show"}</button>
                    </div>
                    <input value={fbForm.url} onChange={e => setFbForm(p => ({ ...p, url: e.target.value }))} placeholder="Page URL" className="w-full h-9 px-3 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                    <button onClick={handleFacebookLogin}
                      className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166FE5] cursor-pointer">
                      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Login with Facebook
                    </button>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSaveFb} className="px-4 h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 cursor-pointer">Save</button>
                      <button onClick={() => setShowFbForm(false)} className="px-4 h-9 rounded-lg text-xs border cursor-pointer" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>Cancel</button>
                    </div>
                  </div>
                ) : fbPageUrl ? (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg className="size-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fbPageName || "Facebook Page"}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Page ID: {fbPageId}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { setShowFbForm(true); setFbForm({ url: fbPageUrl, name: fbPageName, pageId: fbPageId, bizId: fbBusinessId, token: fbAccessToken, appId: fbAppId }); }}
                        className="px-3 h-7 rounded-lg text-xs border cursor-pointer" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>Edit</button>
                      <button onClick={handleClearFb} className="px-3 h-7 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 cursor-pointer">Disconnect</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Camera className="size-8 mx-auto mb-2" style={{ color: "var(--text-secondary)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No connection</p>
                    <p className="text-xs mt-1 mb-3" style={{ color: "var(--text-secondary)" }}>Connect to fetch live comments</p>
                    <button onClick={() => setShowFbForm(true)}
                      className="px-4 h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-700 cursor-pointer">Connect Facebook</button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => { setShowStreamForm(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-zinc-800/50 transition-colors text-left cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    <Plus className="size-3.5 text-rose-400" /> New Live Stream
                  </button>
                  <button onClick={() => { setTab("studio"); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-zinc-800/50 transition-colors text-left cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    <MonitorPlay className="size-3.5 text-emerald-400" /> Open Studio
                  </button>
                  <button onClick={() => setTab("orders")}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-zinc-800/50 transition-colors text-left cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    <ShoppingBag className="size-3.5 text-blue-400" /> View Orders
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───── LIVE STUDIO ───── */}
        {tab === "studio" && (
          <div>
            {!selectedStreamId ? (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <MonitorPlay className="size-12 mx-auto mb-3" style={{ color: "var(--text-secondary)" }} />
                <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Select a Stream</p>
                <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-secondary)" }}>Choose a stream from the dashboard or create a new one</p>
                <div className="flex items-center justify-center gap-3">
                  {streams.slice(0, 5).map(s => (
                    <button key={s.id} onClick={() => { setSelectedStreamId(s.id); }}
                      className="px-4 py-2 rounded-lg text-sm border hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                      {s.title}
                    </button>
                  ))}
                  <button onClick={() => setTab("dashboard")}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-rose-500 to-purple-600 text-white cursor-pointer">
                    + New
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stream Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                        {selectedStream?.title}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor(selectedStream?.status || "")}`}>{selectedStream?.status}</span>
                      </h2>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span>{streamProducts.length} products</span>
                        <span>{streamOrders.length} orders</span>
                        <span>${streamOrders.reduce((a, o) => a + o.total, 0).toFixed(2)} revenue</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStream && selectedStream.status === "draft" && (
                      <button onClick={() => handleUpdateStreamStatus(selectedStream.id, "live")}
                        className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 cursor-pointer">
                        <Play className="size-3.5" /> Go Live
                      </button>
                    )}
                    {selectedStream && selectedStream.status === "live" && (
                      <button onClick={() => handleUpdateStreamStatus(selectedStream.id, "ended")}
                        className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 cursor-pointer">
                        <Pause className="size-3.5" /> End Stream
                      </button>
                    )}
                    <input value={liveVideoId} onChange={e => setLiveVideoId(e.target.value)}
                      placeholder="Live Video ID (optional)"
                      className="w-44 h-9 px-3 rounded-lg border text-xs outline-none font-mono"
                      style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                    <button onClick={() => handleFetchComments} disabled={fetchingComments}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border disabled:opacity-40 cursor-pointer"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                      <RefreshCw className={`size-3.5 ${fetchingComments ? "animate-spin" : ""}`} /> Fetch Comments
                    </button>
                  </div>
                </div>

                {/* Studio Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Product Showcase */}
                  <div className="lg:col-span-1 rounded-xl border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                      <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        <Package className="size-4 text-rose-400" /> Products
                      </h3>
                      <button onClick={() => setShowKeywordForm(!showKeywordForm)}
                        className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-[10px] font-medium bg-gradient-to-r from-rose-500 to-purple-600 text-white cursor-pointer">
                        <Plus className="size-3" /> Add
                      </button>
                    </div>
                    {showKeywordForm && (
                      <div className="p-3 border-b space-y-2" style={{ borderColor: "var(--border-color)" }}>
                        <input value={keywordForm.keyword} onChange={e => setKeywordForm(p => ({ ...p, keyword: e.target.value }))} placeholder="Keyword (e.g. 'buy')" className="w-full h-8 px-2.5 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                        <select value={keywordForm.productId} onChange={e => setKeywordForm(p => ({ ...p, productId: e.target.value }))} className="w-full h-8 px-2.5 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}>
                          <option value="">Select product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${((p.selling_price ?? p.price) || 0).toFixed(2)}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} value={keywordForm.qty} onChange={e => setKeywordForm(p => ({ ...p, qty: e.target.value }))} className="w-16 h-8 px-2 rounded-lg border text-xs outline-none text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                          <button onClick={handleAddProductToStream} disabled={!keywordForm.keyword || !keywordForm.productId}
                            className="ml-auto px-3 h-8 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-40 cursor-pointer">Add to Stream</button>
                        </div>
                      </div>
                    )}
                    <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                      {streamProducts.length === 0 ? (
                        <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>No products added yet</p>
                      ) : streamProducts.map(lp => (
                        <div key={lp.id} className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                          <div className="size-8 rounded-md bg-zinc-700/30 flex items-center justify-center text-xs font-bold text-rose-400 shrink-0">{lp.keyword[0]?.toUpperCase()}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{lp.product_name}</p>
                            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                              <span className="font-medium text-rose-400">{lp.keyword}</span>
                              <span>x{lp.max_quantity || 1}</span>
                              <span className="text-emerald-400">${((lp.price_override ?? lp.selling_price ?? lp.price) || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveLiveProduct(lp.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400 cursor-pointer">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comment Feed */}
                  <div className="lg:col-span-1 rounded-xl border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                      <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        <MessageCircle className="size-4 text-blue-400" /> Comments
                        <span className="text-[10px] font-normal text-faint">({streamComments.length})</span>
                      </h3>
                    </div>
                    <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: "var(--border-color)" }}>
                      {fbComments.length > 0 ? fbComments.map(c => {
                        const lower = c.message.toLowerCase();
                        const match = streamProducts.find(p => lower.includes(p.keyword.toLowerCase()));
                        return (
                          <div key={c.id} className="p-3 flex items-start gap-2.5" style={{ backgroundColor: "var(--bg-main)" }}>
                            <div className="size-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                              <User className="size-3.5 text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{c.customer_name}</span>
                                <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{new Date(c.created_time).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{c.message}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {match ? (
                                  <>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">{match.keyword}</span>
                                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>→</span>
                                    <span className="text-[10px] font-semibold" style={{ color: "var(--text-primary)" }}>{match.product_name}</span>
                                    <button onClick={() => handleCommentOrder(c)} disabled={creatingFromComment === c.id}
                                      className="ml-auto flex items-center gap-1 px-2 h-6 rounded text-[10px] font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 disabled:opacity-40 cursor-pointer">
                                      {creatingFromComment === c.id ? <RefreshCw className="size-2.5 animate-spin" /> : <ShoppingBag className="size-2.5" />}
                                      Order
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>No keyword match</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="p-6 text-center">
                          <MessageCircle className="size-8 mx-auto mb-1" style={{ color: "var(--text-secondary)" }} />
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No comments fetched</p>
                           <button onClick={handleFetchComments}
                            className="mt-2 px-3 h-7 rounded-lg text-[10px] font-medium border disabled:opacity-40 cursor-pointer"
                            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                            <RefreshCw className={`size-3 inline mr-1 ${fetchingComments ? "animate-spin" : ""}`} />
                            Fetch now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Queue */}
                  <div className="lg:col-span-1 rounded-xl border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                      <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        <ShoppingBag className="size-4 text-emerald-400" /> Orders
                        <span className="text-[10px] font-normal text-faint">({streamOrders.filter(o => o.status === "pending").length} pending)</span>
                      </h3>
                    </div>
                    <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: "var(--border-color)" }}>
                      {streamOrders.length === 0 ? (
                        <div className="p-6 text-center">
                          <ShoppingBag className="size-8 mx-auto mb-1" style={{ color: "var(--text-secondary)" }} />
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No orders yet</p>
                        </div>
                      ) : streamOrders.map(o => (
                        <div key={o.id} className="p-3" style={{ backgroundColor: "var(--bg-main)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{o.customer_name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor(o.status)}`}>{o.status}</span>
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                {o.order_number} — ${o.total.toFixed(2)}
                              </p>
                              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{new Date(o.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {o.status === "pending" && (
                                <>
                                  <button onClick={() => handleProcessOrder(o.id)}
                                    className="px-2 h-6 rounded text-[10px] font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer">
                                    <CheckCircle2 className="size-3" />
                                  </button>
                                  <button onClick={() => handleCancelOrder(o.id)}
                                    className="px-2 h-6 rounded text-[10px] text-red-400 border border-red-500/30 hover:bg-red-500/10 cursor-pointer">
                                    <XCircle className="size-3" />
                                  </button>
                                </>
                              )}
                              {o.status === "confirmed" && (
                                <select onChange={e => e.target.value ? handleAssignDriver(o.id, parseInt(e.target.value)) : null}
                                  className="h-6 rounded text-[10px] border outline-none cursor-pointer"
                                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-secondary)" }}>
                                  <option value="">Assign driver...</option>
                                  {users.filter(u => u.role === "admin" || u.role === "stock_manager").map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulator */}
                <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <Search className="size-4 text-amber-400" /> Comment Simulator
                  </h3>
                  <form onSubmit={handleSimulate} className="flex gap-3">
                    <input value={simComment} onChange={e => setSimComment(e.target.value)} placeholder='e.g. "I want to buy this!"' className="flex-1 h-9 px-3 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                    <input value={simName} onChange={e => setSimName(e.target.value)} placeholder="Name" className="w-36 h-9 px-3 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }} />
                    <button type="submit" disabled={!detectedKeyword}
                      className="px-4 h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-40 cursor-pointer">Simulate</button>
                  </form>
                  {simComment.trim() && (
                    <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {detectedKeyword
                        ? <span>Detected: <strong className="text-rose-400">{detectedKeyword.keyword}</strong> → {detectedKeyword.product_name} x{detectedKeyword.max_quantity || 1}</span>
                        : <span>No keyword match in &ldquo;{simComment}&rdquo;</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───── ORDERS ───── */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>All Orders ({orders.length})</h2>
              <div className="flex items-center gap-2">
                <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg text-xs border outline-none cursor-pointer"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                </select>
                {orders.length > 0 && (
                  <button onClick={async () => { if (window.confirm("Clear all orders?")) { await clearOrders(); refresh(); } }}
                    className="px-3 h-9 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 cursor-pointer">Clear All</button>
                )}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <ShoppingBag className="size-10 mx-auto mb-2" style={{ color: "var(--text-secondary)" }} />
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No orders found</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
                        <th className="text-left p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Order</th>
                        <th className="text-left p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Customer</th>
                        <th className="text-left p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Product</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Qty</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Total</th>
                        <th className="text-center p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Date</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id} className={`border-t ${o.processed ? "opacity-60" : ""}`} style={{ borderColor: "var(--border-color)" }}>
                          <td className="p-3 font-mono text-[10px]" style={{ color: "var(--text-primary)" }}>#{o.id}</td>
                          <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>{o.customer_name}</td>
                          <td className="p-3" style={{ color: "var(--text-primary)" }}>{o.product_name}</td>
                          <td className="p-3 text-right" style={{ color: "var(--text-primary)" }}>{o.quantity}</td>
                          <td className="p-3 text-right font-medium text-emerald-400">${o.total.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.processed ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                              {o.processed ? "Delivered" : "Pending"}
                            </span>
                          </td>
                          <td className="p-3 text-right text-[10px]" style={{ color: "var(--text-secondary)" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="p-3 text-right">
                            {!o.processed && (
                              <button onClick={async () => { const fd = new FormData(); fd.set("id", String(o.id)); await processOrder(fd); refresh(); }}
                                className="px-2.5 h-7 rounded text-[10px] font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer">
                                <CheckCircle2 className="size-3 inline mr-1" />Process
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───── ANALYTICS ───── */}
        {tab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Performance Analytics</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Total Streams</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{streams.length}</p>
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Live Now</p>
                <p className="text-2xl font-bold mt-1 text-emerald-400">{streams.filter(s => s.status === "live").length}</p>
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Products Mapped</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{liveProducts.length}</p>
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Keywords</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{keywords.length}</p>
              </div>
            </div>

            {/* Stream Performance Table */}
            <div className="rounded-xl border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
              <div className="p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Stream Performance</h3>
              </div>
              {streams.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No data yet. Run a live stream to see analytics.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
                        <th className="text-left p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Stream</th>
                        <th className="text-center p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Views</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Comments</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Orders</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Revenue</th>
                        <th className="text-right p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streams.map(s => (
                        <tr key={s.id} className="border-t" style={{ borderColor: "var(--border-color)" }}>
                          <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>{s.title}</td>
                          <td className="p-3 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span></td>
                          <td className="p-3 text-right" style={{ color: "var(--text-primary)" }}>{s.viewer_count}</td>
                          <td className="p-3 text-right" style={{ color: "var(--text-primary)" }}>{s.comment_count}</td>
                          <td className="p-3 text-right" style={{ color: "var(--text-primary)" }}>{s.order_count}</td>
                          <td className="p-3 text-right font-medium text-emerald-400">${s.revenue.toFixed(2)}</td>
                          <td className="p-3 text-right" style={{ color: "var(--text-primary)" }}>{s.viewer_count > 0 ? `${((s.order_count / s.viewer_count) * 100).toFixed(1)}%` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live Orders Summary */}
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>Live Orders Summary</h3>
              {liveOrders.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No live orders yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>Total</p>
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{liveOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>Pending</p>
                    <p className="text-lg font-bold text-amber-400">{liveOrders.filter(o => o.status === "pending").length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>Confirmed</p>
                    <p className="text-lg font-bold text-blue-400">{liveOrders.filter(o => o.status === "confirmed").length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>Delivered</p>
                    <p className="text-lg font-bold text-emerald-400">{liveOrders.filter(o => o.status === "delivered").length}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/20",
    blue: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/20",
    amber: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/20",
    violet: "from-violet-500/20 to-violet-600/10 text-violet-400 border-violet-500/20",
  };
  return (
    <div className={`rounded-xl border p-4 bg-gradient-to-br ${colors[color] || colors.emerald}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</p>
        <Icon className="size-4 opacity-70" />
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
