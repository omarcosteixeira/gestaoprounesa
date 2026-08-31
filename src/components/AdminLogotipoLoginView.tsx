import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  Sparkles,
  Layers,
  Video,
  Upload,
  Film,
  FileCode,
  AlertCircle,
  Play,
  X
} from "lucide-react";
import { BotConfig } from "../types";
import { db, COLLECTIONS } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { isVideoMedia, isGifMedia, BrandMedia } from "./BrandMedia";

interface Props {
  botConfig?: BotConfig;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminLogotipoLoginView({ botConfig, onToast }: Props) {
  const [loginLogo, setLoginLogo] = useState(botConfig?.loginLogo || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = isVideoMedia(loginLogo);
  const isGif = isGifMedia(loginLogo);

  const handleFileUpload = (file: File) => {
    // Check file size (recommend < 10MB to avoid oversized Firestore docs)
    const maxSize = 12 * 1024 * 1024; // 12MB
    if (file.size > maxSize) {
      onToast("Arquivo muito grande. Recomendamos vídeos/GIFs de até 10MB.", "error");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setLoginLogo(result);
        onToast("Mídia carregada com sucesso! Clique em 'Salvar Logotipo' para aplicar.", "success");
      }
      setUploading(false);
    };
    reader.onerror = () => {
      onToast("Erro ao processar o arquivo selecionado.", "error");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      onToast("Mídia/Logotipo do login atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar logotipo: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (!confirm("Deseja restaurar o logotipo/arte padrão do sistema?")) return;
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
            <Film className="text-blue-600" size={24} />
            Mídia & Logotipo do Login (Vídeos, GIFs e Imagens)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personalize a identidade visual exibida na tela de login e no menu. Agora com suporte completo a <b>vídeos curtos (MP4, WebM)</b>, <b>GIFs animados</b> e <b>imagens</b>.
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
            onClick={() => handleSave()}
            disabled={saving || uploading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? "Salvando..." : "Salvar Logotipo"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Controls (Left Column) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            {/* Format Selection Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Fonte da Mídia
              </span>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "upload"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Upload size={13} />
                  <span>Enviar Arquivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("url")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "url"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileCode size={13} />
                  <span>Link / URL</span>
                </button>
              </div>
            </div>

            {/* TAB: Upload File */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,image/gif,image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload size={26} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {uploading ? "Processando arquivo..." : "Clique ou arraste um Vídeo, GIF ou Imagem aqui"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Formatos suportados: <b>MP4, WebM, GIF, PNG, SVG, JPG, WebP</b>
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
                  <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <span>
                    <b>Dica:</b> Para um visual moderno na tela de login, você pode usar vídeos curtos em loop ou GIFs com logo animado. Os vídeos reproduzem automaticamente em loop de forma silenciosa.
                  </span>
                </div>
              </div>
            )}

            {/* TAB: Direct URL */}
            {activeTab === "url" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Direta do Arquivo (Vídeo, GIF ou Imagem)
                  </label>
                  <input
                    type="text"
                    placeholder="https://exemplo.com/logo-animada.mp4 ou .gif / .png"
                    value={loginLogo}
                    onChange={(e) => setLoginLogo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Cole o endereço web de qualquer vídeo (terminado em .mp4, .webm), GIF (.gif) ou imagem.
                </p>
              </div>
            )}

            {/* Current Media Status Badge */}
            {loginLogo ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    isVideo ? "bg-purple-600" : isGif ? "bg-amber-600" : "bg-blue-600"
                  }`}>
                    {isVideo ? <Video size={18} /> : isGif ? <Film size={18} /> : <ImageIcon size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {isVideo ? "Vídeo Curto (MP4/WebM)" : isGif ? "GIF Animado" : "Imagem"}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ativo
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                      {loginLogo.startsWith("data:") ? "Arquivo embutido em Base64" : loginLogo}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLoginLogo("")}
                  className="p-2 hover:bg-slate-200 text-slate-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Remover mídia atual"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle size={15} />
                <span>Nenhum logotipo personalizado configurado (usando o padrão do sistema).</span>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || uploading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? "Salvando Alterações..." : "Aplicar e Salvar no Sistema"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Previews (Right Column) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Eye className="text-emerald-600" size={18} />
              Pré-visualização em Tempo Real
            </h3>

            <div className="space-y-4">
              {/* 1. Login Left Column Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  1. Painel de Login (Coluna Esquerda / Fundo Azul Escuro)
                </span>
                <div className="p-6 bg-[#011a3c] rounded-2xl border border-[#092e5c] flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                  <BrandMedia
                    src={loginLogo}
                    className="max-h-24 max-w-[280px] w-auto object-contain drop-shadow-lg"
                    videoClassName="max-h-24 max-w-[280px] w-auto object-contain rounded-xl drop-shadow-lg"
                    fallback={
                      <div className="text-center font-bold text-white text-xl">
                        Gestão Oeste <span className="text-sky-400">pro</span>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* 2. Login Right Banner / Hero Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  2. Destaque do Login (Coluna Direita / Hero Promocional)
                </span>
                <div className="p-6 bg-[#01112c] rounded-2xl border border-[#0d4182]/30 flex flex-col items-center justify-center min-h-[180px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#082a5c_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
                  <div className="relative z-10 w-full flex justify-center">
                    <BrandMedia
                      src={loginLogo}
                      className="max-h-36 max-w-[260px] aspect-square rounded-2xl object-contain drop-shadow-[0_20px_35px_rgba(14,116,253,0.3)] border border-slate-700/40 p-4 bg-[#011a3c]/60"
                      videoClassName="max-h-36 max-w-[260px] aspect-square rounded-2xl object-contain drop-shadow-[0_20px_35px_rgba(14,116,253,0.3)] border border-slate-700/40 p-2 bg-[#011a3c]/60"
                      fallback={
                        <div className="text-center text-slate-400 text-xs font-semibold">
                          [Emblema Padrão Oeste Hunter Badge]
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* 3. Sidebar Header Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  3. Barra Lateral (Menu Superior do Sistema)
                </span>
                <div className="p-4 bg-[#011a3c] rounded-xl border border-[#092e5c] flex items-center justify-center">
                  <BrandMedia
                    src={loginLogo}
                    className="max-h-10 max-w-full object-contain"
                    videoClassName="max-h-10 max-w-full object-contain rounded-lg"
                    fallback={
                      <div className="text-sm font-bold text-white">
                        Gestão Oeste pro
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

