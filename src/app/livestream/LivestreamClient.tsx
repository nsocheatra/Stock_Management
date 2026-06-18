"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Plus, Trash2, Play, ShoppingBag, Radio, Package, Video, Link2, ExternalLink } from "lucide-react";
import { createKeyword, deleteKeyword, simulateOrder, processOrder, clearOrders, saveStreamUrl } from "@/lib/actions";

type Product = { id: number; name: string; selling_price: number | null; price: number };
type Keyword = { id: number; keyword: string; product_id: number; quantity: number; created_at: string; product_name: string; selling_price: number | null; price: number };
type Order = { id: number; keyword: string; customer_name: string; product_id: number; product_name: string; quantity: number; total: number; processed: number; created_at: string };

function getYouTubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1` : null;
}

function getFacebookEmbed(url: string): string | null {
  if (url.includes("facebook.com") || url.includes("fb.watch") || url.includes("fb.com")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=1`;
  }
  return null;
}

export default function LivestreamClient({ products, keywords, orders, streamUrl: initialUrl }: { products: Product[]; keywords: Keyword[]; orders: Order[]; streamUrl: string }) {
  const router = useRouter();
  const [streamUrl, setStreamUrl] = useState(initialUrl);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [keyword, setKeyword] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [simKeyword, setSimKeyword] = useState("");
  const [simName, setSimName] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok: boolean) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !productId) return;
    const fd = new FormData();
    fd.set("keyword", keyword.trim());
    fd.set("productId", productId);
    fd.set("quantity", qty);
    const res = await createKeyword(fd);
    if (res?.error) showMsg(res.error, false);
    else { setKeyword(""); showMsg("Keyword mapped!", true); }
    router.refresh();
  };

  const handleDeleteKeyword = async (id: number) => {
    await deleteKeyword(id);
    router.refresh();
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simKeyword.trim()) return;
    const fd = new FormData();
    fd.set("keyword", simKeyword.trim());
    fd.set("customerName", simName.trim() || "Facebook User");
    const res = await simulateOrder(fd);
    if (res?.error) showMsg(res.error, false);
    else showMsg(`Order: ${(res as any).product_name} x${(res as any).quantity} — $${(res as any).total?.toFixed(2)}`, true);
    setSimKeyword("");
    setSimName("");
    router.refresh();
  };

  const handleProcess = async (id: number) => {
    const fd = new FormData();
    fd.set("id", String(id));
    await processOrder(fd);
    router.refresh();
  };

  const handleClear = async () => {
    await clearOrders();
    router.refresh();
  };

  const selectedProduct = products.find((p) => p.id === parseInt(productId));

  const youtubeEmbed = getYouTubeEmbed(streamUrl);
  const facebookEmbed = getFacebookEmbed(streamUrl);
  const embedUrl = youtubeEmbed || facebookEmbed || "";

  const handleSaveUrl = async () => {
    await saveStreamUrl(urlInput);
    setStreamUrl(urlInput);
    setEditingUrl(false);
    router.refresh();
  };

  return (
    <div className="p-6 space-y-8">
      {/* Stream Section */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <Video className="size-5" />
            </div>
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Live Stream</h2>
            {streamUrl && !editingUrl && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <button onClick={() => { setEditingUrl(!editingUrl); setUrlInput(streamUrl); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
            <Link2 className="size-3.5" />
            {editingUrl ? "Cancel" : streamUrl ? "Change URL" : "Add Stream"}
          </button>
        </div>

        {editingUrl && (
          <div className="p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Stream URL or Broadcast ID..."
                className="flex-1 h-10 px-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
              />
              <button onClick={handleSaveUrl}
                className="px-4 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 transition-all cursor-pointer">
                Save
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              Supports YouTube Live, Facebook Live, or any embeddable video URL
            </p>
          </div>
        )}

        {embedUrl ? (
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : streamUrl && !editingUrl ? (
          <div className="flex items-center gap-3 p-4" style={{ backgroundColor: "var(--bg-main)" }}>
            <ExternalLink className="size-4 shrink-0" style={{ color: "var(--text-secondary)" }} />
            <a href={streamUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm underline truncate" style={{ color: "var(--text-secondary)" }}>
              {streamUrl}
            </a>
          </div>
        ) : !editingUrl ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ backgroundColor: "var(--bg-main)" }}>
            <Video className="size-10 mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No stream connected</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Click &quot;Add Stream&quot; to link your video</p>
          </div>
        ) : null}
      </div>

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/20">
          <Radio className="size-8 text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Livestream Automation</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Map keywords to products and auto-create orders from comments</p>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Keyword Mapping */}
        <div className="space-y-6">
          {/* New Keyword Form */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Tag className="size-5" /> Map Keyword to Product
            </h2>
            <form onSubmit={handleCreateKeyword} className="space-y-3">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder='Keyword (e.g. "buy" or "order")'
                className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                required
              />
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                required
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ${(p.selling_price || p.price).toFixed(2)}</option>
                ))}
              </select>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Qty:</span>
                  <input
                    type="number" min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-20 h-10 px-3 rounded-lg border text-sm outline-none text-center"
                    style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                  />
                </div>
                {selectedProduct && (
                  <span className="text-sm font-semibold text-emerald-400">
                    = ${(((selectedProduct.selling_price || selectedProduct.price)) * parseInt(qty || "0")).toFixed(2)}
                  </span>
                )}
                <button type="submit"
                  className="ml-auto flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 transition-all cursor-pointer">
                  <Plus className="size-4" /> Add Mapping
                </button>
              </div>
            </form>
          </div>

          {/* Existing Keywords */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Package className="size-5" /> Keyword Mappings ({keywords.length})
            </h2>
            {keywords.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No keywords mapped yet.</p>
            ) : (
              <div className="space-y-2">
                {keywords.map((k) => (
                  <div key={k.id}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {k.keyword}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>→</span>
                      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{k.product_name}</span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>x{k.quantity}</span>
                      <span className="text-xs font-medium text-emerald-400">${((k.selling_price || k.price) * k.quantity).toFixed(2)}</span>
                    </div>
                    <button onClick={() => handleDeleteKeyword(k.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Simulator & Orders */}
        <div className="space-y-6">
          {/* Comment Simulator */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Play className="size-5" /> Simulate Facebook Comment
            </h2>
            <form onSubmit={handleSimulate} className="space-y-3">
              <div className="flex gap-3">
                <input
                  value={simKeyword}
                  onChange={(e) => setSimKeyword(e.target.value)}
                  placeholder='Keyword (e.g. "buy")'
                  className="flex-1 h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                  required
                />
                <input
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="Customer name"
                  className="flex-1 h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                />
              </div>
              <button type="submit"
                className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer">
                <ShoppingBag className="size-4" /> Simulate Order
              </button>
            </form>
          </div>

          {/* Orders Feed */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <ShoppingBag className="size-5" /> Orders Feed ({orders.length})
              </h2>
              {orders.length > 0 && (
                <button onClick={handleClear}
                  className="text-xs px-3 py-1.5 rounded-lg border text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border-color)" }}>
                  Clear All
                </button>
              )}
            </div>
            {orders.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No orders yet. Simulate a comment above.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.id}
                    className={`p-3 rounded-xl border ${o.processed ? "opacity-60" : ""}`}
                    style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">
                            {o.keyword}
                          </span>
                          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                            {o.product_name}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            x{o.quantity}
                          </span>
                          <span className="text-sm font-bold text-emerald-400">
                            ${o.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <span>👤 {o.customer_name}</span>
                          <span>🕐 {new Date(o.created_at).toLocaleString()}</span>
                          {o.processed === 1 && <span className="text-emerald-400 font-medium">✓ Processed</span>}
                        </div>
                      </div>
                      {o.processed === 0 && (
                        <button onClick={() => handleProcess(o.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors cursor-pointer">
                          Process
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
