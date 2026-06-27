import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Здравствуйте! Я помогу ответить на вопросы о строительстве, ремонте, ценах и сроках. Чем могу помочь?",
};

export function FaqChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery<{ available: boolean }>({
    queryKey: ["/api/faq-chat/status"],
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (status && !status.available) return null;

  async function send() {
    const text = input.trim();
    if (!text || isSending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setIsSending(true);
    try {
      const res = await apiRequest("POST", "/api/faq-chat", { messages: next });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: e?.message || "Не получилось ответить. Попробуйте позже или оставьте заявку." },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 1000, fontFamily: "'Geologica','Segoe UI',sans-serif" }}>
      {open && (
        <div
          style={{
            width: 340,
            maxWidth: "calc(100vw - 40px)",
            height: 440,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 16px 48px rgba(0,0,0,.22)",
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          data-testid="faq-chat-panel"
        >
          <div
            style={{
              background: "#262B36",
              color: "#fff",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>Помощник «Дома Юга»</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", display: "flex" }}
              aria-label="Закрыть"
              data-testid="button-close-faq-chat"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "#F47B25" : "#F1EEE7",
                  color: m.role === "user" ? "#fff" : "#262B36",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap",
                }}
                data-testid={`faq-chat-message-${m.role}`}
              >
                {m.content}
              </div>
            ))}
            {isSending && (
              <div style={{ alignSelf: "flex-start", color: "#999", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="animate-spin" /> печатает…
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #EEE8DF", padding: 10, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ваш вопрос…"
              style={{
                flex: 1,
                border: "1px solid #DDD8CF",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
              }}
              data-testid="input-faq-chat"
            />
            <button
              onClick={send}
              disabled={isSending || !input.trim()}
              style={{
                background: "#F47B25",
                border: "none",
                borderRadius: 10,
                width: 36,
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isSending || !input.trim() ? 0.5 : 1,
              }}
              aria-label="Отправить"
              data-testid="button-send-faq-chat"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#F47B25",
          color: "#fff",
          border: "none",
          boxShadow: "0 8px 24px rgba(244,123,37,.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label={open ? "Закрыть чат" : "Открыть чат"}
        data-testid="button-toggle-faq-chat"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
