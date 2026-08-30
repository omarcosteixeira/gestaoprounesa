import React, { useState } from "react";
import {
  MessageSquare,
  Bot,
  QrCode,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ExternalLink,
  Wifi,
  WifiOff,
  Copy,
  Info
} from "lucide-react";
import { BotConfig, WhatsAppMessage } from "../types";
import { db, COLLECTIONS } from "../firebase";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

interface Props {
  botConfig?: BotConfig;
  whatsappMessages?: WhatsAppMessage[];
  botStatuses?: Record<string, any>;
  setBotStatuses?: React.Dispatch<React.SetStateAction<any>>;
  callBotApi?: (path: string, options?: any) => Promise<any>;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminWhatsappApiView({
  botConfig,
  whatsappMessages = [],
  botStatuses = {},
  setBotStatuses,
  callBotApi,
  onToast,
}: Props) {
  // API URL Config
  const [apiUrl, setApiUrl] = useState(botConfig?.url || "");
  const [isActive, setIsActive] = useState(botConfig?.active ?? true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Test Message
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do Gestão Pro.");
  const [sendingTest, setSendingTest] = useState(false);

  // WhatsApp Message Templates Form
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState<WhatsAppMessage | null>(null);
  const [msgTipo, setMsgTipo] = useState<WhatsAppMessage["tipo"]>("bases");
  const [msgNome, setMsgNome] = useState("");
  const [msgTexto, setMsgTexto] = useState("");
  const [savingMsg, setSavingMsg] = useState(false);

  const handleSaveApiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await setDoc(
        doc(db, COLLECTIONS.BOT_CONFIG, "main"),
        {
          url: apiUrl.trim(),
          active: isActive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onToast("Configurações da API do WhatsApp salvas com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiUrl.trim()) {
      onToast("Por favor, preencha a URL da API do WhatsApp.", "error");
      return;
    }
    setTestingConnection(true);
    try {
      if (callBotApi) {
        const res = await callBotApi("/api/status");
        if (setBotStatuses && res) {
          setBotStatuses(res);
        }
        onToast("Conexão com a API testada com sucesso!");
      } else {
        const cleanUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
        const res = await fetch(`${cleanUrl}/api/status`);
        if (res.ok) {
          onToast("API do WhatsApp respondendo normalmente!");
        } else {
          onToast(`A API respondeu com status: ${res.status}`, "error");
        }
      }
    } catch (err: any) {
      console.error(err);
      onToast(`Falha ao conectar à API: ${err.message}`, "error");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim() || !testMessage.trim()) {
      onToast("Preencha o número de telefone e o texto da mensagem.", "error");
      return;
    }
    setSendingTest(true);
    try {
      if (callBotApi) {
        await callBotApi("/api/send", {
          method: "POST",
          body: JSON.stringify({
            number: testNumber.replace(/\D/g, ""),
            text: testMessage,
          }),
        });
        onToast("Mensagem de teste enviada com sucesso!");
      } else {
        const cleanUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
        const res = await fetch(`${cleanUrl}/api/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: testNumber.replace(/\D/g, ""),
            text: testMessage,
          }),
        });
        if (res.ok) {
          onToast("Mensagem de teste enviada com sucesso!");
        } else {
          throw new Error(`Status ${res.status}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao enviar mensagem de teste: ${err.message}`, "error");
    } finally {
      setSendingTest(false);
    }
  };

  const handleOpenAddMsg = () => {
    setEditingMsg(null);
    setMsgTipo("bases");
    setMsgNome("");
    setMsgTexto("");
    setIsMsgModalOpen(true);
  };

  const handleOpenEditMsg = (msg: WhatsAppMessage) => {
    setEditingMsg(msg);
    setMsgTipo(msg.tipo || "bases");
    setMsgNome(msg.nome || "");
    setMsgTexto(msg.texto || "");
    setIsMsgModalOpen(true);
  };

  const handleDeleteMsg = async (id: string) => {
    if (!confirm("Deseja realmente excluir este modelo de mensagem?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.WHATSAPP_MESSAGES, id));
      onToast("Modelo de mensagem excluído!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSaveMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTexto.trim()) {
      onToast("Insira o texto da mensagem.", "error");
      return;
    }
    setSavingMsg(true);
    try {
      const payload = {
        tipo: msgTipo,
        nome: msgNome.trim() || msgTipo,
        texto: msgTexto,
        updatedAt: serverTimestamp(),
      };

      if (editingMsg) {
        await updateDoc(doc(db, COLLECTIONS.WHATSAPP_MESSAGES, editingMsg.id), payload);
        onToast("Modelo de mensagem atualizado!");
      } else {
        await addDoc(collection(db, COLLECTIONS.WHATSAPP_MESSAGES), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Novo modelo de mensagem cadastrado!");
      }
      setIsMsgModalOpen(false);
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar modelo: ${err.message}`, "error");
    } finally {
      setSavingMsg(false);
    }
  };

  const botList = Object.entries(botStatuses);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="text-emerald-600" size={24} />
            Gestão do WhatsApp & API
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configuração da API de disparos, monitoramento de instâncias/conexão e modelos de mensagens.
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testingConnection}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={testingConnection ? "animate-spin" : ""} />
          <span>{testingConnection ? "Testando..." : "Verificar Status das Instâncias"}</span>
        </button>
      </div>

      {/* Grid Configuration & Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Bot className="text-blue-600" size={18} />
            Configurações do Gateway / Servidor WhatsApp
          </h3>

          <form onSubmit={handleSaveApiConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                URL da API (Evolution / WhatsApp Server) *
              </label>
              <input
                type="text"
                required
                placeholder="https://seu-servidor-whatsapp.com"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Endereço do backend para envio de mensagens, checagem de instâncias e QR Code.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activeBotCheckbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="activeBotCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                Habilitar integração com WhatsApp para todos os usuários
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Save size={14} />
                <span>{savingConfig ? "Salvando..." : "Salvar Configuração"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Test Message Box */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Send className="text-emerald-600" size={18} />
            Disparo de Mensagem de Teste
          </h3>

          <form onSubmit={handleSendTestMessage} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Número de Destino (com DDD) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 24999999999"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Texto do Teste *
              </label>
              <textarea
                rows={2}
                required
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={sendingTest}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Send size={14} />
                <span>{sendingTest ? "Enviando..." : "Enviar Mensagem de Teste"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Instâncias Status */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Smartphone className="text-purple-600" size={18} />
          Instâncias & Números Conectados
        </h3>

        {botList.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
            Nenhuma instância detectada no momento. Clique em "Verificar Status das Instâncias" para atualizar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {botList.map(([key, data]) => {
              const isOnline = data?.status === "online" || data?.connected === true;
              return (
                <div
                  key={key}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-800">{key}</span>
                    <div className="text-[11px] text-slate-500">{data?.name || data?.pushname || "Instância WhatsApp"}</div>
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      isOnline ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                    <span>{isOnline ? "Online" : "Desconectado"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp Message Templates Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="text-blue-600" size={20} />
              Modelos de Mensagens do WhatsApp
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie e personalize scripts com suporte a tags dinâmicas como <code className="text-blue-600 font-bold">[nome]</code>, <code className="text-blue-600 font-bold">[curso]</code>, <code className="text-blue-600 font-bold">[unidade]</code>, <code className="text-blue-600 font-bold">[saudacao]</code>.
            </p>
          </div>

          <button
            onClick={handleOpenAddMsg}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Modelo</span>
          </button>
        </div>

        {/* Templates List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {whatsappMessages.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-400 text-xs">
              Nenhum modelo de mensagem cadastrado.
            </div>
          ) : (
            whatsappMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                      {msg.nome || msg.tipo}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditMsg(msg)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMsg(msg.id)}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-4 font-medium bg-white p-3 rounded-lg border border-slate-100">
                    {msg.texto}
                  </p>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Tipo de Gatilho: <strong>{msg.tipo}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Add / Edit Template */}
      {isMsgModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="text-blue-600" size={20} />
              {editingMsg ? "Editar Modelo de Mensagem" : "Novo Modelo de Mensagem"}
            </h3>

            <form onSubmit={handleSaveMsg} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Título / Identificador</label>
                  <input
                    type="text"
                    placeholder="Ex: Contato Inicial, Lembrete Boleto..."
                    value={msgNome}
                    onChange={(e) => setMsgNome(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Categoria / Gatilho *</label>
                  <select
                    value={msgTipo}
                    onChange={(e) => setMsgTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bases">Bases Gerais</option>
                    <option value="historico">Histórico / Reabertura</option>
                    <option value="gap">GAP Acadêmico</option>
                    <option value="gap_0">GAP Sem Contato</option>
                    <option value="gap_1">GAP Em Tratativa</option>
                    <option value="gap_ok">GAP Concluído</option>
                    <option value="fiesProuni">FIES / ProUni</option>
                    <option value="fiesProuni_0">FIES/ProUni Pendente</option>
                    <option value="fiesProuni_1">FIES/ProUni Em Análise</option>
                    <option value="fiesProuni_ok">FIES/ProUni Concluído</option>
                    <option value="bases_renovacao">Bases Renovação</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Texto da Mensagem *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Olá [nome], tudo bem? Vi seu interesse no curso de [curso] na unidade [unidade]..."
                  value={msgTexto}
                  onChange={(e) => setMsgTexto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tag Quick Inserters */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-[11px] font-bold text-blue-800 block mb-1.5">Variáveis Disponíveis (Clique para inserir):</span>
                <div className="flex flex-wrap gap-1.5">
                  {["[nome]", "[curso]", "[unidade]", "[saudacao]", "[telefone]", "[responsavel]"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setMsgTexto((prev) => prev + " " + tag)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-mono font-bold cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingMsg}
                  onClick={() => setIsMsgModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMsg}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  {savingMsg ? "Salvando..." : "Salvar Modelo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
