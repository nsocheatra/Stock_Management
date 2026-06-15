import { T } from "@/components/T";
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
    ai_openai_key: getSetting("ai_openai_key"),
    ai_gemini_key: getSetting("ai_gemini_key"),
    ai_claude_key: getSetting("ai_claude_key"),
  };

  const faqs = db.prepare("SELECT * FROM messenger_faq ORDER BY created_at DESC").all() as Array<{
    id: number; question: string; answer: string; category: string;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-default"><T k="fbLive.ai.title" /></h2>
        <p className="text-sm text-faint mt-1"><T k="fbLive.ai.subtitle" /></p>
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
            <h3 className="text-sm font-semibold text-default"><T k="fbLive.ai.howItWorks" /></h3>
            <ol className="space-y-2 text-xs text-muted">
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span><T k="fbLive.ai.steps.0" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span><T k="fbLive.ai.steps.1" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span><T k="fbLive.ai.steps.2" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                <span><T k="fbLive.ai.steps.3" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">5</span>
                <span><T k="fbLive.ai.steps.4" /></span>
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
        <h3 className="text-sm font-semibold text-default"><T k="fbLive.ai.knowledgeBase" vars={{ count: faqs.length }} /></h3>
        {faqCategories.length > 0 && (
          <span className="text-[10px] text-faint"><T k="fbLive.ai.categories" vars={{ count: faqCategories.length }} /></span>
        )}
      </div>
      <p className="text-xs text-faint mb-3">
        <T k="fbLive.ai.kbDescription" />
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
          <p className="text-xs"><T k="fbLive.ai.noFaqs" /></p>
          <p className="text-[10px] mt-1"><T k="fbLive.ai.noFaqsHint" /></p>
        </div>
      )}
    </div>
  );
}
