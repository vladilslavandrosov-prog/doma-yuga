const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramText(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("[telegram] Bot token or chat ID not configured, skipping notification");
    return;
  }

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

export async function sendTelegramTextTo(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("[telegram] Bot token not configured, skipping personal notification");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[telegram] Failed to send personal notification:", err);
    }
  } catch (error) {
    console.error("[telegram] Error sending personal notification:", error);
  }
}

export async function sendTelegramNotification(
  projectName: string,
  senderName: string,
  messageText: string,
) {
  const text = `💬 Сообщение\n\n` +
    `📋 Объект: ${projectName}\n` +
    `👤 От: ${senderName}\n\n` +
    `${messageText}`;
  await sendTelegramText(text);
}

export async function notifyPaymentReceived(projectName: string, amount: number) {
  const text = `💰 Новый платёж\n\n` +
    `📋 Объект: ${projectName}\n` +
    `Сумма: ${amount.toLocaleString("ru-RU")} ₽`;
  await sendTelegramText(text);
}

export async function notifyProjectCompleted(projectName: string) {
  const text = `✅ Проект завершён\n\n` +
    `📋 Объект: ${projectName}\n` +
    `Все позиции сметы выполнены — статус автоматически изменён на «Завершён».`;
  await sendTelegramText(text);
}

export async function notifyNewPhoto(projectName: string, itemName: string) {
  const text = `📸 Новое фото в фотоотчёте\n\n` +
    `📋 Объект: ${projectName}\n` +
    `Позиция: ${itemName}`;
  await sendTelegramText(text);
}

export async function notifyOverduePayment(projectName: string, remaining: number) {
  const text = `⏰ Напоминание об оплате\n\n` +
    `📋 Объект: ${projectName}\n` +
    `Остаток к оплате: ${remaining.toLocaleString("ru-RU")} ₽`;
  await sendTelegramText(text);
}

export async function notifyExtraWork(projectName: string, itemName: string, totalPrice: string) {
  const text = `➕ Дополнительная работа\n\n` +
    `📋 Объект: ${projectName}\n` +
    `Работа: ${itemName}\n` +
    `Сумма: ${parseFloat(totalPrice).toLocaleString("ru-RU")} ₽\n\n` +
    `Заказчик уведомлён в чате объекта.`;
  await sendTelegramText(text);
}

export async function notifyClientReminderDue(
  clientName: string,
  reminderText: string,
  priority: string,
  assigneeChatId?: string | null,
) {
  const priorityLabel = priority === "urgent" ? "🔴 Срочно" : priority === "low" ? "🔵 Не срочно" : "🟡 Обычная";
  const text = `📌 Напоминание по клиенту\n\n` +
    `👤 Клиент: ${clientName}\n` +
    `${priorityLabel}\n\n` +
    `${reminderText}`;
  if (assigneeChatId) {
    await sendTelegramTextTo(assigneeChatId, text);
  } else {
    await sendTelegramText(text);
  }
}
