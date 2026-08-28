import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw, Variable } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";

export interface Props {
  isOpen: boolean;
  onClose: () => void;
  tipo: string;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
  availableVariables?: { key: string; label: string; previewValue: string }[];
  defaultText?: string;
  successMessage?: string;
}

export function MessageTemplateModal({
  isOpen,
  onClose,
  tipo,
  onToast,
  availableVariables = [
    { key: "[nome]", label: "Nome", previewValue: "João Silva" },
    { key: "[curso]", label: "Curso", previewValue: "Engenharia de Software" },
    { key: "[unidade]", label: "Unidade", previewValue: "Unidade Central" },
    {
      key: "[data_contato]",
      label: "Data",
      previewValue: new Date().toLocaleDateString("pt-BR"),
    },
    { key: "[saudacao]", label: "Saudação", previewValue: "Bom dia" },
  ],
  defaultText = "",
  successMessage = "Modelo de mensagem salvo!",
}: Props) {
  const [modelName, setModelName] = useState("");
  const [texto, setTexto] = useState(defaultText);
  const [loading, setLoading] = useState(false);

  // Live preview logic
  const previewText = useMemo(() => {
    let result = texto;
    availableVariables.forEach((v) => {
      // replace all occurrences of v.key with v.previewValue
      // We escape the brackets for the regex
      const regex = new RegExp(
        v.key.replace(/\[/g, "\\[").replace(/\]/g, "\\]"),
        "g",
      );
      result = result.replace(regex, v.previewValue);
    });
    return result;
  }, [texto, availableVariables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, COLLECTIONS.WHATSAPP_MESSAGES), {
        tipo,
        texto,
        nome: modelName || undefined,
        createdAt: serverTimestamp(),
      });
      onToast(successMessage);
      setModelName("");
      setTexto("");
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar mensagem:", err);
      onToast(`Erro ao salvar mensagem: \${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (key: string) => {
    setTexto(
      (prev) =>
        prev +
        (prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n")
          ? " "
          : "") +
        key +
        " ",
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col overflow-y-auto">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Novo Modelo de Mensagem
              </h3>
              <p className="text-sm text-slate-500">
                Crie modelos personalizados com variáveis
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <form
              id="template-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Nome do Modelo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Confirmação de Cadastro"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Texto da Mensagem
                  </label>
                  <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                    Variáveis Disponíveis
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {availableVariables.map((v, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-blue-200 transition-all shadow-sm"
                      title={`Insere a variável ${v.key} no texto`}
                    >
                      <Variable size={14} className="opacity-70" />
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  rows={8}
                  placeholder="Digite sua mensagem aqui..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm whitespace-pre-wrap font-sans transition-all resize-none"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  required
                />
              </div>
            </form>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-full md:w-96 bg-slate-50 flex flex-col border-l border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100 bg-white">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Visualização Prévia
            </h4>
          </div>
          <div className="p-6 flex-1 overflow-y-auto bg-[url('https://abs.twimg.com/a/1509930776/img/t1/default_profile_normal.png')] bg-opacity-5">
            <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[300px] shadow-inner relative flex flex-col justify-end">
              {/* WhatsApp like bubble */}
              <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-4 py-3 shadow-sm relative self-end min-w-[60%] max-w-[95%]">
                <div className="absolute top-0 -right-2 w-0 h-0 border-t-[8px] border-t-[#dcf8c6] border-r-[10px] border-r-transparent"></div>
                <p className="text-[15px] text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-sans">
                  {previewText || (
                    <span className="text-slate-500 italic">
                      Sua mensagem aparecerá aqui...
                    </span>
                  )}
                </p>
                <div className="text-right mt-1">
                  <span className="text-[10px] text-slate-500 uppercase">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center px-4">
              Esta é uma simulação de como a mensagem aparecerá no WhatsApp do
              cliente.
            </p>
          </div>
          <div className="p-6 bg-white border-t border-slate-100">
            <button
              form="template-form"
              type="submit"
              disabled={loading || !texto.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-200 disabled:shadow-none flex items-center justify-center space-x-2"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <span>Salvar Modelo</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
