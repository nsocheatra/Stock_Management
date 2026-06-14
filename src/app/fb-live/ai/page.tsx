import { db } from "@/lib/db";
import AIClient from "./AIClient";

function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

export default function AIPage() {
  const settings = {
    ai_provider: getSetting("ai_provider"),
    ai_model: getSetting("ai_model"),
    ai_system_prompt: getSetting("ai_system_prompt"),
    ai_temperature: getSetting("ai_temperature"),
    ai_max_tokens: getSetting("ai_max_tokens"),
    ai_enabled: getSetting("ai_enabled"),
    ai_persona_tone: getSetting("ai_persona_tone"),
    ai_context_messages: getSetting("ai_context_messages"),
  };

  const faqs = db.prepare("SELECT * FROM messenger_faq ORDER BY created_at DESC").all() as Array<{
    id: number; question: string; answer: string; category: string;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-default">AI Assistant</h2>
        <p className="text-sm text-faint mt-1">
          Configure AI-powered responses and manage your knowledge base.
          When no keyword rule matches, the AI generates smart replies from your store data and FAQs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <AIClient settings={settings} faqs={faqs} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          {/* FAQ Knowledge Base */}
          <div className="bg-surface-blur border-surface rounded-2xl p-5 shadow-xl">
            <FAQSnippet faqs={faqs} />
          </div>
          {/* AI Status Card */}
          <div className="bg-surface-blur border border-surface rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-default">How AI Responses Work</h3>
            <ol className="space-y-2 text-xs text-muted">
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>User sends a message to your Page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>Check custom auto-reply rules for a match</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>If no rule matches, search FAQ knowledge base</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                <span>If no FAQ found, use AI to generate a response</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">5</span>
                <span>Send the reply back to the user</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQSnippet({ faqs }: { faqs: Array<{ id: number; question: string; answer: string; category: string }> }) {
  const faqCategories = [...new Set(faqs.map((f) => f.category))];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-default">Knowledge Base ({faqs.length})</h3>
        {faqCategories.length > 0 && (
          <span className="text-[10px] text-faint">{faqCategories.length} categories</span>
        )}
      </div>
      <p className="text-xs text-faint mb-3">
        FAQs are used by the AI to answer common questions. Add questions your customers frequently ask.
      </p>
      {faqs.length > 0 ? (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {faqs.map((faq) => (
            <details key={faq.id} className="group">
              <summary className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-surface cursor-pointer text-xs text-default font-medium hover:bg-black/30 transition-colors">
                <span className={`size-1.5 rounded-full ${faq.category === "shipping" ? "bg-blue-400" : faq.category === "returns" ? "bg-amber-400" : "bg-zinc-400"}`} />
                <span className="truncate flex-1">{faq.question}</span>
              </summary>
              <p className="p-2 text-xs text-muted border-l-2 border-violet-500/30 ml-2 mt-1">{faq.answer}</p>
            </details>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-faint">
          <p className="text-xs">No FAQs yet</p>
          <p className="text-[10px] mt-1">Add FAQs to build your knowledge base</p>
        </div>
      )}
    </div>
  );
}
