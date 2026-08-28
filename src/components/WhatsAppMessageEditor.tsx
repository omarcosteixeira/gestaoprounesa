import React, { useState, useMemo } from "react";
import { Trash2, Variable } from "lucide-react";

interface Props {
  key?: any;
  msgId: string;
  initialText: string;
  onUpdate: (novoTexto: string) => void | Promise<void>;
  onDelete?: () => void;
  label?: string;
}

export function WhatsAppMessageEditor({
  msgId,
  initialText,
  onUpdate,
  onDelete,
  label,
}: Props) {
  const [texto, setTexto] = useState(initialText || "");

  const availableVariables = [
    { key: "[nome]", label: "Nome", previewValue: "João Silva" },
    { key: "[curso]", label: "Curso", previewValue: "Engenharia" },
    { key: "[unidade]", label: "Unidade", previewValue: "Centro" },
    {
      key: "[data_contato]",
      label: "Data",
      previewValue: new Date().toLocaleDateString("pt-BR"),
    },
    { key: "[saudacao]", label: "Saudação", previewValue: "Bom dia" },
  ];

  const previewText = useMemo(() => {
    let result = texto;
    availableVariables.forEach((v) => {
      const regex = new RegExp(
        v.key.replace(/\[/g, "\\[").replace(/\]/g, "\\]"),
        "g",
      );
      result = result.replace(regex, v.previewValue);
    });
    return result;
  }, [texto]);

  const handleBlur = () => {
    if (texto !== initialText) {
      onUpdate(texto);
    }
  };

  const insertVariable = (key: string) => {
    const newText =
      texto +
      (texto.length > 0 && !texto.endsWith(" ") && !texto.endsWith("\n")
        ? " "
        : "") +
      key +
      " ";
    setTexto(newText);
    onUpdate(newText);
  };

  return (
    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 relative group flex flex-col md:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-3">
        <label className="block text-xs font-bold text-slate-500 uppercase">
          {label || "MENSAGEM"}
        </label>

        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
          {availableVariables.map((v, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertVariable(v.key)}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-blue-200 transition-all shadow-sm"
            >
              <Variable size={12} className="opacity-70" />
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={handleBlur}
          placeholder="Digite o texto da mensagem..."
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[140px] resize-y"
        />

        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-4 right-4 text-rose-400 opacity-0 group-hover:opacity-100 transition-all hover:text-rose-600 p-2 hover:bg-rose-50 rounded-full"
            title="Excluir mensagem"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="w-full md:w-80 flex flex-col pt-6 md:pt-0">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
          Pré-visualização
        </label>
        <div className="flex-1 bg-[url('https://abs.twimg.com/a/1509930776/img/t1/default_profile_normal.png')] bg-opacity-5 rounded-2xl p-4 min-h-[180px] flex flex-col justify-end bg-[#e5ddd5] shadow-inner relative">
          <div className="bg-[#dcf8c6] rounded-xl rounded-tr-none px-4 py-3 shadow-sm relative self-end min-w-[60%] max-w-[95%]">
            <div className="absolute top-0 -right-2 w-0 h-0 border-t-[8px] border-t-[#dcf8c6] border-r-[10px] border-r-transparent"></div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-sans">
              {previewText || (
                <span className="text-slate-500 italic">
                  Digite algo para ver...
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
      </div>
    </div>
  );
}
