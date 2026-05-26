const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramNotification(
  projectName: string,
  senderName: string,
  messageText: string,
) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("[telegram] Bot token or chat ID not configured, skipping notification");
    return;
  }

  const text = `💬 Сообщение\n\n` +
    `📋 Объект: ${projectName}\n` +
    `👤 От: ${senderName}\n\n` +
    `${messageText}`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[telegram] Failed to send notification:", err);
    } else {
      console.log("[telegram] Notification sent successfully");
    }
  } catch (error) {
    console.error("[telegram] Error sending notification:", error);
  }
}
