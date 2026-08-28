import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { OpenRouter } from "@openrouter/sdk";
import { OPENROUTER_MODELS, DEFAULT_MODEL } from "./src/ai-config";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Generous limit for HTML files or base64 embedded images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/routes-debug", (req, res) => {
    const routes: any[] = [];
    app._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          methods: middleware.route.methods
        });
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            routes.push({
              path: handler.route.path,
              methods: handler.route.methods
            });
          }
        });
      }
    });
    res.json(routes);
  });

  // API endpoint for testing bot connections and sending messages (Proxy)
  app.post("/api/bot-proxy", async (req, res) => {
    try {
      const { targetUrl, method, headers, body } = req.body;
      if (!targetUrl) {
        return res.status(400).json({ success: false, error: "Parâmetro targetUrl é obrigatório." });
      }

      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        return res.status(400).json({ success: false, error: "O targetUrl deve começar com http:// ou https://" });
      }

      const fetchOptions: RequestInit = {
        method: method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...headers
        }
      };

      if (method && method.toUpperCase() === "POST" && body) {
        fetchOptions.body = JSON.stringify(body);
      }

      // 15 seconds timeout to prevent pending threads
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
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
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
          return res.status(504).json({
            success: false,
            error: "Tempo limite esgotado (15 s). O bot no Railway está inativo ou demorando muito para responder."
          });
        }
        throw err;
      }
    } catch (err: any) {
      console.error("Bot Proxy error:", err);
      return res.status(502).json({
        success: false,
        error: `O servidor proxy do LeadsPro não conseguiu se conectar ao Bot no Railway. Ele pode estar reiniciando ou Offline. Detalhes: ${err.message}`
      });
    }
  });

  // API endpoint for Brevo E-mail Marketing sending
  app.post("/api/send-email", async (req, res) => {
    try {
      const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: "A chave de API do Brevo (BREVO_API_KEY) não está configurada no servidor. Por favor, adicione-a nas variáveis de ambiente."
        });
      }

      const { recipients, subject, body, senderName, senderEmail, attachments } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: "Nenhum destinatário informado." });
      }

      if (!subject) {
        return res.status(400).json({ success: false, error: "O assunto é obrigatório." });
      }

      if (!body) {
        return res.status(400).json({ success: false, error: "O conteúdo do e-mail é obrigatório." });
      }

      // Configure Brevo SDK
      let SibApiV3Sdk;
      try {
        const mod = await import('sib-api-v3-sdk');
        SibApiV3Sdk = mod.default || mod;
      } catch (err) {
        console.error("Failed to load sib-api-v3-sdk", err);
        return res.status(500).json({ success: false, error: "Falha ao carregar a biblioteca de envio de email. Verifique as dependencias." });
      }

      if (!SibApiV3Sdk.ApiClient) {
        // Safe robust fallback to native REST API since we encountered CJS import issues prior
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
            "api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Erro retornado pela API do Brevo ao tentar enviar o e-mail.");
        }
        return res.json({ success: true, messageId: data.messageId });
      }

      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKeyAuth = defaultClient.authentications['api-key'];
      apiKeyAuth.apiKey = apiKey;

      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      // Format recipients
      sendSmtpEmail.to = recipients.map((email: string) => ({ email: email.trim() }));
      
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
      
    } catch (err: any) {
      console.error("Internal mail send error:", err);
      // Brevo SDK usually throws err with err.response.text
      const errorResponse = err.response?.text ? JSON.parse(err.response.text) : null;
      let errMsg = errorResponse?.message || err.message || "Erro interno do servidor.";
      
      if (errMsg && errMsg.includes("unrecognised IP address")) {
        errMsg = "Bloqueio de Segurança da Brevo: Acesso bloqueado por IP. Para resolver, acesse sua conta Brevo em Configurações > Segurança (https://app.brevo.com/security/authorised_ips) e desabilite o controle de IPs Autorizados, ou assegure que esta chave SMTP não tenha restrição.";
      }

      return res.status(500).json({ 
        success: false, 
        error: errMsg 
      });
    }
  });

  // API endpoint for checking email status
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

      const results: Record<string, string> = {};

      // Limit in check size to avoid too many requests at once. We'll check individually
      // because Brevo's GET /smtp/statistics/events requires a messageId parameter
      // Note: in a real big system we'd use webhooks for scalability.
      const checks = messageIds.slice(0, 10).map(async (msgId) => {
        try {
          const response = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(msgId)}&limit=10`, {
            headers: {
              'api-key': apiKey,
              'Accept': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.events && data.events.length > 0) {
              // events are usually ordered, check if any is 'opened' or 'click'
              const hasOpened = data.events.some((e: any) => e.event === 'opened' || e.event === 'unique_opened' || e.event === 'click');
              const hasDelivered = data.events.some((e: any) => e.event === 'delivered');
              
              if (hasOpened) {
                results[msgId] = 'opened';
              } else if (hasDelivered) {
                results[msgId] = 'delivered';
              } else {
                results[msgId] = 'sent';
              }
            }
          }
        } catch (e) {
          // ignore individual fails
        }
      });

      await Promise.all(checks);
      return res.json({ success: true, statuses: results });
    } catch (err) {
      return res.status(500).json({ success: false });
    }
  });

  // API endpoint to fuzzy match typed material with current stock materials using AI (prioritizes OpenRouter, falls back to Gemini)
  app.post("/api/match-material", async (req, res) => {
    try {
      const { typedText, stockMaterials } = req.body;

      if (!typedText || !typedText.trim()) {
        return res.status(200).json({
          success: false,
          error: "O parâmetro typedText é obrigatório."
        });
      }

      if (!stockMaterials || !Array.isArray(stockMaterials) || stockMaterials.length === 0) {
        return res.json({
          success: true,
          matched: false,
          suggestion: null,
          reason: "Nenhum material cadastrado em estoque para correspondência."
        });
      }

      // 1. Direct Case-Insensitive Exact Match (Immediate Bypass for Perfect Matches)
      const exactMatch = stockMaterials.find(
        (mat: string) => mat && mat.trim().toLowerCase() === typedText.trim().toLowerCase()
      );
      if (exactMatch) {
        console.log(`[AI Match] Direct case-insensitive match found for "${typedText}" -> "${exactMatch}"`);
        return res.json({
          success: true,
          matched: true,
          suggestion: exactMatch,
          reason: `O item "${exactMatch}" foi encontrado no estoque (correspondência exata desconsiderando maiúsculas/minúsculas).`
        });
      }

      const prompt = `Você é o assistente inteligente de almoxarifado do Goorq.
Sua missão é analisar o texto digitado pelo usuário e identificar se existe algum item semanticamente equivalente no nosso estoque.

ATENÇÃO CRÍTICA PARA COMPATIBILIDADE DE LETRAS MAIÚSCULAS/MINÚSCULAS:
- Desconsidere totalmente qualquer diferença de maiúsculas e minúsculas (case-insensitive).
- Se o usuário digitar "PAPEL A4" ou "papel a4", e em estoque estiver "Papel A4", isso é considerado uma CORRESPONDÊNCIA IDÊNTICA. Reconheça-os como o mesmo item!
- Retorne sempre o nome do item com a grafia e caixa de letras EXATAS que constam na lista de estoque abaixo, independentemente de como o usuário digitou.

Exemplos de correspondência de sinônimos/equivalências comuns:
- "folha A4", "resma a4", "sulfite a4" -> "Papel A4" (se existir)
- "caneta azul" -> "Caneta Esferográfica Azul" (ou correspondente)
- "clips" -> "Clipe de papel"
- "borracha" -> "Borracha Escolar"
- "lapiseira" -> "Lápis Grafite"

Itens Atualmente em Estoque Disponíveis:
${stockMaterials.map((mat) => `- "${mat}"`).join("\n")}

Texto digitado pelo usuário: "${typedText}"

Se você encontrar um item na lista de estoque que seja semanticamente equivalente ou uma variação óbvia/sinônimo do texto digitado pelo usuário, retorne um JSON puro estruturado com "matched": true, o "suggestion" contendo o nome EXATO do item na lista de estoque, e uma justificativa amigável em português em "reason".
Caso contrário (se não houver correspondência lógica ou for um item completamente diferente), retorne um JSON puro estruturado com "matched": false, "suggestion": null e explique brevemente em "reason" que não encontrou um item similar.`;

      const parseJSONRobustly = (text: string) => {
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "");
          cleaned = cleaned.replace(/\n?```$/, "");
        }
        return JSON.parse(cleaned.trim());
      };

      // 0. Try OpenRouter API first (user's new preference)
      const openRouterApiKey = req.body.openRouterApiKey || process.env.OPENROUTER_API_KEY;
      if (openRouterApiKey) {
        try {
          console.log("[AI Match] Using OpenRouter SDK for material match...");
          const openrouter = new OpenRouter({ apiKey: openRouterApiKey });
          
          const response = await openrouter.chat.send({
            chatRequest: {
              model: req.body.aiModel || DEFAULT_MODEL,
              messages: [
                {
                  role: "system",
                  content: `Você é um assistente de almoxarifado altamente preciso. Responda estritamente no formato JSON:
{
  "matched": true | false,
  "suggestion": "Nome Exato do Item" | null,
  "reason": "Sua explicação amigável em português"
}`
                },
                {
                  role: "user",
                  content: prompt
                }
              ]
            }
          });

          const content = response.choices?.[0]?.message?.content;
          if (content) {
            const result = parseJSONRobustly(content);
            return res.json({
              success: true,
              ...result
            });
          }
        } catch (openRouterErr: any) {
          console.error("[AI Match] OpenRouter SDK call failed:", openRouterErr.message);
        }
      }

      // 2. Fallback to Gemini
      console.log("[AI Match] Falling back to Gemini for material match...");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          error: "A chave de API do Gemini (GEMINI_API_KEY) não está configurada no servidor."
        });
      }

      // Initialize Gemini Client
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matched: {
                type: Type.BOOLEAN,
                description: "Se foi encontrada uma correspondência semântica clara e confiável.",
              },
              suggestion: {
                type: Type.STRING,
                description: "O nome EXATO do item de estoque correspondente. Deve ser um dos itens da lista de estoque informada, ou null.",
              },
              reason: {
                type: Type.STRING,
                description: "Uma explicação curta e amigável em português sobre por que houve a correspondência ou o que foi analisado.",
              },
            },
            required: ["matched", "reason"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Resposta vazia retornada pelo modelo Gemini.");
      }

      const result = parseJSONRobustly(responseText);
      return res.json({
        success: true,
        ...result
      });

    } catch (err: any) {
      console.error("Erro no match de material via IA:", err);
      return res.status(200).json({
        success: false,
        error: `Erro ao processar inteligência artificial para correspondência: ${err.message}`
      });
    }
  });

  // API endpoint to change any user's password directly (Admin only)
  app.post("/api/direct-pw-update", async (req, res) => {
    try {
      const { uid, newPassword, servidor, adminEmail } = req.body;

      const allowedAdmins = ["marcos.teixeira@estacio.br", "canaldonutri@gmail.com"];
      if (!allowedAdmins.includes(adminEmail)) {
        return res.status(200).json({
          success: false,
          error: "Apenas o Administrador Master tem autorização para realizar a alteração de senhas diretamente."
        });
      }

      if (!uid || !newPassword) {
        return res.status(200).json({
          success: false,
          error: "Os parâmetros uid e newPassword são obrigatórios."
        });
      }

      if (newPassword.length < 6) {
        return res.status(200).json({
          success: false,
          error: "A senha deve ter no mínimo 6 caracteres."
        });
      }

      const targetServer = servidor === "comercial" ? "comercial" : servidor === "unesa" ? "unesa" : "principal";
      const projectId = targetServer === "comercial"
        ? "gestaodeleadspro-d4230"
        : targetServer === "unesa"
        ? "unesa-gestaopro"
        : "gestaopro-761e1";
      const credentialEnv = targetServer === "comercial"
        ? process.env.FIREBASE_SERVICE_ACCOUNT_COMERCIAL
        : targetServer === "unesa"
        ? process.env.FIREBASE_SERVICE_ACCOUNT_UNESA
        : process.env.FIREBASE_SERVICE_ACCOUNT_PRINCIPAL;

      let appInstance;
      const existingApps = getApps();
      const appName = `admin_${targetServer}`;
      const existingApp = existingApps.find(a => a.name === appName);

      if (existingApp) {
        appInstance = existingApp;
      } else {
        const options: any = { projectId };
        if (credentialEnv) {
          try {
            const serviceAccount = JSON.parse(credentialEnv);
            options.credential = cert(serviceAccount);
          } catch (e: any) {
            console.error(`Erro ao decodificar conta de serviço para ${targetServer}:`, e);
          }
        } else {
          console.warn(`Aviso: Credenciais (FIREBASE_SERVICE_ACCOUNT_${targetServer.toUpperCase()}) não encontradas. O servidor tentará usar as credenciais padrão do ambiente.`);
        }
        appInstance = initializeApp(options, appName);
      }

      try {
        const authAdmin = getAuth(appInstance);
        await authAdmin.updateUser(uid, {
          password: newPassword
        });

        return res.status(200).json({
          success: true,
          message: "Senha alterada com sucesso!"
        });
      } catch (authErr: any) {
        console.error(`Erro do Firebase Auth Admin (${targetServer}):`, authErr);
        
        let customError = authErr.message;
        if (
          authErr.code === "auth/invalid-credential" ||
          authErr.code === "auth/unauthorized-continued-action" ||
          authErr.message.includes("credential") ||
          authErr.message.includes("permission") ||
          authErr.message.includes("identitytoolkit") ||
          authErr.message.includes("API key")
        ) {
          customError = `A alteração direta administrativa de senha requer uma Conta de Serviço (Service Account) configurada para o servidor "${targetServer}". Como as credenciais administrativas do projeto "${projectId}" não estão configuradas no servidor, utilize a opção "Enviar E-mail de Redefinição de Senha" abaixo, que é 100% nativa, imediata e funciona perfeitamente para ambos os servidores!`;
        }
        
        return res.status(200).json({
          success: false,
          error: customError
        });
      }
    } catch (err: any) {
      console.error("Erro ao processar alteração de senha:", err);
      return res.status(200).json({
        success: false,
        error: `Erro ao processar alteração de senha: ${err.message}`
      });
    }
  });

  // API endpoint to get available AI models
  app.get("/api/ai/models", (req, res) => {
    res.json({ success: true, models: OPENROUTER_MODELS });
  });

  // API endpoint for dynamic reports/dashboards via AI
  app.post("/api/reports/analyze", async (req, res) => {
    try {
      const { query: searchQuery, dataSummary, botUrl } = req.body;
      if (!searchQuery) {
        return res.status(400).json({ success: false, error: "A consulta (query) é obrigatória." });
      }

      // 1. Try to forward the request to the Railway Bot first if configured
      if (botUrl) {
        try {
          const cleanUrl = botUrl.endsWith("/") ? botUrl.slice(0, -1) : botUrl;
          const targetUrl = `${cleanUrl}/api/reports/analyze`;
          console.log(`[AI Reports] Forwarding analysis request to bot URL: ${targetUrl}`);
          
          const botResponse = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: searchQuery, dataSummary }),
            signal: AbortSignal.timeout(15000)
          });
          
          if (botResponse.ok) {
            const contentType = botResponse.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const botData = await botResponse.json();
              if (botData && (botData.success || botData.report)) {
                console.log("[AI Reports] Successfully received report from Railway Bot API");
                return res.json({
                  success: true,
                  report: botData.report || botData
                });
              }
            } else {
              const errText = await botResponse.text();
              console.warn("[AI Reports] Railway Bot API returned non-JSON content:", errText.slice(0, 100));
            }
          } else {
            console.warn(`[AI Reports] Railway Bot API returned status ${botResponse.status}`);
          }
        } catch (botErr: any) {
          console.warn("[AI Reports] Attempt to use Railway Bot API failed:", botErr.message);
        }
      }

      // Helper function to clean markdown code blocks around JSON
      const parseJSONRobustly = (text: string) => {
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "");
          cleaned = cleaned.replace(/\n?```$/, "");
        }
        return JSON.parse(cleaned.trim());
      };

      // 2. Try OpenRouter API first (user's new preference)
      const openRouterApiKey = req.body.openRouterApiKey || process.env.OPENROUTER_API_KEY;
      if (openRouterApiKey) {
        try {
          console.log("[AI Reports] Using OpenRouter SDK for analysis...");
          const openrouter = new OpenRouter({ apiKey: openRouterApiKey });
          
          const response = await openrouter.chat.send({
            chatRequest: {
              model: req.body.aiModel || DEFAULT_MODEL,
              messages: [
                {
                  role: "system",
                  content: `Você é o "Goorq AI", um analista de inteligência de negócios (BI) extremamente capacitado.
Você deve analisar os dados estatísticos fornecidos e a pergunta do usuário e responder estritamente no formato JSON estruturado com os seguintes campos:
{
  "title": "Título curto do relatório",
  "answer": "Análise estratégica rica em formato markdown em português (nunca use cabeçalhos tipo # ou ##)",
  "cards": [
    { "title": "...", "value": "...", "icon": "users|target|file-text|check-circle|trending-up|briefcase|activity|calendar|message-square|award|percent|shield-alert", "color": "blue|emerald|purple|amber|rose|cyan|indigo|slate" }
  ],
  "chart": {
    "type": "bar|line|pie",
    "title": "Título do gráfico",
    "data": [{ "name": "Rótulo", "value": 123 }],
    "xKey": "name",
    "yKey": "value"
  } | null,
  "suggestions": ["pergunta 1", "pergunta 2"]
}
Retorne exclusivamente o JSON puro. Não adicione textos adicionais antes ou depois.`
                },
                {
                  role: "user",
                  content: `Pergunta do usuário: "${searchQuery}"\n\nResumo estatístico:\n${JSON.stringify(dataSummary)}`
                }
              ]
            }
          });

          const content = response.choices?.[0]?.message?.content;
          if (content) {
            const result = parseJSONRobustly(content);
            return res.json({
              success: true,
              report: result
            });
          }
        } catch (openRouterErr: any) {
          console.error("[AI Reports] OpenRouter SDK call failed:", openRouterErr.message);
        }
      }

      // 3. Fallback to Gemini if no other option succeeded
      console.log("[AI Reports] Using Gemini as fallback AI...");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          error: "A chave de API do Gemini (GEMINI_API_KEY) não está configurada no servidor. Por favor, adicione-a no painel de configurações para ativar os relatórios com inteligência artificial."
        });
      }

      // Initialize Gemini Client
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Você é o "Goorq AI", um analista de inteligência de negócios (BI) extremamente capacitado para responder perguntas e gerar dashboards de inteligência sobre o sistema Goorq.
O usuário está visualizando a aba de Relatórios e fez a seguinte busca ou pergunta: "${searchQuery}"

Aqui está o resumo estatístico em tempo real do banco de dados (Firestore) do sistema:
${JSON.stringify(dataSummary, null, 2)}

Sua tarefa é analisar o resumo estatístico fornecido e responder à pergunta do usuário de forma inteligente e baseada em dados reais.
Retorne um JSON contendo uma análise textual rica, de 3 a 4 cartões de métricas fundamentais (com título, valor e ícones) e um gráfico dinâmico (com dados reais estruturados) que ilustre a resposta perfeitamente.

Regras importantes de preenchimento dos campos JSON:
1. "title": Título curto, direto e profissional (ex: "Leads por Promotor", "Análise de Empresas Conveniadas").
2. "answer": Uma análise estratégica e insights em markdown detalhando os dados. Mencione rankings, sugestões operacionais de BI (ex: "O promotor X está com maior volume de leads", "O seguimento Y é o mais forte"). Use tabelas se for útil. Nunca use cabeçalhos tipo # ou ##.
3. "cards": Uma lista de até 4 cartões de destaque. Os valores devem ser strings (ex: "45 leads", "12%", "Ativas"). O "icon" deve ser estritamente um destes: "users", "target", "file-text", "check-circle", "trending-up", "briefcase", "activity", "calendar", "message-square", "award", "percent", "shield-alert". O "color" deve ser um destes: "blue", "emerald", "purple", "amber", "rose", "cyan", "indigo", "slate".
4. "chart": Configuração de gráfico se fizer sentido (se não, envie null). O gráfico deve conter:
   - "type": "bar" (comparar valores ou rankings), "line" (tendências temporais) ou "pie" (proporções e fatias).
   - "title": Título amigável do gráfico.
   - "data": Uma lista de objetos simples com as chaves exatas "name" (string) e "value" (number). Por exemplo: [{"name": "Pendente", "value": 24}, {"name": "Convertido", "value": 12}].
   - "xKey": Sempre defina como "name".
   - "yKey": Sempre defina como "value".
5. "suggestions": Uma lista de 2 a 3 perguntas sugeridas para dar sequência rápida baseadas nos dados fornecidos.

Não invente dados que não estão no resumo fornecido. Se alguma informação for nula ou zero, reporte corretamente.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Título curto e profissional para o relatório gerado.",
              },
              answer: {
                type: Type.STRING,
                description: "Análise estratégica e insights em formato markdown em português.",
              },
              cards: {
                type: Type.ARRAY,
                description: "Lista de até 4 cartões de destaque com métricas importantes.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    value: { type: Type.STRING },
                    icon: { type: Type.STRING, description: "Ícone lucide: users, target, file-text, check-circle, trending-up, briefcase, activity, calendar, message-square, award, percent, shield-alert" },
                    color: { type: Type.STRING, description: "Cor Tailwind: blue, emerald, purple, amber, rose, cyan, indigo, slate" },
                  },
                  required: ["title", "value", "icon", "color"],
                },
              },
              chart: {
                type: Type.OBJECT,
                description: "Configuração do gráfico dinâmico (pode ser null).",
                properties: {
                  type: { type: Type.STRING, description: "bar, line ou pie" },
                  title: { type: Type.STRING },
                  data: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "Rótulo do dado" },
                        value: { type: Type.NUMBER, description: "Valor do dado" },
                      },
                      required: ["name", "value"]
                    }
                  },
                  xKey: { type: Type.STRING },
                  yKey: { type: Type.STRING },
                },
                required: ["type", "title", "data", "xKey", "yKey"],
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de 2 a 3 perguntas sugeridas."
              }
            },
            required: ["title", "answer", "cards", "suggestions"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Resposta vazia retornada pelo modelo Gemini.");
      }

      const result = parseJSONRobustly(responseText);
      return res.json({
        success: true,
        report: result
      });

    } catch (err: any) {
      console.error("Erro na análise de relatórios via IA:", err);
      return res.status(200).json({
        success: false,
        error: `Erro ao processar sua análise inteligente: ${err.message}`
      });
    }
  });

  // HUNTER: Buscar novas oportunidades (OpenRouter)
  app.post("/api/hunter/search", async (req, res) => {
    try {
      const { location, empresasExistentes } = req.body;
      if (!location) {
        return res.status(400).json({ success: false, error: "Localização é obrigatória." });
      }

      const openRouterApiKey = req.body.openRouterApiKey || process.env.OPENROUTER_API_KEY;

      if (!openRouterApiKey) {
         return res.status(500).json({ success: false, error: "Chave da API OpenRouter não configurada no servidor." });
      }

      const systemInstruction = `Você é a HUNTER, uma IA especialista em encontrar novas oportunidades de parcerias corporativas.
Sua missão é buscar na internet empresas, ONGs, sindicatos, associações, escolas, clínicas e organizações com CNPJ na localização informada.
Você receberá uma lista de empresas que já estão em nosso sistema. VOCÊ DEVE IGNORÁ-LAS e NÃO incluí-las nos resultados de forma alguma.
Retorne APENAS organizações novas. Seja abrangente na sua busca.
Sua resposta deve ser estritamente no formato JSON. Retorne UM OBJETO com a chave "empresas" contendo um array de objetos com as chaves: 'nome', 'ramo', 'endereco', 'telefone'. Não adicione markdown como \`\`\`json.`;

      const promptStr = `Localização: ${location}\nEmpresas já no sistema (NÃO INCLUIR): ${(empresasExistentes || []).join(", ")}`;

      console.log("[AI Hunter] Using OpenRouter SDK for search...");
      const openrouter = new OpenRouter({ apiKey: openRouterApiKey });

      const response = await openrouter.chat.send({
        chatRequest: {
          model: req.body.aiModel || DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: systemInstruction
            },
            {
              role: "user",
              content: promptStr
            }
          ]
        }
      });

      const text = response.choices?.[0]?.message?.content;
      if (!text) {
        return res.status(500).json({ success: false, error: "Resposta vazia da IA." });
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(text);
      } catch (parseError) {
        // Fallback for markdown wrapped json
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleanText);
      }

      return res.json({ success: true, results: parsedResult.empresas || [] });
    } catch (err: any) {
      console.error("Erro na busca da HUNTER:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/ai/variations", async (req, res) => {
    const { message, openRouterApiKey, aiModel } = req.body;
    
    if (!openRouterApiKey) {
      return res.status(400).json({ error: "OpenRouter API Key is required" });
    }

    try {
      const openrouter = new OpenRouter({ apiKey: openRouterApiKey });
      
      const prompt = `Crie 4 variações diferentes da seguinte mensagem de oferta de WhatsApp, mantendo o contexto e os gatilhos mentais, mas alterando as palavras para evitar detecção de spam. Mantenha os placeholders como [nome], [curso], [matrícula] se existirem.
      
Mensagem original:
"${message}"

Retorne as 4 variações estritamente no formato JSON como um array de strings:
["variação 1", "variação 2", "variação 3", "variação 4"]
Retorne apenas o JSON puro.`;

      const response = await openrouter.chat.send({
        chatRequest: {
          model: aiModel || DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: "Você é um especialista em copy para WhatsApp focado em conversão e evitar banimentos."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }
      });

      const text = response.choices?.[0]?.message?.content || "";
      let variations = [];
      try {
        variations = JSON.parse(text);
      } catch (parseError) {
        // Fallback for markdown wrapped json
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        variations = JSON.parse(cleanText);
      }

      res.json({ variations });
    } catch (error: any) {
      console.error("AI Variations Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/crm/sentiment", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: "Texto é obrigatório." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Return default neutral if no API key
        return res.json({ success: true, sentiment: "Neutro" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analise o sentimento da seguinte mensagem de um cliente e responda APENAS com uma destas três palavras: Positivo, Negativo ou Neutro.\n\nMensagem: "${text}"\n\nSentimento:`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let sentiment = response.text?.trim() || "Neutro";
      
      // Normalize
      const lower = sentiment.toLowerCase();
      if (lower.includes("positivo")) sentiment = "Positivo";
      else if (lower.includes("negativo")) sentiment = "Negativo";
      else sentiment = "Neutro";

      res.json({ success: true, sentiment });
    } catch (error: any) {
      console.error("Sentiment analysis error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
