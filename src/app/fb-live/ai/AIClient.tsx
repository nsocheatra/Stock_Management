"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Brain, Bot, Thermometer, Text, MessageSquare,
  Plus, Trash2, Sparkles,
} from "lucide-react";
import { saveAISettings, addFAQ, deleteFAQ } from "@/lib/actions";

interface FAQ {
  id: number; question: string; answer: string; category: string;
}

export default function AIClient({ settings, faqs }: { settings: Record<string, string>; faqs: FAQ[] }) {
  const [saved, setSaved] = useState(false);
  const [showAddFAQ, setShowAddFAQ] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("general");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ role: string; text: string }>>([]);
  const router = useRouter();
  const enabled = settings.ai_enabled === "1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await saveAISettings(fd);
    if (result.success) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    const fd = new FormData();
    fd.set("question", faqQuestion.trim());
    fd.set("answer", faqAnswer.trim());
    fd.set("category", faqCategory);
    await addFAQ(fd);
    setFaqQuestion(""); setFaqAnswer(""); setFaqCategory("general");
    setShowAddFAQ(false);
    router.refresh();
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatLog((prev) => [...prev, { role: "user", text: chatInput.trim() }]);
    // Simulate AI response based on matching FAQ
    const input = chatInput.toLowerCase().trim();
    const matched = faqs.find((f) => input.includes(f.question.toLowerCase()) || f.question.toLowerCase().includes(input));
    if (matched) {
      setTimeout(() => {
        setChatLog((prev) => [...prev, { role: "ai", text: `📚 From knowledge base:\n${matched.answer}` }]);
      }, 500);
    } else {
      setTimeout(() => {
        setChatLog((prev) => [...prev, {
          role: "ai",
          text: `🤖 AI Response (simulated)\n\nThanks for your message! Based on my training, I'd help you with "${chatInput.trim()}".\n\nTo get actual AI responses, connect your OpenAI API key via the OPENAI_API_KEY environment variable.`,
        }]);
      }, 700);
    }
    setChatInput("");
  };

  return (
    <div className="space-y-6">
      {/* Settings form */}
      <form onSubmit={handleSubmit} className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between p-3 rounded-xl border border-surface">
          <div className="flex items-center gap-2">
            <Brain className={`size-4 ${enabled ? "text-emerald-400" : "text-muted"}`} />
            <span className="text-sm font-semibold text-default">AI-Powered Responses</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="hidden" name="ai_enabled" value={enabled ? "0" : "1"} />
            <input type="checkbox" defaultChecked={enabled}
              onChange={(e) => { (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.currentTarget.checked ? "1" : "0"; }}
              className="sr-only peer" />
            <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700" />
          </label>
        </div>

        {enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Provider</label>
                <select name="ai_provider" defaultValue={settings.ai_provider || "openai"} className="input-field">
                  <option value="openai">OpenAI</option>
                </select>
                <p className="text-xs text-faint mt-1">Set <code className="text-violet-300">OPENAI_API_KEY</code> in env</p>
              </div>
              <div>
                <label className="input-label flex items-center gap-2"><Bot className="size-3" /> Model</label>
                <select name="ai_model" defaultValue={settings.ai_model || "gpt-4o-mini"} className="input-field">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label flex items-center gap-2">
                  <Thermometer className="size-3" />
                  Temperature ({settings.ai_temperature || "0.7"})
                </label>
                <input name="ai_temperature" type="range" min="0" max="2" step="0.1"
                  defaultValue={settings.ai_temperature || "0.7"}
                  onChange={(e) => { const s = e.currentTarget.parentElement?.querySelector("span"); if (s) s.textContent = e.currentTarget.value; }}
                  className="w-full accent-violet-500" />
                <div className="flex justify-between text-[10px] text-faint"><span>Precise</span><span>Creative</span></div>
              </div>
              <div>
                <label className="input-label flex items-center gap-2"><Text className="size-3" /> Max Length</label>
                <select name="ai_max_tokens" defaultValue={settings.ai_max_tokens || "500"} className="input-field">
                  <option value="200">Short (200)</option><option value="500">Medium (500)</option>
                  <option value="1000">Long (1000)</option><option value="2000">Very Long (2000)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label flex items-center gap-2">
                  <Sparkles className="size-3" /> Persona Tone
                </label>
                <select name="ai_persona_tone" defaultValue={settings.ai_persona_tone || "friendly"} className="input-field">
                  <option value="friendly">Friendly &amp; Warm</option>
                  <option value="professional">Professional &amp; Formal</option>
                  <option value="casual">Casual &amp; Relaxed</option>
                  <option value="playful">Playful &amp; Fun</option>
                </select>
              </div>
              <div>
                <label className="input-label flex items-center gap-2">
                  <MessageSquare className="size-3" /> Conversation Context
                </label>
                <select name="ai_context_messages" defaultValue={settings.ai_context_messages || "5"} className="input-field">
                  <option value="3">Last 3 messages</option>
                  <option value="5">Last 5 messages</option>
                  <option value="10">Last 10 messages</option>
                  <option value="20">Last 20 messages</option>
                </select>
                <p className="text-xs text-faint mt-1">How many past messages to include for context</p>
              </div>
            </div>

            <div>
              <label className="input-label">System Prompt</label>
              <textarea name="ai_system_prompt" defaultValue={settings.ai_system_prompt} rows={4} className="input-field resize-none font-mono text-xs" />
              <p className="text-xs text-faint mt-1">Guides the AI&apos;s behavior when responding to customers.</p>
            </div>
          </>
        )}

        {!enabled && (
          <div className="text-center py-6 text-faint">
            <Brain className="size-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">AI features are disabled</p>
            <p className="text-xs mt-1">Enable AI to let the chatbot generate intelligent responses</p>
          </div>
        )}

        <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 border border-violet-500/20 flex items-center justify-center gap-2 cursor-pointer">
          <Save className="size-4" /> Save AI Settings
        </button>
        {saved && <div className="text-xs text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-400">AI settings saved!</div>}
      </form>

      {/* Chat Simulator + FAQ Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Simulator */}
        <div className="bg-surface-blur border-surface rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-surface flex items-center gap-2">
            <Bot className="size-4 text-violet-400" />
            <span className="text-xs font-semibold text-default">Test AI Responses</span>
          </div>
          <div className="flex-1 p-3 space-y-2 max-h-60 overflow-y-auto min-h-40">
            {chatLog.length > 0 ? (
              chatLog.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-violet-600/20 text-violet-200 border border-violet-500/20"
                      : "bg-zinc-800/50 text-muted border border-surface"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-faint">
                <MessageSquare className="size-6 mx-auto mb-1 opacity-40" />
                <p className="text-xs">Type a message to test the AI</p>
              </div>
            )}
          </div>
          <form onSubmit={handleChat} className="p-3 border-t border-surface flex gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a customer message..." className="input-field flex-1 text-xs" />
            <button type="submit" disabled={!chatInput.trim()} className="px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-40 transition-all cursor-pointer">
              <Send className="size-3.5" />
            </button>
          </form>
        </div>

        {/* FAQ Manager */}
        <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-default">Manage FAQs</h3>
            <button onClick={() => setShowAddFAQ(!showAddFAQ)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
              {showAddFAQ ? "Cancel" : "+ Add FAQ"}
            </button>
          </div>

          {showAddFAQ && (
            <form onSubmit={handleAddFAQ} className="space-y-2 p-3 rounded-xl bg-black/20 border border-surface">
              <div className="grid grid-cols-2 gap-2">
                <input value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} placeholder="Question" className="input-field text-xs" required />
                <select value={faqCategory} onChange={(e) => setFaqCategory(e.target.value)} className="input-field text-xs">
                  <option value="general">General</option>
                  <option value="shipping">Shipping</option>
                  <option value="returns">Returns</option>
                  <option value="pricing">Pricing</option>
                </select>
              </div>
              <textarea value={faqAnswer} onChange={(e) => setFaqAnswer(e.target.value)} placeholder="Answer..." rows={2} className="input-field resize-none text-xs" required />
              <button type="submit" className="w-full py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white cursor-pointer">
                <Plus className="size-3 inline mr-1" /> Add FAQ
              </button>
            </form>
          )}

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {faqs.length > 0 ? (
              faqs.map((faq) => (
                <div key={faq.id} className="p-2 rounded-lg bg-black/20 border border-surface">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-default truncate">{faq.question}</p>
                      <p className="text-[10px] text-faint line-clamp-1">{faq.answer}</p>
                      <span className="text-[10px] text-muted mt-0.5 block capitalize">{faq.category}</span>
                    </div>
                    <button onClick={async () => { await deleteFAQ(faq.id); router.refresh(); }} className="p-1 text-muted hover:text-rose-400 transition-colors shrink-0 cursor-pointer">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-faint text-center py-4">No FAQs added yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Send({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
