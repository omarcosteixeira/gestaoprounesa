import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  Bot,
  Save,
  Key,
  Cpu,
  Send,
  Sparkles,
  Info,
  Sliders,
  CheckCircle2,
  FileText,
  RefreshCw,
  Check,
  AlertTriangle,
  History,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { BotConfig, TeamsAlertLog } from "../types";
import { db, COLLECTIONS } from "../firebase";
import { doc, setDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { executeDirectTeamsDispatch } from "../lib/teamsService";

interface Props {
  botConfig?: BotConfig;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminTreinamentoBotView({ botConfig, onToast }: Props) {
  const [trainingContext, setTrainingContext] = useState(
    botConfig?.trainingContext ||
      "Você é a atendente virtual da Estácio / Unesa. Seu objetivo é atender leads, tirar dúvidas sobre cursos de graduação, pós-graduação e técnicos, e auxiliá-los na inscrição e matrícula."
  );
  const [aiModel, setAiModel] = useState(botConfig?.aiModel || "google/gemini-2.5-flash");
  const [openRouterApiKey, setOpenRouterApiKey] = useState(botConfig?.openRouterApiKey || "");
  const [groqApiKey, setGroqApiKey] = useState(botConfig?.groqApiKey || "");
  const [telegramBotUrl, setTelegramBotUrl] = useState(botConfig?.telegramBotUrl || "");
  const [telegramApiKey, setTelegramApiKey] = useState(botConfig?.telegramApiKey || "");
  
  // Microsoft Teams Bot Config
  const [teamsBotUrl, setTeamsBotUrl] = useState(botConfig?.teamsBotUrl || "");
  const [teamsApiKey, setTeamsApiKey] = useState(botConfig?.teamsApiKey || "");
  const [teamsProcessWithAI, setTeamsProcessWithAI] = useState(botConfig?.teamsProcessWithAI !== false);
  const [teamsDefaultInstruction, setTeamsDefaultInstruction] = useState(botConfig?.teamsDefaultInstruction || "");

  // Test Runner State
  const [testChatId, setTestChatId] = useState("");
  const [testMessage, setTestMessage] = useState("Nova visita agendada. Cliente: Acme Corp. Endereço: Av. Central, 100. Motivo: Negociar renovação. Data: Hoje às 15h.");
  const [testingTeams, setTestingTeams] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Teams Audit Logs
  const [recentTeamsLogs, setRecentTeamsLogs] = useState<TeamsAlertLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    try {
      const q = query(
        collection(db, COLLECTIONS.TEAMS_ALERT_LOGS),
        orderBy("timestamp", "desc"),
        limit(15)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const logs: TeamsAlertLog[] = [];
          snap.forEach((docSnap) => {
            logs.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setRecentTeamsLogs(logs);
          setLoadingLogs(false);
        },
        (err) => {
          console.error("Error loading Teams logs:", err);
          setLoadingLogs(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error(e);
      setLoadingLogs(false);
    }
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(
        doc(db, COLLECTIONS.BOT_CONFIG, "main"),
        {
          trainingContext: trainingContext.trim(),
          aiModel: aiModel.trim(),
          openRouterApiKey: openRouterApiKey.trim(),
          groqApiKey: groqApiKey.trim(),
          telegramBotUrl: telegramBotUrl.trim(),
          telegramApiKey: telegramApiKey.trim(),
          teamsBotUrl: teamsBotUrl.trim(),
          teamsApiKey: teamsApiKey.trim(),
          teamsProcessWithAI,
          teamsDefaultInstruction: teamsDefaultInstruction.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onToast("Treinamento e configurações de IA do Bot salvas com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRunTeamsTest = async () => {
    if (!testChatId.trim()) {
      onToast("Informe o Chat ID (Base64) de teste.", "error");
      return;
    }
    if (!testMessage.trim()) {
      onToast("Informe a mensagem de teste.", "error");
      return;
    }

    setTestingTeams(true);
    setTestResult(null);

    const result = await executeDirectTeamsDispatch(
      {
        chatId: testChatId.trim(),
        mensagem: testMessage.trim(),
        processarComIA: teamsProcessWithAI,
        instrucaoIA: teamsDefaultInstruction.trim() || undefined,
        targetUrl: teamsBotUrl.trim() || undefined,
        apiKey: teamsApiKey.trim() || undefined,
        userName: "Administrador (Teste Manual)",
        origem: "Painel de Administração / Teste Teams",
      },
      botConfig
    );

    setTestResult(result);
    setTestingTeams(false);

    if (result.success) {
      onToast("Alerta enviado com sucesso via Microsoft Teams!", "success");
    } else {
      onToast(`Falha no envio: ${result.error}`, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="text-purple-600" size={24} />
            Treinamento do Bot & Inteligência Artificial
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Instruções, prompts de atendimento, conhecimento da instituição e chaves de IA para os robôs.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Save size={16} />
          <span>{saving ? "Salvando..." : "Salvar Treinamento"}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* System Prompt / Training Context */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-purple-600" size={18} />
              Contexto do Atendimento & Prompt do Sistema (System Prompt)
            </h3>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
              Instruções de IA
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Forneça a persona, as regras de resposta, informações sobre descontos, bolsas (FIES/Prouni), links de matrícula e orientações para que o robô responda com precisão.
          </p>

          <textarea
            rows={10}
            required
            value={trainingContext}
            onChange={(e) => setTrainingContext(e.target.value)}
            placeholder="Escreva aqui as instruções completas de treinamento da IA..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
          />
        </div>

        {/* AI Model & Keys */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="text-blue-600" size={18} />
              Provedor & Modelo de IA
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Modelo de Linguagem (LLM)
              </label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash (Recomendado - Ultrarrápido)</option>
                <option value="google/gemini-2.5-pro">Google Gemini 2.5 Pro (Alta Precisão)</option>
                <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                <option value="openai/gpt-4o">OpenAI GPT-4o</option>
                <option value="deepseek/deepseek-chat">DeepSeek Chat V3</option>
                <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                <optgroup label="GroqCloud (Ultrarrápido)">
                  <option value="llama-3.3-70b-versatile">Groq: Llama 3.3 70B Versatile</option>
                  <option value="llama-3.1-8b-instant">Groq: Llama 3.1 8B Instant</option>
                  <option value="mixtral-8x7b-32768">Groq: Mixtral 8x7B</option>
                  <option value="gemma2-9b-it">Groq: Gemma 2 9B</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Chave de API GroqCloud (Opcional)
              </label>
              <input
                type="password"
                placeholder="gsk_..."
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Chave de API OpenRouter (Opcional)
              </label>
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={openRouterApiKey}
                onChange={(e) => setOpenRouterApiKey(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Telegram Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Send className="text-sky-600" size={18} />
              Integração Telegram (Opcional)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                URL do Webhook / Bot Telegram
              </label>
              <input
                type="text"
                placeholder="https://api.telegram.org/bot..."
                value={telegramBotUrl}
                onChange={(e) => setTelegramBotUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Telegram API Key / Token
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGHIjkl..."
                value={telegramApiKey}
                onChange={(e) => setTelegramApiKey(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Microsoft Teams Bot Integration */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#464EB8] text-white flex items-center justify-center font-bold text-[11px]">
                  T
                </div>
                Integração Microsoft Teams (Bot de Alertas no Railway)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Envio automatizado de notificações de visitas, ações pendentes e cobranças com formatação inteligente via IA.
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#464EB8] bg-[#464EB8]/10 px-3 py-1 rounded-full self-start sm:self-auto">
              API Railway & Bot Framework
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL do Endpoint no Railway
                </label>
                <input
                  type="text"
                  placeholder="https://seu-bot.railway.app/api/enviar-aviso-teams"
                  value={teamsBotUrl}
                  onChange={(e) => setTeamsBotUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#464EB8]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Endpoint que recebe POST com payload contendo <code>chatId</code> e <code>mensagem</code>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chave de Autenticação (x-api-key)
                </label>
                <input
                  type="password"
                  placeholder="Senha definida no Railway para proteger a rota"
                  value={teamsApiKey}
                  onChange={(e) => setTeamsApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#464EB8]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enviada no header <code>x-api-key</code> para validar a autorização da requisição.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={teamsProcessWithAI}
                    onChange={(e) => setTeamsProcessWithAI(e.target.checked)}
                    className="w-4 h-4 rounded text-[#464EB8] focus:ring-[#464EB8]"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Processar com Inteligência Artificial (OpenRouter)
                  </span>
                </label>
                <p className="text-[10px] text-slate-400 ml-6 mt-0.5">
                  Quando ativo, a IA resume, formata com emojis e torna a mensagem visualmente clara para o funcionário em campo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instrução Personalizada para a IA (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={teamsDefaultInstruction}
                  onChange={(e) => setTeamsDefaultInstruction(e.target.value)}
                  placeholder="Ex: Mantenha um tom profissional e enfatize o horário e endereço da visita..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#464EB8] resize-none"
                />
              </div>
            </div>

            {/* Test Console */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#464EB8]" />
                    Testador Direto de Disparo Teams
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">
                    Fallback 3x Ativo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Insira o código Base64 de um colaborador e uma mensagem de teste para verificar a conectividade ponta a ponta.
                </p>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Chat ID do Destinatário (Base64)
                    </label>
                    <textarea
                      rows={2}
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      placeholder="Cole aqui a string Base64..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono break-all focus:outline-none focus:ring-1 focus:ring-[#464EB8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Mensagem de Teste (Dados Brutos)
                    </label>
                    <textarea
                      rows={2}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#464EB8]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  disabled={testingTeams}
                  onClick={handleRunTeamsTest}
                  className="w-full py-2 bg-[#464EB8] hover:bg-[#3b429f] disabled:bg-[#464EB8]/50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {testingTeams ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Enviando & Processando IA...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Disparar Alerta de Teste</span>
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={`mt-2.5 p-2.5 rounded-lg border text-xs leading-relaxed ${
                      testResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {testResult.success ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={14} className="text-rose-600" />
                      )}
                      <span>
                        {testResult.success
                          ? "Aviso enviado via Teams com sucesso!"
                          : "Erro no envio"}
                      </span>
                    </div>
                    {testResult.error && (
                      <p className="text-[11px] mt-0.5 font-mono break-all">
                        {testResult.error}
                      </p>
                    )}
                    {testResult.data && (
                      <pre className="text-[10px] mt-1 bg-white/70 p-1.5 rounded font-mono overflow-x-auto max-h-24">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History size={15} className="text-[#464EB8]" />
                Auditoria & Histórico Recente de Disparos no Teams
              </h4>
              <span className="text-[11px] text-slate-400">
                Últimos {recentTeamsLogs.length} registros
              </span>
            </div>

            {loadingLogs ? (
              <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={13} className="animate-spin text-[#464EB8]" />
                Carregando registros de auditoria...
              </div>
            ) : recentTeamsLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Nenhum disparo registrado ainda. Realize um teste de envio acima ou crie uma tarefa vinculada a um colaborador.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200/80">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Data / Hora</th>
                      <th className="py-2.5 px-3">Destinatário</th>
                      <th className="py-2.5 px-3">Mensagem</th>
                      <th className="py-2.5 px-3">Origem</th>
                      <th className="py-2.5 px-3">Tentativas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTeamsLogs.map((log) => {
                      const isSuccess = log.status === "sucesso" || log.status === "success";
                      let dateStr = "—";
                      try {
                        if (log.createdAt?.toDate) {
                          dateStr = log.createdAt.toDate().toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } else if (log.sentAt) {
                          dateStr = new Date(log.sentAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } else if (log.createdAt) {
                          dateStr = new Date(log.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        }
                      } catch {
                        dateStr = "—";
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check size={10} />
                                Sucesso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={log.error}>
                                <AlertTriangle size={10} />
                                Falha
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {dateStr}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-700 block">
                              {log.userName || "Colaborador"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block max-w-[140px] truncate" title={log.chatId || log.chatIdExcerpt}>
                              {log.chatIdExcerpt || (log.chatId ? `${log.chatId.substring(0, 12)}...` : "—")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[280px]">
                            <p className="line-clamp-2 text-slate-600 text-[11px]" title={log.mensagem}>
                              {log.mensagem}
                            </p>
                            {log.error && (
                              <p className="text-[10px] text-rose-500 font-mono mt-0.5 truncate" title={log.error}>
                                Erro: {log.error}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {log.origem || "Sistema"}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {log.tentativas || log.attempts || 1}x
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
