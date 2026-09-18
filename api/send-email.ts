export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-brevo-key, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: `Método ${req.method} não permitido. Utilize POST.`
    });
  }

  try {
    const apiKey =
      (req.headers["x-brevo-key"] as string) ||
      req.body?.apiKey ||
      process.env.BREVO_API_KEY ||
      process.env.SENDINBLUE_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error:
          "A chave de API da Brevo (BREVO_API_KEY) não foi encontrada. Configure-a no painel da Vercel ou insira-a diretamente na interface de envio."
      });
    }

    const { recipients, subject, body, senderName, senderEmail, attachments } = req.body || {};

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: "Nenhum destinatário informado." });
    }

    if (!subject) {
      return res.status(400).json({ success: false, error: "O assunto é obrigatório." });
    }

    if (!body) {
      return res.status(400).json({ success: false, error: "O conteúdo do e-mail é obrigatório." });
    }

    const payload: any = {
      sender: {
        name: senderName || "Leads Pro Marketing",
        email: senderEmail || "estaciocomercialoeste@gmail.com"
      },
      to: recipients.map((email: string) => ({ email: email.trim() })),
      subject,
      htmlContent: body
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachment = attachments;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey.trim(),
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errMsg = data.message || `Erro retornado pela Brevo (HTTP ${response.status})`;
      if (errMsg.includes("unrecognised IP address")) {
        errMsg =
          "Bloqueio de Segurança da Brevo: Acesso bloqueado por IP. Acesse Configurações > Segurança no painel da Brevo e desative a restrição de IPs autorizados para esta chave.";
      }
      return res.status(response.status).json({ success: false, error: errMsg });
    }

    return res.status(200).json({ success: true, messageId: data.messageId });
  } catch (err: any) {
    console.error("Vercel send-email handler error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Erro interno ao processar disparo de e-mail na Vercel."
    });
  }
}
