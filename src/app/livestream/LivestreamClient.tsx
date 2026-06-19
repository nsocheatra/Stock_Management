"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tag, Plus, Trash2, Play, ShoppingBag, Radio, Package, Search } from "lucide-react";
import { createKeyword, deleteKeyword, simulateOrder, processOrder, clearOrders, saveFacebookPage, clearFacebookPage } from "@/lib/actions";

type Product = { id: number; name: string; selling_price: number | null; price: number };
type Keyword = { id: number; keyword: string; product_id: number; quantity: number; created_at: string; product_name: string; selling_price: number | null; price: number };
type Order = { id: number; keyword: string; customer_name: string; product_id: number; product_name: string; quantity: number; total: number; processed: number; created_at: string };

export default function LivestreamClient({ products, keywords, orders, fbPageUrl: initialFbPageUrl, fbPageName: initialFbPageName, fbPageId: initialFbPageId, fbBusinessId: initialFbBusinessId, fbAccessToken: initialFbAccessToken, fbAppId: initialFbAppId }: { products: Product[]; keywords: Keyword[]; orders: Order[]; fbPageUrl: string; fbPageName: string; fbPageId: string; fbBusinessId: string; fbAccessToken: string; fbAppId: string }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [simComment, setSimComment] = useState("");
  const [simName, setSimName] = useState("");
  const [fbPageUrl, setFbPageUrl] = useState(initialFbPageUrl);
  const [fbPageName, setFbPageName] = useState(initialFbPageName);
  const [fbPageId, setFbPageId] = useState(initialFbPageId);
  const [fbBusinessId, setFbBusinessId] = useState(initialFbBusinessId);
  const [fbAccessToken, setFbAccessToken] = useState(initialFbAccessToken);
  const [fbAppId, setFbAppId] = useState(initialFbAppId);
  const [editingFb, setEditingFb] = useState(!initialFbPageUrl);
  const [fbUrlInput, setFbUrlInput] = useState(initialFbPageUrl);
  const [fbNameInput, setFbNameInput] = useState(initialFbPageName);
  const [fbPageIdInput, setFbPageIdInput] = useState(initialFbPageId);
  const [fbBusinessIdInput, setFbBusinessIdInput] = useState(initialFbBusinessId);
  const [fbTokenInput, setFbTokenInput] = useState(initialFbAccessToken);
  const [fbAppIdInput, setFbAppIdInput] = useState(initialFbAppId);
  const [showSecret, setShowSecret] = useState(false);
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
    try {
      await deleteKeyword(id);
      showMsg("Keyword deleted!", true);
    } catch {
      showMsg("Failed to delete keyword", false);
    }
    router.refresh();
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simComment.trim() || !detectedKeyword) return;
    const fd = new FormData();
    fd.set("keyword", detectedKeyword.keyword);
    fd.set("customerName", simName.trim() || "Facebook User");
    const res = await simulateOrder(fd);
    if (res?.error) showMsg(res.error, false);
    else showMsg(`Order: ${(res as any).product_name} x${(res as any).quantity} — $${(res as any).total?.toFixed(2)}`, true);
    setSimComment("");
    setSimName("");
    router.refresh();
  };

  const handleProcess = async (id: number) => {
    const fd = new FormData();
    fd.set("id", String(id));
    const res = await processOrder(fd);
    if (res?.error) showMsg(res.error, false);
    else showMsg("Order processed!", true);
    router.refresh();
  };

  const handleClear = async () => {
    if (!window.confirm("Clear all orders? This cannot be undone.")) return;
    await clearOrders();
    showMsg("All orders cleared", true);
    router.refresh();
  };

  const selectedProduct = products.find((p) => p.id === parseInt(productId));

  const detectedKeyword = useMemo(() => {
    const lower = simComment.toLowerCase();
    return keywords.find((k) => lower.includes(k.keyword.toLowerCase()));
  }, [simComment, keywords]);

  const handleSaveFb = async () => {
    const fd = new FormData();
    fd.set("facebook_page_url", fbUrlInput);
    fd.set("facebook_page_name", fbNameInput);
    fd.set("facebook_page_id", fbPageIdInput);
    fd.set("facebook_business_id", fbBusinessIdInput);
    fd.set("facebook_access_token", fbTokenInput);
    fd.set("facebook_app_id", fbAppIdInput);
    await saveFacebookPage(fd);
    setFbPageUrl(fbUrlInput); setFbPageName(fbNameInput); setFbPageId(fbPageIdInput);
    setFbBusinessId(fbBusinessIdInput); setFbAccessToken(fbTokenInput); setFbAppId(fbAppIdInput);
    setEditingFb(false); showMsg("Facebook Business connected!", true);
    router.refresh();
  };

  const handleClearFb = async () => {
    if (!window.confirm("Disconnect Facebook Business?")) return;
    await clearFacebookPage();
    setFbPageUrl(""); setFbPageName(""); setFbPageId(""); setFbBusinessId(""); setFbAccessToken(""); setFbAppId("");
    setFbUrlInput(""); setFbNameInput(""); setFbPageIdInput(""); setFbBusinessIdInput(""); setFbTokenInput(""); setFbAppIdInput("");
    setEditingFb(true);
    showMsg("Facebook Business disconnected", true);
    router.refresh();
  };

  return (
    <div className="p-6 space-y-8">
      {/* Facebook Business Connection */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Facebook Business</h2>
            {fbPageUrl && !editingFb && (
              <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                Connected
              </span>
            )}
          </div>
          <button onClick={() => { setEditingFb(!editingFb); setFbUrlInput(fbPageUrl); setFbNameInput(fbPageName); setFbPageIdInput(fbPageId); setFbBusinessIdInput(fbBusinessId); setFbTokenInput(fbAccessToken); setFbAppIdInput(fbAppId); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
            {editingFb ? "Cancel" : fbPageUrl ? "Edit" : "Connect"}
          </button>
        </div>

        {editingFb ? (
          <div className="p-4 border-b space-y-4" style={{ borderColor: "var(--border-color)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Enter your Facebook Business credentials from <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-400">Facebook Developers</a></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Facebook App ID</label>
                <input
                  value={fbAppIdInput}
                  onChange={(e) => setFbAppIdInput(e.target.value)}
                  placeholder="123456789012345"
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none font-mono"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Page ID</label>
                <input
                  value={fbPageIdInput}
                  onChange={(e) => setFbPageIdInput(e.target.value)}
                  placeholder="987654321098765"
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none font-mono"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Business ID (optional)</label>
                <input
                  value={fbBusinessIdInput}
                  onChange={(e) => setFbBusinessIdInput(e.target.value)}
                  placeholder="543210987654321"
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none font-mono"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Page Name</label>
                <input
                  value={fbNameInput}
                  onChange={(e) => setFbNameInput(e.target.value)}
                  placeholder="My Business Page"
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Page Access Token</label>
              <div className="flex gap-2">
                <input
                  type={showSecret ? "text" : "password"}
                  value={fbTokenInput}
                  onChange={(e) => setFbTokenInput(e.target.value)}
                  placeholder="EAAx...XXD"
                  className="flex-1 h-10 px-3 rounded-lg border text-sm outline-none font-mono"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                />
                <button type="button" onClick={() => setShowSecret(!showSecret)}
                  className="px-3 h-10 rounded-lg text-xs border cursor-pointer"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                  {showSecret ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Page URL</label>
              <input
                value={fbUrlInput}
                onChange={(e) => setFbUrlInput(e.target.value)}
                placeholder="https://facebook.com/YourPage"
                className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveFb}
                className="px-5 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition-all cursor-pointer">
                Save Connection
              </button>
              <button onClick={() => { setEditingFb(false); setFbUrlInput(fbPageUrl); setFbNameInput(fbPageName); setFbPageIdInput(fbPageId); setFbBusinessIdInput(fbBusinessId); setFbTokenInput(fbAccessToken); setFbAppIdInput(fbAppId); }}
                className="px-5 h-10 rounded-xl text-sm font-medium border cursor-pointer"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              {fbPageUrl && (
                <button onClick={handleClearFb}
                  className="px-5 h-10 rounded-xl text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer">
                  Disconnect
                </button>
              )}
            </div>
            <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "var(--bg-main)", color: "var(--text-secondary)" }}>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>How to get these credentials:</p>
              <p>1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-400">developers.facebook.com</a> and create an App</p>
              <p>2. Under Settings → Basic, copy the <strong>App ID</strong></p>
              <p>3. Go to your Facebook Page → About → copy the <strong>Page ID</strong></p>
              <p>4. Generate a <strong>Page Access Token</strong> via Graph API Explorer with <code>pages_manage_posts</code> permission</p>
            </div>
          </div>
        ) : fbPageUrl ? (
          <div className="p-4" style={{ backgroundColor: "var(--bg-main)" }}>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{fbPageName || "Facebook Business"}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {fbPageId && <span>Page ID: {fbPageId}</span>}
                  {fbBusinessId && <span>Business ID: {fbBusinessId}</span>}
                  {fbAppId && <span>App ID: {fbAppId}</span>}
                  {fbAccessToken && <span>Token: •••••{fbAccessToken.slice(-4)}</span>}
                </div>
                {fbPageUrl && (
                  <a href={fbPageUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs underline truncate block mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {fbPageUrl}
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setEditingFb(true); setFbUrlInput(fbPageUrl); setFbNameInput(fbPageName); setFbPageIdInput(fbPageId); setFbBusinessIdInput(fbBusinessId); setFbTokenInput(fbAccessToken); setFbAppIdInput(fbAppId); }}
                className="px-4 h-8 rounded-lg text-xs font-medium border cursor-pointer"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                Change
              </button>
              <button onClick={handleClearFb}
                className="px-4 h-8 rounded-lg text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer">
                Disconnect
              </button>
            </div>
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
              <Search className="size-5" /> Scan & Simulate Comment
            </h2>
            <form onSubmit={handleSimulate} className="space-y-3">
              <textarea
                value={simComment}
                onChange={(e) => setSimComment(e.target.value)}
                placeholder='Paste a Facebook comment here... e.g. "I want to buy this!"'
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                required
              />
              {simComment.trim() && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <Search className="size-3.5" />
                  {detectedKeyword ? (
                    <span>Detected keyword: <strong className="text-rose-400">{detectedKeyword.keyword}</strong> → {detectedKeyword.product_name} x{detectedKeyword.quantity}</span>
                  ) : (
                    <span>No matching keyword found in comment</span>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <input
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="Customer name (optional)"
                  className="flex-1 h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}
                />
                <button type="submit"
                  disabled={!detectedKeyword}
                  className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                  <ShoppingBag className="size-4" /> Simulate Order
                </button>
              </div>
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
