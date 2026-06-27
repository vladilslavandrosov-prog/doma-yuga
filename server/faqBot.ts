const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";

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

export async function askFaqBot(history: FaqChatMessage[]): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("FAQ bot is not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://doma-yuga.ru",
      "X-Title": "Doma Yuga FAQ Bot",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      temperature: 0.4,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Empty response from FAQ bot");
  }
  return reply.trim();
}
