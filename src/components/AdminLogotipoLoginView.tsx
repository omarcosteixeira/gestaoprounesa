import React, { useState } from "react";
import {
  Image as ImageIcon,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  Sparkles,
  Layers
} from "lucide-react";
import { BotConfig } from "../types";
import { db, COLLECTIONS } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface Props {
  botConfig?: BotConfig;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminLogotipoLoginView({ botConfig, onToast }: Props) {
  const [loginLogo, setLoginLogo] = useState(botConfig?.loginLogo || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(
        doc(db, COLLECTIONS.BOT_CONFIG, "main"),
        {
          loginLogo: loginLogo.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onToast("Logotipo atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar logotipo: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (!confirm("Deseja restaurar o logotipo padrão do sistema?")) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, COLLECTIONS.BOT_CONFIG, "main"),
        {
          loginLogo: "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setLoginLogo("");
      onToast("Logotipo restaurado para o padrão!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao resetar: ${err.message}`, "error");
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
            <ImageIcon className="text-blue-600" size={24} />
            Logotipo do Login & Cabeçalho
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personalize a imagem ou logo institucional exibida na tela de login e no menu do sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Restaurar Padrão</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? "Salvando..." : "Salvar Logotipo"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="text-blue-600" size={18} />
            URL da Imagem do Logotipo
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Link Direto da Imagem (PNG, JPG, SVG, WebP)
              </label>
              <input
                type="text"
                placeholder="https://exemplo.com/logo.png"
                value={loginLogo}
                onChange={(e) => setLoginLogo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Dica: Recomendamos usar uma imagem com fundo transparente (PNG ou SVG) com proporção retangular ou quadrada.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Save size={15} />
                <span>{saving ? "Salvando..." : "Aplicar Alterações"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Eye className="text-emerald-600" size={18} />
            Pré-visualização do Logotipo
          </h3>

          <div className="space-y-3">
            {/* Light Mode Preview */}
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center min-h-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Fundo Claro (Menu Lateral & Telas)
              </span>
              {loginLogo ? (
                <img
                  src={loginLogo}
                  alt="Logo Preview"
                  referrerPolicy="no-referrer"
                  className="max-h-16 max-w-full object-contain"
                  onError={(e) => {
                    (e.target as any).style.display = "none";
                  }}
                />
              ) : (
                <div className="text-center font-bold text-slate-700 text-lg">
                  Gestão<span className="text-blue-600">Pro</span>
                </div>
              )}
            </div>

            {/* Dark Mode Preview */}
            <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Fundo Escuro (Tela de Login)
              </span>
              {loginLogo ? (
                <img
                  src={loginLogo}
                  alt="Logo Preview Dark"
                  referrerPolicy="no-referrer"
                  className="max-h-16 max-w-full object-contain"
                  onError={(e) => {
                    (e.target as any).style.display = "none";
                  }}
                />
              ) : (
                <div className="text-center font-bold text-white text-lg">
                  Gestão<span className="text-blue-400">Pro</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
