import React, { useState } from "react";
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
  FileText
} from "lucide-react";
import { BotConfig } from "../types";
import { db, COLLECTIONS } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
  const [telegramBotUrl, setTelegramBotUrl] = useState(botConfig?.telegramBotUrl || "");
  const [telegramApiKey, setTelegramApiKey] = useState(botConfig?.telegramApiKey || "");
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
          telegramBotUrl: telegramBotUrl.trim(),
          telegramApiKey: telegramApiKey.trim(),
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
              </select>
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
      </form>
    </div>
  );
}
