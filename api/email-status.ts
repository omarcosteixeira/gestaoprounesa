export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Content-Type, x-brevo-key, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  try {
    const apiKey =
      (req.headers["x-brevo-key"] as string) ||
      req.body?.apiKey ||
      process.env.BREVO_API_KEY ||
      process.env.SENDINBLUE_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ success: false, error: "Chave da Brevo não informada." });
    }

    const { messageIds } = req.body || {};
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: "messageIds inválidos." });
    }

    const results: Record<string, string> = {};

    const checks = messageIds.slice(0, 10).map(async (msgId: string) => {
      try {
        const response = await fetch(
          `https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(msgId)}&limit=10`,
          {
            headers: {
              "api-key": apiKey.trim(),
              Accept: "application/json"
            }
          }
        );
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data?.events && Array.isArray(data.events) && data.events.length > 0) {
            const hasOpened = data.events.some(
              (e: any) =>
                e.event === "opened" || e.event === "unique_opened" || e.event === "click"
            );
            const hasDelivered = data.events.some((e: any) => e.event === "delivered");

            if (hasOpened) {
              results[msgId] = "opened";
            } else if (hasDelivered) {
              results[msgId] = "delivered";
            } else {
              results[msgId] = "sent";
            }
          }
        }
      } catch {
        // Ignore single message status check failure
      }
    });

    await Promise.all(checks);
    return res.status(200).json({ success: true, statuses: results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
