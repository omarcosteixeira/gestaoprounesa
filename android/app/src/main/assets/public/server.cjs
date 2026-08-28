var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/bot-proxy", async (req, res) => {
    try {
      const { targetUrl, method, headers, body } = req.body;
      if (!targetUrl) {
        return res.status(400).json({ success: false, error: "Par\xE2metro targetUrl \xE9 obrigat\xF3rio." });
      }
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        return res.status(400).json({ success: false, error: "O targetUrl deve come\xE7ar com http:// ou https://" });
      }
      const fetchOptions = {
        method: method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...headers
        }
      };
      if (method && method.toUpperCase() === "POST" && body) {
        fetchOptions.body = JSON.stringify(body);
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15e3);
      fetchOptions.signal = controller.signal;
      try {
        const botResponse = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);
        const contentType = botResponse.headers.get("content-type") || "";
        let data;
        if (contentType.includes("application/json")) {
          data = await botResponse.json().catch(() => ({}));
        } else {
          data = { text: await botResponse.text().catch(() => "") };
        }
        return res.status(botResponse.status).json({
          success: botResponse.ok,
          status: botResponse.status,
          data
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
          return res.status(504).json({
            success: false,
            error: "Tempo limite esgotado (15 s). O bot no Railway est\xE1 inativo ou demorando muito para responder."
          });
        }
        throw err;
      }
    } catch (err) {
      console.error("Bot Proxy error:", err);
      return res.status(502).json({
        success: false,
        error: `O servidor proxy do LeadsPro n\xE3o conseguiu se conectar ao Bot no Railway. Ele pode estar reiniciando ou Offline. Detalhes: ${err.message}`
      });
    }
  });
  app.post("/api/send-email", async (req, res) => {
    try {
      const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: "A chave de API do Brevo (BREVO_API_KEY) n\xE3o est\xE1 configurada no servidor. Por favor, adicione-a nas vari\xE1veis de ambiente."
        });
      }
      const { recipients, subject, body, senderName, senderEmail, attachments } = req.body;
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: "Nenhum destinat\xE1rio informado." });
      }
      if (!subject) {
        return res.status(400).json({ success: false, error: "O assunto \xE9 obrigat\xF3rio." });
      }
      if (!body) {
        return res.status(400).json({ success: false, error: "O conte\xFAdo do e-mail \xE9 obrigat\xF3rio." });
      }
      let SibApiV3Sdk;
      try {
        const mod = await import("sib-api-v3-sdk");
        SibApiV3Sdk = mod.default || mod;
      } catch (err) {
        console.error("Failed to load sib-api-v3-sdk", err);
        return res.status(500).json({ success: false, error: "Falha ao carregar a biblioteca de envio de email. Verifique as dependencias." });
      }
      if (!SibApiV3Sdk.ApiClient) {
        const payload = {
          sender: {
            name: senderName || "Leads Pro Marketing",
            email: senderEmail || "estaciocomercialoeste@gmail.com"
          },
          to: recipients.map((email) => ({ email: email.trim() })),
          subject,
          htmlContent: body
        };
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
          payload.attachment = attachments;
        }
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const data2 = await response.json();
        if (!response.ok) {
          throw new Error(data2.message || "Erro retornado pela API do Brevo ao tentar enviar o e-mail.");
        }
        return res.json({ success: true, messageId: data2.messageId });
      }
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKeyAuth = defaultClient.authentications["api-key"];
      apiKeyAuth.apiKey = apiKey;
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.to = recipients.map((email) => ({ email: email.trim() }));
      sendSmtpEmail.sender = {
        name: senderName || "Leads Pro Marketing",
        email: senderEmail || "estaciocomercialoeste@gmail.com"
      };
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = body;
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        sendSmtpEmail.attachment = attachments;
      }
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      return res.json({ success: true, messageId: data.messageId });
    } catch (err) {
      console.error("Internal mail send error:", err);
      const errorResponse = err.response?.text ? JSON.parse(err.response.text) : null;
      let errMsg = errorResponse?.message || err.message || "Erro interno do servidor.";
      if (errMsg && errMsg.includes("unrecognised IP address")) {
        errMsg = "Bloqueio de Seguran\xE7a da Brevo: Acesso bloqueado por IP. Para resolver, acesse sua conta Brevo em Configura\xE7\xF5es > Seguran\xE7a (https://app.brevo.com/security/authorised_ips) e desabilite o controle de IPs Autorizados, ou assegure que esta chave SMTP n\xE3o tenha restri\xE7\xE3o.";
      }
      return res.status(500).json({
        success: false,
        error: errMsg
      });
    }
  });
  app.post("/api/email-status", async (req, res) => {
    try {
      const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ success: false });
      }
      const { messageIds } = req.body;
      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ success: false });
      }
      const results = {};
      const checks = messageIds.slice(0, 10).map(async (msgId) => {
        try {
          const response = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(msgId)}&limit=10`, {
            headers: {
              "api-key": apiKey,
              "Accept": "application/json"
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.events && data.events.length > 0) {
              const hasOpened = data.events.some((e) => e.event === "opened" || e.event === "unique_opened" || e.event === "click");
              const hasDelivered = data.events.some((e) => e.event === "delivered");
              if (hasOpened) {
                results[msgId] = "opened";
              } else if (hasDelivered) {
                results[msgId] = "delivered";
              } else {
                results[msgId] = "sent";
              }
            }
          }
        } catch (e) {
        }
      });
      await Promise.all(checks);
      return res.json({ success: true, statuses: results });
    } catch (err) {
      return res.status(500).json({ success: false });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
