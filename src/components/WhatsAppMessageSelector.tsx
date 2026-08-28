import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, MessageSquare, Bot, Send, Sparkles, Check, Trash2 } from "lucide-react";
import { BotConfig, WhatsAppMessage } from "../types";

interface WhatsAppMessageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  messages: WhatsAppMessage[];
  onSelect: (msg: string) => void;
  leadName: string;
  leadCurso?: string;
  botConfig?: BotConfig;
  onSendBot?: (msg: string | string[], contactName?: string) => void;
  forceBotOnly?: boolean;
  leadMatricula?: string;
}

export function WhatsAppMessageSelector({
  isOpen,
  onClose,
  messages,
  onSelect,
  leadName,
  leadCurso,
  botConfig,
  onSendBot,
  forceBotOnly,
  leadMatricula,
}: WhatsAppMessageSelectorProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>(forceBotOnly ? [] : [0]);
  const [aiVariations, setAiVariations] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const selectedMessagesList = useMemo(() => {
    const list = selectedIndices.map(idx => messages[idx]).filter(Boolean);
    // If we have AI variations and only 1 original message was selected
    if (aiVariations.length > 0 && selectedIndices.length === 1) {
      const original = messages[selectedIndices[0]];
      return [original, ...aiVariations.map((v, i) => ({ id: `ai-${i}`, texto: v, nome: `Variação IA ${i + 1}`, tipo: original.tipo }))];
    }
    return list;
  }, [selectedIndices, messages, aiVariations]);

  const toggleSelection = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      setSelectedIndices(selectedIndices.filter(i => i !== idx));
    } else {
      if (selectedIndices.length < 5) {
        setSelectedIndices([...selectedIndices, idx]);
        // Reset AI variations if multiple are selected manually
        if (selectedIndices.length + 1 > 1) {
          setAiVariations([]);
          setShowAiPrompt(false);
        }
      }
    }
  };

  const handleGenerateVariations = async () => {
    if (selectedIndices.length !== 1 || !botConfig?.openRouterApiKey) return;
    
    setIsGeneratingAi(true);
    try {
      const response = await fetch("/api/ai/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messages[selectedIndices[0]].texto,
          openRouterApiKey: botConfig.openRouterApiKey,
          aiModel: botConfig.aiModel
        }),
      });
      const data = await response.json();
      if (data.variations) {
        setAiVariations(data.variations);
        setShowAiPrompt(false);
      }
    } catch (err) {
      console.error("AI Variations Error:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const previewText = useMemo(() => {
    if (selectedMessagesList.length === 0) return "";
    // Show preview of the first selected message
    let preview = selectedMessagesList[0].texto;
    if (!forceBotOnly) {
      preview = preview.replace(/\[nome\]/gi, leadName || "");
      if (leadCurso) preview = preview.replace(/\[curso\]/gi, leadCurso);
      if (leadMatricula)
        preview = preview.replace(/\[matr[ií]cula\]/gi, leadMatricula);
    }
    return preview;
  }, [selectedMessagesList, forceBotOnly, leadName, leadCurso, leadMatricula]);

  const canUseBot = botConfig?.url && onSendBot;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {forceBotOnly ? "Disparo em Massa" : "Selecionar Mensagem"}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {forceBotOnly
                ? "Escolha o modelo para enviar a todos."
                : `Escolha como enviar para ${leadName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {messages.length > 0 ? (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Message Selection */}
              <div className="flex-1 space-y-3 md:border-r border-slate-100 md:pr-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Modelos de Mensagem {forceBotOnly && "(Selecione até 5)"}
                </label>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {messages.map((msg, idx) => (
                    <button
                      key={msg.id}
                      onClick={() => forceBotOnly ? toggleSelection(idx) : setSelectedIndices([idx])}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedIndices.includes(idx)
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-semibold truncate flex-1">
                        {msg.nome ? msg.nome : `Modelo ${idx + 1}`}
                      </span>
                      {selectedIndices.includes(idx) && (
                        <Check size={16} className="text-blue-500 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>

                {forceBotOnly && selectedIndices.length === 1 && aiVariations.length === 0 && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs text-amber-800 font-semibold mb-2 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      Apenas 1 modelo selecionado
                    </p>
                    <p className="text-[10px] text-amber-700 mb-3 leading-relaxed">
                      Deseja usar a IA para criar 4 variações desta mensagem? Isso ajuda a evitar banimentos no WhatsApp.
                    </p>
                    <button
                      onClick={handleGenerateVariations}
                      disabled={isGeneratingAi || !botConfig?.openRouterApiKey}
                      className="w-full py-2 bg-amber-500 text-white rounded-lg text-[10px] font-bold hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingAi ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      {isGeneratingAi ? "Gerando..." : "Gerar 4 Variações com IA"}
                    </button>
                    {!botConfig?.openRouterApiKey && (
                      <p className="text-[8px] text-amber-600 mt-1 italic text-center">
                        Configure a API do OpenRouter no seu perfil para usar esta função.
                      </p>
                    )}
                  </div>
                )}

                {aiVariations.length > 0 && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                        <Check size={14} />
                        Variações IA Ativas
                      </p>
                      <button 
                        onClick={() => setAiVariations([])}
                        className="text-emerald-600 hover:text-rose-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      O robô usará o modelo original + 4 variações geradas pela IA, revezando entre elas.
                    </p>
                  </div>
                )}

                <div className="text-xs text-slate-400 font-medium mt-4 pt-4 border-t border-slate-100">
                  <p>
                    {selectedIndices.length > 0 
                      ? `${selectedIndices.length} modelo(s) selecionado(s)${aiVariations.length > 0 ? " + variações IA" : ""}.`
                      : "Selecione pelo menos um modelo."}
                  </p>
                </div>
              </div>

              {/* Preview Area */}
              <div className="flex-[2] rounded-2xl border border-blue-100 bg-blue-50/20 p-5 flex flex-col space-y-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <MessageSquare size={12} />
                    </div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {selectedMessagesList.length > 1 ? "Prévia (Primeiro Modelo)" : "Pré-visualização"}
                    </span>
                  </div>
                  {selectedMessagesList.length > 1 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                      Total: {selectedMessagesList.length} mensagens
                    </span>
                  )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-1">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {previewText || (
                      <span className="italic opacity-50 text-slate-400">
                        Nenhuma mensagem selecionada
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 mt-4">
                  {canUseBot && (
                    <button
                      disabled={selectedIndices.length === 0}
                      onClick={() => {
                        if (forceBotOnly) {
                          onSendBot(selectedMessagesList.map(m => m.texto));
                        } else {
                          onSendBot(previewText, leadName);
                        }
                        onClose();
                      }}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm hover:shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Bot size={18} />
                      <span>{forceBotOnly ? "Enviar em Massa" : "Bot ARGO'S"}</span>
                    </button>
                  )}
                  {!forceBotOnly && (
                    <button
                      disabled={selectedIndices.length === 0}
                      onClick={() => {
                        onSelect(previewText);
                        onClose();
                      }}
                      className={`flex-1 ${canUseBot ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" : "bg-emerald-500 text-white hover:bg-emerald-600"} py-3 rounded-xl text-sm font-bold shadow-sm hover:shadow transition flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                      <Send size={18} />
                      <span>
                        {canUseBot ? "WhatsApp Web" : "Sua Conta do WhatsApp"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400 italic">Nenhum modelo cadastrado.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
