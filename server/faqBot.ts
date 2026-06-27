const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// OpenRouter periodically retires/renames free model slugs. Try the configured
// model first (if set), then fall back through a list of currently-known free
// models so the bot keeps working without a manual env var update.
const FALLBACK_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];
const CANDIDATE_MODELS = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL, ...FALLBACK_FREE_MODELS]
  : FALLBACK_FREE_MODELS;

const SYSTEM_PROMPT = `Ты — консультант строительной компании «Дома Юга» на сайте компании.
Отвечай кратко (2-4 предложения), вежливо и по-русски. Помогай посетителям сайта с вопросами
о строительстве домов, ремонте, отделке, ценах, сроках и порядке работы.

Факты о компании (используй их в ответах, не выдумывай других):
- Услуги: строительство домов под ключ, ремонт и реконструкция, отделка помещений, консультации по смете и материалам.
- Бесплатный выезд специалиста на объект для оценки.
- Смета готовится в течение 24 часов после выезда.
- Цена фиксируется в договоре и не меняется в процессе работ.
- Гарантия предоставляется на все виды выполненных работ.
- Чтобы начать работу: оставить заявку на сайте (имя, телефон, какая услуга нужна) — менеджер свяжется для уточнения деталей и выезда на объект.

Если вопрос не связан со строительством/ремонтом или ты не знаешь точного ответа (например, точная
стоимость конкретного проекта, сроки конкретной стройки) — не придумывай цифры, а вежливо предложи
оставить заявку на сайте, чтобы менеджер посчитал точно и связался.`;

export interface FaqChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function isFaqBotConfigured(): boolean {
  return !!OPENROUTER_API_KEY;
}

async function callOpenRouter(model: string, history: FaqChatMessage[]): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://doma-yuga.ru",
        "X-Title": "Doma Yuga FAQ Bot",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function askFaqBot(history: FaqChatMessage[]): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("FAQ bot is not configured");
  }

  let lastError: Error | null = null;
  for (const model of CANDIDATE_MODELS) {
    let response: Response;
    try {
      response = await callOpenRouter(model, history);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      lastError = new Error(`OpenRouter request failed for ${model}: ${response.status} ${text}`);
      // 404/400 usually means the model slug is retired/invalid — try the next candidate.
      if (response.status === 404 || response.status === 400) continue;
      throw lastError;
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      lastError = new Error(`Empty response from FAQ bot for model ${model}`);
      continue;
    }
    return reply.trim();
  }

  throw lastError ?? new Error("All FAQ bot models failed");
}
