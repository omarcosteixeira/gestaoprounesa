import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  X,
  QrCode as QrIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Smartphone,
  Wallet,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  Check,
  Send,
  FileText,
  Copy,
  Link,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import {
  db,
  COLLECTIONS,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { UserProfile, BotConfig, SolicitacaoFolga } from "../types";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  botConfig: BotConfig;
  botStatuses: Record<
    string,
    {
      status: string;
      pairingCode?: string;
      qrCode?: string;
      qrUrl?: string;
      active?: boolean;
    }
  >;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  profile,
  setProfile,
  botConfig,
  botStatuses,
  onToast,
}: ProfileModalProps) {
  const [copied, setCopied] = useState(false);
  const [botNumberInput, setBotNumberInput] = useState(
    profile?.botNumber || "",
  );
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [birthDateInput, setBirthDateInput] = useState(
    profile?.dataNascimento || "",
  );
  const [isEditingBirthDate, setIsEditingBirthDate] = useState(false);
  const [submittingBirthDate, setSubmittingBirthDate] = useState(false);

  const [telegramInput, setTelegramInput] = useState(
    profile?.telegram || "",
  );
  const [isEditingTelegram, setIsEditingTelegram] = useState(false);
  const [submittingTelegram, setSubmittingTelegram] = useState(false);

  const [showInjectUI, setShowInjectUI] = useState(false);
  const [sessionJSON, setSessionJSON] = useState("");

  const [activeTab, setActiveTab] = useState<"config" | "folgas">("config");
  const [tipo, setTipo] = useState<"Folga" | "Férias">("Folga");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [submittingFolga, setSubmittingFolga] = useState(false);
  const [folgas, setFolgas] = useState<SolicitacaoFolga[]>([]);
  const [loadingFolgas, setLoadingFolgas] = useState(false);

  // Load folgas for user
  useEffect(() => {
    if (!profile?.uid || activeTab !== "folgas" || !isOpen) return;

    setLoadingFolgas(true);
    const q = query(
      collection(db, COLLECTIONS.SOLICITACAO_FOLGA),
      where("solicitanteId", "==", profile.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SolicitacaoFolga[];

        // Sort descending by createdAt
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setFolgas(list);
        setLoadingFolgas(false);
      },
      (error) => {
        console.error("Error loading folgas:", error);
        setLoadingFolgas(false);
      },
    );

    return () => unsubscribe();
  }, [profile?.uid, activeTab, isOpen]);

  // Synchronize input with external profile state changes
  useEffect(() => {
    if (profile?.botNumber) {
      setBotNumberInput(profile.botNumber);
    }
  }, [profile?.botNumber]);

  useEffect(() => {
    if (profile?.dataNascimento) {
      setBirthDateInput(profile.dataNascimento);
    }
  }, [profile?.dataNascimento]);

  useEffect(() => {
    if (profile?.telegram) {
      setTelegramInput(profile.telegram);
    } else {
      setTelegramInput("");
    }
  }, [profile?.telegram]);

  const handleSaveBirthDate = async () => {
    if (!profile?.uid) return;
    setSubmittingBirthDate(true);
    try {
      const updatedData = {
        dataNascimento: birthDateInput,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), updatedData);

      setProfile((prev) =>
        prev ? { ...prev, dataNascimento: birthDateInput } : null,
      );
      onToast("Data de nascimento atualizada com sucesso!", "success");
      setIsEditingBirthDate(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${COLLECTIONS.USERS}/${profile.uid}`,
      );
      onToast("Erro ao atualizar data de nascimento.", "error");
    } finally {
      setSubmittingBirthDate(false);
    }
  };

  const handleSaveTelegram = async () => {
    if (!profile?.uid) return;
    setSubmittingTelegram(true);
    try {
      const updatedData = {
        telegram: telegramInput.trim(),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), updatedData);

      setProfile((prev) =>
        prev ? { ...prev, telegram: telegramInput.trim() } : null,
      );
      onToast("Telegram atualizado com sucesso!", "success");
      setIsEditingTelegram(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${COLLECTIONS.USERS}/${profile.uid}`,
      );
      onToast("Erro ao atualizar Telegram.", "error");
    } finally {
      setSubmittingTelegram(false);
    }
  };

  if (!isOpen) return null;

  const allowedRoles = [
    "Sala de Matrícula",
    "SSA",
    "Líder/FDV",
    "Admin Master",
    "FDV (Comercial)",
    "Gerente Comercial (Comercial)",
    "FDV",
  ];
  const canEditBotNumber = profile && allowedRoles.includes(profile.role);

  const allowedRolesForFolga = [
    "Sala de Matrícula",
    "FDV",
    "FDV (Comercial)",
    "Líder/FDV",
    "Gestor Comercial",
    "Gerente Comercial (Comercial)",
    "Admin Master",
  ];
  const canRequestFolga =
    profile && allowedRolesForFolga.includes(profile.role);

  const formatDateBr = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const cleanInputNumber = botNumberInput.replace(/\D/g, "");
  const cleanSavedNumber = (profile?.botNumber || "").replace(/\D/g, "");

  // Get current status of the saved bot number
  const botInfo = cleanSavedNumber ? botStatuses[cleanSavedNumber] : null;
  const botStatus = botInfo?.status || "offline";

  const handleSaveBotNumber = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      const updatedData = {
        botNumber: cleanInputNumber,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), updatedData);

      setProfile((prev) =>
        prev ? { ...prev, botNumber: cleanInputNumber } : null,
      );
      onToast("Número do bot atualizado com sucesso!", "success");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${COLLECTIONS.USERS}/${profile.uid}`,
      );
      onToast("Erro ao atualizar número do bot.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    const numberToConnect = cleanSavedNumber || cleanInputNumber;
    if (!numberToConnect) {
      onToast("Informe um número de WhatsApp primeiro.", "error");
      return;
    }
    if (!botConfig?.url) {
      onToast(
        "URL de conexão do bot não configurada no administrador.",
        "error",
      );
      return;
    }

    setConnecting(true);
    const cleanUrl = botConfig.url.endsWith("/")
      ? botConfig.url.slice(0, -1)
      : botConfig.url;

    try {
      const res = await fetch(`${cleanUrl}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botNumber: numberToConnect }),
      });

      if (!res.ok) {
        onToast(`Erro da API do bot: ${res.status} ${res.statusText}`, "error");
        return;
      }

      onToast(
        "Solicitação de conexão enviada! Aguardando QR Code/Pairing Code...",
        "success",
      );
    } catch (err: any) {
      onToast(
        `Erro ao conectar com o servidor do bot: ${err.message}`,
        "error",
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      id="profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        id="profile-modal-content"
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-12"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Seu Perfil</h2>
              <p className="text-xs text-slate-500">
                Consulte seus dados e controle seu bot do WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {canRequestFolga && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 font-bold text-xs gap-2">
            <button
              id="tab-config"
              onClick={() => setActiveTab("config")}
              className={`py-3 px-3 border-b-2 transition-all ${activeTab === "config" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              Configurações e Bot
            </button>
            <button
              id="tab-folgas"
              onClick={() => setActiveTab("folgas")}
              className={`py-3 px-3 border-b-2 transition-all ${activeTab === "folgas" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              Solicitar Folga / Férias
            </button>
          </div>
        )}

        {/* Modal body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {activeTab === "config" ? (
            <>
              {/* Section 1: Personal Data */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Informações de Perfil
                </h3>
                <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 text-slate-400">
                      <User size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        Nome
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {profile?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 text-slate-400">
                      <Mail size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        E-mail
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {profile?.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 text-slate-400">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        CPF
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {profile?.cpf || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 text-slate-400">
                      <Calendar size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        Data de Nascimento
                      </span>
                      {isEditingBirthDate ? (
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="date"
                            value={birthDateInput}
                            onChange={(e) => setBirthDateInput(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                          <button
                            disabled={submittingBirthDate}
                            onClick={handleSaveBirthDate}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingBirthDate(false);
                              setBirthDateInput(profile?.dataNascimento || "");
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">
                            {profile?.dataNascimento
                              ? formatDateBr(profile.dataNascimento)
                              : "Não informada"}
                          </span>
                          <button
                            onClick={() => setIsEditingBirthDate(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                          >
                            Alterar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 text-slate-400">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        Cargo / Nível de Acesso
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full mt-1">
                        {profile?.role}
                      </span>
                    </div>
                  </div>

                  {profile?.phone && (
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 text-slate-400">
                        <Phone size={16} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-slate-400 block font-medium">
                          Fone
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {profile.phone}
                        </span>
                      </div>
                    </div>
                  )}

                  {profile?.chavePix && (
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 text-slate-400">
                        <Wallet size={16} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-slate-400 block font-medium">
                          Chave Pix
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {profile.chavePix}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Telegram */}
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 text-slate-400">
                      <Send size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        Telegram (@username ou Chat ID)
                      </span>
                      {isEditingTelegram ? (
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="text"
                            placeholder="@username ou Chat ID"
                            value={telegramInput}
                            onChange={(e) => setTelegramInput(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium w-full max-w-[180px]"
                          />
                          <button
                            disabled={submittingTelegram}
                            onClick={handleSaveTelegram}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingTelegram(false);
                              setTelegramInput(profile?.telegram || "");
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">
                            {profile?.telegram || "Não informado"}
                          </span>
                          <button
                            onClick={() => setIsEditingTelegram(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                          >
                            Alterar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Link de Cadastro Público */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    {(() => {
                      const isInsumoRole =
                        profile?.role === "Técnico" ||
                        profile?.role === "Financeiro" ||
                        profile?.role === "Acadêmico";
                      const linkLabel = isInsumoRole
                        ? "Link de Solicitação de Insumos (Público)"
                        : "Link de Cadastro Exclusivo (Desconto)";
                      const linkDescription = isInsumoRole
                        ? "Compartilhe este link com professores ou colaboradores para solicitar novos materiais de apoio livremente, sem precisar de login."
                        : "Preencha seus dados e ganhe um desconto especial. Compartilhe este link com novos alunos; todos os cadastros gerados por ele serão marcados sob sua autoria.";
                      const currentServidor =
                        localStorage.getItem("servidor_selected") ||
                        "principal";
                      const linkValue = isInsumoRole
                        ? `${window.location.origin}?view=pedido-insumos&ref=${profile?.uid}&servidor=${currentServidor}`
                        : `${window.location.origin}?view=desconto&ref=${profile?.uid}&servidor=${currentServidor}`;

                      return (
                        <>
                          <div className="flex items-center space-x-2 text-blue-600 mb-2">
                            <Link size={16} className="font-bold shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {linkLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                            {linkDescription}
                          </p>
                          <div className="flex items-center space-x-2 bg-slate-150 p-1.5 rounded-xl border border-slate-200 bg-white">
                            <input
                              type="text"
                              readOnly
                              value={linkValue}
                              className="flex-1 bg-transparent text-xs text-slate-600 outline-none px-2 select-all font-mono"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(linkValue);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                                onToast(
                                  "Link copiado de acordo com o seu perfil!",
                                  "success",
                                );
                              }}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copied ? (
                                <Check size={12} />
                              ) : (
                                <Copy size={12} />
                              )}
                              {copied ? "Copiado!" : "Copiar"}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Section 2: Whatsapp bot connection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Bot do WhatsApp
                  </h3>
                  <div className="flex items-center space-x-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${botStatus === "online" ? "bg-green-500 animate-pulse" : botStatus === "pairing" ? "bg-orange-500 animate-pulse" : "bg-red-400"}`}
                    />
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${botStatus === "online" ? "text-green-600" : botStatus === "pairing" ? "text-orange-600" : "text-slate-500"}`}
                    >
                      {botStatus === "online"
                        ? "Online"
                        : botStatus === "pairing"
                          ? "Apareando"
                          : "Offline"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {/* Informative description */}
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Este número é utilizado pelo sistema automatizado de
                    respostas e disparos inteligentes associado ao seu usuário.
                  </p>

                  {/* Input for the phone number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Número do WhatsApp do Bot{" "}
                      {canEditBotNumber && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        disabled={!canEditBotNumber || saving}
                        placeholder="Ex: 5511999999999"
                        value={botNumberInput}
                        onChange={(e) => setBotNumberInput(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                      />
                      {canEditBotNumber && (
                        <button
                          onClick={handleSaveBotNumber}
                          disabled={saving || !botNumberInput}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1 min-w-[90px]"
                        >
                          {saving ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            "Salvar"
                          )}
                        </button>
                      )}
                    </div>
                    {!canEditBotNumber ? (
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                        Apenas os Perfis <strong>Sala de Matrícula</strong>,{" "}
                        <strong>SSA</strong>, <strong>Líder/FDV</strong>,{" "}
                        <strong>FDV</strong>, <strong>FDV (Comercial)</strong> e{" "}
                        <strong>Gerente Comercial</strong> têm permissão para
                        inserir ou alterar este número.
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Digite o DDI + DDD + número (ex: 55 para Brasil). Use
                        apenas números.
                      </p>
                    )}
                  </div>

                  {/* Bot status-based connection actions */}
                  {cleanSavedNumber ? (
                    <div className="pt-2 border-t border-slate-200/60">
                      {botStatus === "online" ? (
                        <div className="bg-green-50 rounded-xl p-3 border border-green-100 flex items-center space-x-3 text-green-800">
                          <CheckCircle2
                            className="text-green-500 shrink-0"
                            size={18}
                          />
                          <div className="text-xs">
                            <p className="font-bold">WhatsApp Conectado!</p>
                            <p className="text-[11px] text-green-600 mt-0.5">
                              O bot está atendendo e enviando mensagens
                              ativamente no número {profile.botNumber}.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-red-50 rounded-xl p-3 border border-red-100 flex items-center space-x-3 text-red-800">
                            <XCircle
                              className="text-red-500 shrink-0"
                              size={18}
                            />
                            <div className="text-xs">
                              <p className="font-bold">WhatsApp Desconectado</p>
                              <p className="text-[11px] text-red-600 mt-0.5">
                                Seu bot está offline. Inicie uma solicitação de
                                conexão para gerar o código.
                              </p>
                            </div>
                          </div>

                          {/* Connection Trigger Button */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={handleConnect}
                              disabled={connecting}
                              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                            >
                              {connecting ? (
                                <>
                                  <RefreshCw size={16} className="animate-spin" />
                                  <span>Solicitando Conexão...</span>
                                </>
                              ) : (
                                <>
                                  <Smartphone size={16} />
                                  <span>Conectar Tradicional</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setShowInjectUI(!showInjectUI)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                            >
                              <Link size={16} />
                              <span>Injetar Sessão (Extensão)</span>
                            </button>
                          </div>

                          {showInjectUI && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-3 overflow-hidden"
                            >
                              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-800 leading-relaxed mb-2">
                                <p className="font-bold flex items-center gap-1 mb-1">
                                  <AlertCircle size={12} />
                                  SOP - Instruções:
                                </p>
                                <ol className="list-decimal ml-3 space-y-1">
                                  <li>Logue no WhatsApp Web em aba anônima.</li>
                                  <li>Copie o JSON pela extensão <strong>PESK Linker</strong>.</li>
                                  <li>Cole abaixo e clique em Injetar.</li>
                                  <li>Feche a aba do WhatsApp Web imediatamente.</li>
                                </ol>
                              </div>

                              <textarea
                                value={sessionJSON}
                                onChange={(e) => setSessionJSON(e.target.value)}
                                placeholder="Cole o JSON da extensão aqui..."
                                rows={4}
                                className="w-full bg-white border border-blue-200 rounded-lg p-2 text-[10px] font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                              />

                              <button
                                onClick={async () => {
                                  if (!sessionJSON) {
                                    onToast("Cole o JSON primeiro.", "error");
                                    return;
                                  }
                                  try {
                                    const sessionDataObj =
                                      JSON.parse(sessionJSON);
                                    const numberToConnect =
                                      cleanSavedNumber || cleanInputNumber;
                                    if (!numberToConnect) {
                                      onToast(
                                        "Número não identificado.",
                                        "error",
                                      );
                                      return;
                                    }

                                    const cleanUrl = botConfig.url.endsWith("/")
                                      ? botConfig.url.slice(0, -1)
                                      : botConfig.url;

                                    const res = await fetch(
                                      `${cleanUrl}/api/inject`,
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          botNumber: numberToConnect,
                                          sessionData: sessionDataObj,
                                        }),
                                      },
                                    );

                                    if (!res.ok) {
                                      const errData = await res.json();
                                      onToast(
                                        `Erro: ${errData.error || res.statusText}`,
                                        "error",
                                      );
                                      return;
                                    }

                                    onToast(
                                      "Sucesso! Sessão injetada com sucesso.",
                                      "success",
                                    );
                                    setShowInjectUI(false);
                                    setSessionJSON("");
                                  } catch (e: any) {
                                    onToast(`Erro: ${e.message}`, "error");
                                  }
                                }}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition"
                              >
                                Injetar e Conectar Agora
                              </button>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-100/70 p-3 rounded-xl text-center text-xs text-slate-500">
                      Cadastre um número de WhatsApp acima para ativar as opções
                      de conexão do bot.
                    </div>
                  )}

                  {/* Real-time QR and pairing code container pulled from server status */}
                  {botInfo && botStatus === "pairing" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 bg-white p-4 rounded-xl border-2 border-dashed border-slate-200 text-center flex flex-col gap-2 items-center shadow-inner"
                    >
                      <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center animate-pulse">
                        <RefreshCw size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Aguardando injeção de sessão via extensão.
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-[220px]">
                        O QR Code nativo está desabilitado por segurança. Use a
                        extensão PESK Linker para conectar este número.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Solicitação Form */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Plus className="text-blue-600" size={18} />
                  Nova Solicitação de Folga ou Férias
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!dataInicio || !dataFim) {
                      onToast(
                        "Por favor, informe a data de início e término.",
                        "error",
                      );
                      return;
                    }
                    if (dataInicio > dataFim) {
                      onToast(
                        "A data de início não pode ser maior que a data de término.",
                        "error",
                      );
                      return;
                    }

                    setSubmittingFolga(true);
                    try {
                      // Check overlap logic
                      const approvalsQuery = query(
                        collection(db, COLLECTIONS.SOLICITACAO_FOLGA),
                        where("status", "==", "Aprovado"),
                      );
                      const querySnapshot = await getDocs(approvalsQuery);
                      const existingApprovals = querySnapshot.docs.map(
                        (doc) => ({ id: doc.id, ...doc.data() }) as any,
                      );

                      const conflict = existingApprovals.find((appr) => {
                        if (appr.solicitanteId === profile.uid) return false;
                        return (
                          dataInicio <= appr.dataFim &&
                          appr.dataInicio <= dataFim
                        );
                      });

                      if (conflict) {
                        onToast(
                          `Atenção: A data selecionada já está aprovada para outro funcionário (${conflict.solicitanteNome}, de ${formatDateBr(conflict.dataInicio)} a ${formatDateBr(conflict.dataFim)}).`,
                          "error",
                        );
                        setSubmittingFolga(false);
                        return;
                      }

                      const docData = {
                        solicitanteId: profile.uid,
                        solicitanteNome: profile.name,
                        solicitanteEmail: profile.email,
                        solicitanteRole: profile.role,
                        dataInicio,
                        dataFim,
                        tipo,
                        status: "Pendente",
                        justificativa,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                      };

                      await addDoc(
                        collection(db, COLLECTIONS.SOLICITACAO_FOLGA),
                        docData,
                      );
                      onToast(
                        "Solicitação de folga enviada com sucesso!",
                        "success",
                      );

                      // reset
                      setDataInicio("");
                      setDataFim("");
                      setJustificativa("");
                    } catch (err) {
                      handleFirestoreError(
                        err,
                        OperationType.CREATE,
                        COLLECTIONS.SOLICITACAO_FOLGA,
                      );
                      onToast("Erro ao submeter solicitação.", "error");
                    } finally {
                      setSubmittingFolga(false);
                    }
                  }}
                  className="space-y-4 text-xs text-slate-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Tipo de Ausência
                      </label>
                      <select
                        value={tipo}
                        onChange={(e) =>
                          setTipo(e.target.value as "Folga" | "Férias")
                        }
                        className="bg-white w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium h-[38px]"
                      >
                        <option value="Folga">Folga</option>
                        <option value="Férias">Férias</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Dia de Início
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="bg-white w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none h-[38px]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Dia de Fim
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="bg-white w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none h-[38px]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Motivo / Justificativa (Opcional)
                    </label>
                    <textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      placeholder="Diga brevemente o motivo de sua solicitação..."
                      className="bg-white w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none h-16 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFolga}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-100"
                  >
                    {submittingFolga ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <Send size={15} />
                    )}
                    <span>Enviar Solicitação</span>
                  </button>
                </form>
              </div>

              {/* List of current user's requested folgas */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Seu Histórico de Solicitações
                </h3>
                {loadingFolgas ? (
                  <div className="flex justify-center py-6 text-slate-400">
                    <RefreshCw
                      className="animate-spin text-blue-500"
                      size={24}
                    />
                  </div>
                ) : folgas.length === 0 ? (
                  <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-400 text-xs">
                    Nenhuma solicitação de folga ou férias enviada ainda.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {folgas.map((folga) => {
                      const isApproved = folga.status === "Aprovado";
                      const isRejected = folga.status === "Recusado";
                      const isPending = folga.status === "Pendente";

                      return (
                        <div
                          key={folga.id}
                          className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${folga.tipo === "Férias" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                            >
                              {folga.tipo}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isApproved
                                  ? "bg-green-100 text-green-700"
                                  : isRejected
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isApproved && <Check size={10} />}
                              {isRejected && <X size={10} />}
                              {isPending && <Clock size={10} />}
                              {folga.status}
                            </span>
                          </div>

                          <div className="text-slate-700 font-semibold flex justify-between items-center">
                            <span>
                              Período:{" "}
                              <strong className="text-slate-950 font-bold">
                                {formatDateBr(folga.dataInicio)}
                              </strong>{" "}
                              a{" "}
                              <strong className="text-slate-950 font-bold">
                                {formatDateBr(folga.dataFim)}
                              </strong>
                            </span>
                          </div>

                          {folga.justificativa && (
                            <div className="text-slate-500 text-[11px] italic bg-slate-50/70 px-2 py-1 rounded-lg">
                              "{folga.justificativa}"
                            </div>
                          )}

                          {folga.aprovadoPorNome && (
                            <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 flex justify-between items-center">
                              <span>
                                Julgado por:{" "}
                                <strong>{folga.aprovadoPorNome}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-sm text-slate-700 transition"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
