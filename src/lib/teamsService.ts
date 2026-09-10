import { db, COLLECTIONS } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { BotConfig } from "../types";

export interface SendTeamsAlertParams {
  chatId: string;
  mensagem: string;
  processarComIA?: boolean;
  instrucaoIA?: string;
  targetUrl?: string;
  apiKey?: string;
  userName?: string;
  userEmail?: string;
  origem?: string;
}

export interface SendTeamsAlertResult {
  success: boolean;
  status?: number;
  message?: string;
  error?: string;
  data?: any;
}

// In-memory background queue to execute dispatches without blocking the UI
class TeamsQueueManager {
  private queue: SendTeamsAlertParams[] = [];
  private isProcessing = false;

  public enqueue(item: SendTeamsAlertParams): void {
    this.queue.push(item);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;
      try {
        await executeDirectTeamsDispatch(item);
      } catch (err) {
        console.error("[TeamsQueue] Erro ao despachar alerta da fila:", err);
      }
      // Brief pause between queue items to prevent rate limiting
      await new Promise((r) => setTimeout(r, 400));
    }

    this.isProcessing = false;
  }
}

export const teamsQueue = new TeamsQueueManager();

/**
 * Executes a direct HTTP POST to /api/enviar-aviso-teams with fallback and Firestore audit logging.
 */
export async function executeDirectTeamsDispatch(
  params: SendTeamsAlertParams,
  botConfig?: BotConfig
): Promise<SendTeamsAlertResult> {
  const {
    chatId,
    mensagem,
    processarComIA = true,
    instrucaoIA,
    targetUrl,
    apiKey,
    userName,
    userEmail,
    origem = "Sistema de Gestão",
  } = params;

  if (!chatId || !chatId.trim()) {
    return { success: false, error: "Chat ID do Teams não informado." };
  }

  if (!mensagem || !mensagem.trim()) {
    return { success: false, error: "Mensagem vazia." };
  }

  const finalTargetUrl =
    targetUrl ||
    botConfig?.teamsBotUrl ||
    (typeof window !== "undefined" ? (window as any).__TEAMS_BOT_URL : "");

  const finalApiKey =
    apiKey ||
    botConfig?.teamsApiKey ||
    (typeof window !== "undefined" ? (window as any).__TEAMS_API_KEY : "");

  try {
    const res = await fetch("/api/enviar-aviso-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: chatId.trim(),
        mensagem: mensagem.trim(),
        processarComIA,
        ...(instrucaoIA ? { instrucaoIA: instrucaoIA.trim() } : {}),
        ...(finalTargetUrl ? { targetUrl: finalTargetUrl } : {}),
        ...(finalApiKey ? { apiKey: finalApiKey } : {}),
        userName,
      }),
    });

    const data = await res.json().catch(() => ({}));

    // Record audit log in Firestore
    try {
      await addDoc(collection(db, COLLECTIONS.TEAMS_ALERT_LOGS), {
        chatIdExcerpt: chatId.length > 30 ? `${chatId.slice(0, 15)}...${chatId.slice(-10)}` : chatId,
        userName: userName || "Usuário",
        userEmail: userEmail || "",
        mensagem: mensagem.slice(0, 500),
        processarComIA,
        instrucaoIA: instrucaoIA || "",
        status: res.ok && data.success ? "sucesso" : "erro",
        httpCode: res.status,
        origem,
        tentativas: data.attempt || 1,
        error: res.ok && data.success ? null : (data.error || res.statusText),
        createdAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn("Não foi possível registrar o log de auditoria no Firestore:", dbErr);
    }

    if (res.ok && data.success) {
      return {
        success: true,
        status: res.status,
        message: data.message || "Aviso enviado via Teams com sucesso",
        data: data.data,
      };
    } else {
      return {
        success: false,
        status: res.status,
        error: data.error || `Erro HTTP ${res.status}: ${res.statusText}`,
        data,
      };
    }
  } catch (err: any) {
    console.error("[TeamsService] Falha na requisição:", err);
    return {
      success: false,
      error: err.message || "Erro de conexão ao enviar alerta para o Teams.",
    };
  }
}

/**
 * Enqueues an alert for background processing (Non-blocking queue).
 */
export function enqueueTeamsAlert(
  params: SendTeamsAlertParams,
  botConfig?: BotConfig
): void {
  teamsQueue.enqueue({
    ...params,
    targetUrl: params.targetUrl || botConfig?.teamsBotUrl,
    apiKey: params.apiKey || botConfig?.teamsApiKey,
  });
}
