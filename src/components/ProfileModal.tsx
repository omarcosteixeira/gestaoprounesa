import React, { useState, useEffect, useRef } from "react";
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
  KeyRound,
  Database,
  Bot,
  Clipboard,
  Info,
  Camera,
  Upload,
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
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import {
  db,
  storage,
  COLLECTIONS,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { UserProfile, BotConfig, SolicitacaoFolga } from "../types";
import { executeDirectTeamsDispatch } from "../lib/teamsService";

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

  const [phoneInput, setPhoneInput] = useState(
    profile?.phone || (profile as any)?.telefone || (profile as any)?.whatsapp || "",
  );
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [submittingPhone, setSubmittingPhone] = useState(false);

  // Microsoft Teams Bot State (ConversationReference Base64 String)
  const [teamsInput, setTeamsInput] = useState(
    profile?.teamsChatId || profile?.teams_chat_id || "",
  );
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [submittingTeams, setSubmittingTeams] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);
  const [showTeamsGuide, setShowTeamsGuide] = useState(false);

  const [showInjectUI, setShowInjectUI] = useState(false);
  const [sessionJSON, setSessionJSON] = useState("");

  const [activeTab, setActiveTab] = useState<"config" | "folgas">("config");
  const [tipo, setTipo] = useState<"Folga" | "Férias" | "Saída durante o dia">("Folga");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("12:00");
  const [justificativa, setJustificativa] = useState("");
  const [submittingFolga, setSubmittingFolga] = useState(false);
  const [folgas, setFolgas] = useState<SolicitacaoFolga[]>([]);
  const [allApprovedFolgas, setAllApprovedFolgas] = useState<SolicitacaoFolga[]>([]);
  const [loadingFolgas, setLoadingFolgas] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load folgas for user
  useEffect(() => {
    if (!profile?.uid || activeTab !== "folgas" || !isOpen) return;

    setLoadingFolgas(true);
    // Fixed the collection reference to use the correct constant from COLLECTIONS proxy
    const colRef = collection(db, COLLECTIONS.SOLICITACAO_FOLGA);
    const qFixed = query(colRef, where("solicitanteId", "==", profile.uid));

    const unsubscribe = onSnapshot(
      qFixed,
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

  // Load ALL approved folgas for the unit to check for conflicts reactively
  useEffect(() => {
    if (activeTab !== "folgas" || !isOpen) return;

    const colRef = collection(db, COLLECTIONS.SOLICITACAO_FOLGA);
    // Fetch only approved ones. We could also fetch pending if we want to be strict.
    const q = query(colRef, where("status", "==", "Aprovado"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SolicitacaoFolga[];

        // Filter by unit if the user has one
        const unitFiltered = profile?.unidade 
          ? list.filter(f => f.unidade === profile.unidade || !f.unidade)
          : list;

        setAllApprovedFolgas(unitFiltered);
      },
      (error) => {
        console.error("Error loading all approved folgas:", error);
      },
    );

    return () => unsubscribe();
  }, [activeTab, isOpen, profile?.unidade]);

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

  useEffect(() => {
    const p = profile?.phone || (profile as any)?.telefone || (profile as any)?.whatsapp || "";
    setPhoneInput(p);
  }, [profile?.phone, (profile as any)?.telefone, (profile as any)?.whatsapp]);

  useEffect(() => {
    const currentTeamsId = profile?.teamsChatId || profile?.teams_chat_id || "";
    setTeamsInput(currentTeamsId);
  }, [profile?.teamsChatId, profile?.teams_chat_id]);

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

  const handleSavePhone = async () => {
    if (!profile?.uid) return;
    setSubmittingPhone(true);
    try {
      const cleanVal = phoneInput.trim();
      const updatedData = {
        phone: cleanVal,
        telefone: cleanVal,
        whatsapp: cleanVal,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), updatedData);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              phone: cleanVal,
              telefone: cleanVal,
              whatsapp: cleanVal,
            }
          : null,
      );
      onToast("Telefone / WhatsApp atualizado com sucesso!", "success");
      setIsEditingPhone(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${COLLECTIONS.USERS}/${profile.uid}`,
      );
      onToast("Erro ao atualizar WhatsApp / Telefone.", "error");
    } finally {
      setSubmittingPhone(false);
    }
  };

  const handleSaveTeams = async () => {
    if (!profile?.uid) return;
    setSubmittingTeams(true);
    try {
      const cleanVal = teamsInput.trim();
      const updatedData = {
        teamsChatId: cleanVal,
        teams_chat_id: cleanVal,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), updatedData);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              teamsChatId: cleanVal,
              teams_chat_id: cleanVal,
            }
          : null,
      );
      onToast("ID do Microsoft Teams atualizado com sucesso!", "success");
      setIsEditingTeams(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${COLLECTIONS.USERS}/${profile.uid}`,
      );
      onToast("Erro ao atualizar ID do Teams.", "error");
    } finally {
      setSubmittingTeams(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    // Check size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      onToast("A foto deve ter no máximo 2MB.", "error");
      return;
    }

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `profiles/${profile.uid}/avatar_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), {
        photoUrl,
        updatedAt: serverTimestamp(),
      });

      setProfile((prev) => prev ? { ...prev, photoUrl } : null);
      onToast("Foto de perfil atualizada com sucesso!", "success");
    } catch (err: any) {
      console.error("Error uploading photo:", err);
      onToast("Erro ao fazer upload da foto. Verifique as permissões do Firebase Storage.", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasteTeamsFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTeamsInput(text.trim());
        setIsEditingTeams(true);
        onToast("Código do Teams colado com sucesso!", "success");
      }
    } catch (err) {
      onToast("Não foi possível ler da área de transferência. Cole manualmente no campo.", "error");
    }
  };

  const handleTestTeamsNotification = async () => {
    const chatIdToTest = (teamsInput || profile?.teamsChatId || profile?.teams_chat_id || "").trim();
    if (!chatIdToTest) {
      onToast("Cole e salve o seu ID do Teams antes de testar.", "error");
      return;
    }

    setTestingTeams(true);
    try {
      const result = await executeDirectTeamsDispatch(
        {
          chatId: chatIdToTest,
          mensagem: `Teste de Vinculação LeadsPro: Olá ${profile?.name || profile?.nome || "Colaborador"}! Seu Microsoft Teams foi configurado com sucesso. A partir de agora, você receberá aqui notificações em tempo real de novas visitas, tarefas agendadas e planos de ação.`,
          processarComIA: true,
          userName: profile?.name || profile?.nome || "Usuário",
          userEmail: profile?.email,
          origem: "Teste no Perfil do Usuário",
        },
        botConfig
      );

      if (result.success) {
        onToast("Mensagem de teste enviada com sucesso ao seu Microsoft Teams!", "success");
      } else {
        onToast(`Falha no envio: ${result.error || "Verifique o bot no Railway"}`, "error");
      }
    } catch (err: any) {
      onToast(`Erro ao testar envio: ${err.message}`, "error");
    } finally {
      setTestingTeams(false);
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

  // Reactive conflict check for UI feedback
  const hasConflictOnSelectedDates = (() => {
    if (!dataInicio || !dataFim) return null;
    
    return allApprovedFolgas.find(appr => {
      if (appr.solicitanteId === profile.uid) return false;
      if (appr.tipo === "Saída durante o dia") return false;
      
      return (
        dataInicio <= appr.dataFim &&
        appr.dataInicio <= dataFim
      );
    });
  })();

  // Force "Saída durante o dia" if there is a conflict
  useEffect(() => {
    if (hasConflictOnSelectedDates && tipo !== "Saída durante o dia") {
      setTipo("Saída durante o dia");
    }
  }, [hasConflictOnSelectedDates]);

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

  // Local state for fast polling and connection methods inside modal
  const [localBotStatuses, setLocalBotStatuses] = useState<Record<string, any>>({});
  const [connectingMethod, setConnectingMethod] = useState<"qr" | "code" | null>(null);
  const [injecting, setInjecting] = useState(false);
  const [saveSessionInDb, setSaveSessionInDb] = useState(true);

  // Merge external and local bot statuses for ultra-fast UI response
  const mergedStatuses = { ...botStatuses, ...localBotStatuses };
  const botInfo = cleanSavedNumber
    ? mergedStatuses[cleanSavedNumber] ||
      mergedStatuses[cleanSavedNumber.replace(/^55/, "")] ||
      mergedStatuses[`55${cleanSavedNumber}`] ||
      Object.entries(mergedStatuses).find(([k, v]: [string, any]) =>
        k.replace(/\D/g, "") === cleanSavedNumber ||
        k.replace(/\D/g, "") === cleanSavedNumber.replace(/^55/, "") ||
        v?.botNumber?.replace(/\D/g, "") === cleanSavedNumber
      )?.[1]
    : null;

  const isOnline = botInfo?.status === "online" || (botInfo as any)?.connected === true;
  const isPairing =
    botInfo?.status === "pairing" ||
    botInfo?.status === "connecting" ||
    (!isOnline && (Boolean(botInfo?.qrUrl) || Boolean(botInfo?.qrCode) || Boolean(botInfo?.pairingCode)));
  const botStatus = isOnline ? "online" : isPairing ? "pairing" : (botInfo?.status || "offline");
  const qrUrl = botInfo?.qrUrl || botInfo?.qrCode || (botInfo as any)?.qr;

  // Real-time polling every 3 seconds while modal is open
  const fetchBotStatus = async () => {
    if (!botConfig?.url) return;
    try {
      const cleanUrl = botConfig.url.endsWith("/")
        ? botConfig.url.slice(0, -1)
        : botConfig.url;
      const res = await fetch(`${cleanUrl}/api/status`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.bots && typeof data.bots === "object") {
          setLocalBotStatuses(data.bots);
        } else if (data && typeof data === "object") {
          if (data.status || data.qrUrl || data.pairingCode) {
            const num = (data.botNumber || cleanSavedNumber || cleanInputNumber).replace(/\D/g, "");
            if (num) {
              setLocalBotStatuses((prev) => ({
                ...prev,
                [num]: { ...prev[num], ...data },
              }));
            }
          } else {
            setLocalBotStatuses(data);
          }
        }
      }
    } catch {
      // ignore network errors in polling
    }
  };

  useEffect(() => {
    if (!isOpen || !botConfig?.url) return;
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen, botConfig?.url, cleanSavedNumber]);

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

  const handleConnect = async (method: "qr" | "code" = "qr") => {
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
    setConnectingMethod(method);
    const cleanUrl = botConfig.url.endsWith("/")
      ? botConfig.url.slice(0, -1)
      : botConfig.url;

    try {
      const res = await fetch(`${cleanUrl}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botNumber: numberToConnect,
          method: method,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onToast(`Erro da API do bot: ${errData.error || res.statusText}`, "error");
        return;
      }

      if (method === "qr") {
        onToast(
          "Solicitação enviada! Gerando QR Code para leitura no WhatsApp...",
          "success",
        );
      } else {
        onToast(
          "Solicitação enviada! Aguardando Código de Pareamento...",
          "success",
        );
      }

      setTimeout(fetchBotStatus, 1000);
      setTimeout(fetchBotStatus, 2500);
    } catch (err: any) {
      onToast(
        `Erro ao conectar com o servidor do bot: ${err.message}`,
        "error",
      );
    } finally {
      setConnecting(false);
      setConnectingMethod(null);
    }
  };

  const handleInjectSession = async (customSessionData?: any) => {
    const rawData = customSessionData || sessionJSON;
    if (!rawData) {
      onToast("Informe ou cole os dados da sessão primeiro.", "error");
      return;
    }

    const numberToConnect = cleanSavedNumber || cleanInputNumber;
    if (!numberToConnect) {
      onToast("Informe um número de WhatsApp primeiro.", "error");
      return;
    }
    if (!botConfig?.url) {
      onToast("URL de conexão do bot não configurada.", "error");
      return;
    }

    setInjecting(true);
    const cleanUrl = botConfig.url.endsWith("/")
      ? botConfig.url.slice(0, -1)
      : botConfig.url;

    try {
      let payloadSessionData: any;
      if (typeof rawData === "string") {
        const trimmed = rawData.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try {
            payloadSessionData = JSON.parse(trimmed);
          } catch {
            payloadSessionData = trimmed;
          }
        } else {
          payloadSessionData = trimmed;
        }
      } else {
        payloadSessionData = rawData;
      }

      const res = await fetch(`${cleanUrl}/api/inject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          botNumber: numberToConnect,
          sessionData: payloadSessionData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onToast(`Erro na injeção: ${errData.error || res.statusText}`, "error");
        return;
      }

      if (saveSessionInDb && profile?.uid) {
        try {
          const stringToSave =
            typeof payloadSessionData === "string"
              ? payloadSessionData
              : JSON.stringify(payloadSessionData);
          await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), {
            savedSessionData: stringToSave,
            sessionSavedAt: serverTimestamp(),
          });
          setProfile((prev) =>
            prev ? { ...prev, savedSessionData: stringToSave } : null,
          );
        } catch (dbErr) {
          console.warn("Não foi possível salvar sessão no banco:", dbErr);
        }
      }

      onToast("Sucesso! Sessão injetada. O bot está iniciando...", "success");
      setShowInjectUI(false);
      setSessionJSON("");
      setTimeout(fetchBotStatus, 2000);
      setTimeout(fetchBotStatus, 4000);
    } catch (err: any) {
      onToast(`Erro ao injetar sessão: ${err.message}`, "error");
    } finally {
      setInjecting(false);
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
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl border-4 border-slate-100 shadow-xl bg-slate-200 overflow-hidden relative">
                      {profile?.photoUrl ? (
                        <img 
                          src={profile.photoUrl} 
                          alt={profile.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <User size={40} />
                        </div>
                      )}
                      
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                          <RefreshCw size={24} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg border-2 border-white transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Alterar foto de perfil"
                    >
                      <Camera size={16} />
                    </button>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <h4 className="mt-4 text-sm font-black text-slate-900">{profile?.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{profile?.role}</p>
                </div>

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

                  {/* Telefone / WhatsApp para Alertas do Bot */}
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 text-slate-400">
                      <Phone size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block font-medium">
                        WhatsApp / Celular (Lembretes do Bot)
                      </span>
                      {isEditingPhone ? (
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="text"
                            placeholder="(24) 99334-6717 ou 5524..."
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium w-full max-w-[190px]"
                          />
                          <button
                            disabled={submittingPhone}
                            onClick={handleSavePhone}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Salvar WhatsApp"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingPhone(false);
                              setPhoneInput(profile?.phone || (profile as any)?.telefone || (profile as any)?.whatsapp || "");
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${profile?.phone || (profile as any)?.telefone || (profile as any)?.whatsapp ? "text-slate-800" : "text-amber-600 italic text-xs"}`}>
                            {profile?.phone || (profile as any)?.telefone || (profile as any)?.whatsapp || "Não cadastrado (obrigatório p/ WhatsApp)"}
                          </span>
                          <button
                            onClick={() => setIsEditingPhone(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer ml-2"
                          >
                            {profile?.phone || (profile as any)?.telefone || (profile as any)?.whatsapp ? "Alterar" : "Cadastrar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

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

                  {/* Microsoft Teams Bot Integration */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-[#464EB8]/10 text-[#464EB8] flex items-center justify-center font-bold text-xs">
                          T
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Microsoft Teams
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Bot de Alertas & Notificações
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(profile?.teamsChatId || profile?.teams_chat_id) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Vinculado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Não vinculado
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowTeamsGuide(!showTeamsGuide)}
                          className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Info size={12} />
                          Ajuda
                        </button>
                      </div>
                    </div>

                    {showTeamsGuide && (
                      <div className="mb-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                        <p className="font-bold mb-1 flex items-center gap-1">
                          <Bot size={14} className="text-blue-600" />
                          Como obter o código no Microsoft Teams:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800">
                          <li>Abra o Microsoft Teams e envie uma mensagem qualquer para o bot oficial da empresa.</li>
                          <li>O bot responderá informando o seu código de identificação (chave longa em <strong>Base64</strong>).</li>
                          <li>Copie o código inteiro e cole no campo abaixo.</li>
                          <li>Clique em <strong>Salvar</strong> e faça um <strong>Teste de Notificação</strong>!</li>
                        </ol>
                      </div>
                    )}

                    {isEditingTeams ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            rows={3}
                            value={teamsInput}
                            onChange={(e) => setTeamsInput(e.target.value)}
                            placeholder="Cole aqui o código Base64 gigante recebido do Bot do Teams..."
                            className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-[#464EB8]/20 focus:border-[#464EB8] transition-all break-all resize-none leading-relaxed"
                          />
                          {teamsInput && (
                            <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                              {teamsInput.length} caracteres
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={handlePasteTeamsFromClipboard}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Clipboard size={12} />
                            Colar
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingTeams(false);
                                setTeamsInput(profile?.teamsChatId || profile?.teams_chat_id || "");
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={submittingTeams}
                              onClick={handleSaveTeams}
                              className="px-3 py-1.5 bg-[#464EB8] hover:bg-[#3b429f] disabled:bg-[#464EB8]/50 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                            >
                              {submittingTeams ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {(profile?.teamsChatId || profile?.teams_chat_id) ? (
                              <div>
                                <span className="text-[11px] font-mono text-slate-700 block truncate select-all">
                                  {profile.teamsChatId || profile.teams_chat_id}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  Tamanho da chave: {(profile.teamsChatId || profile.teams_chat_id || "").length} caracteres Base64
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic">
                                Nenhum código do Teams vinculado. Clique em "Vincular" para receber notificações no Teams.
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingTeams(true)}
                            className="text-xs text-[#464EB8] hover:text-[#3b429f] font-bold hover:underline cursor-pointer"
                          >
                            {(profile?.teamsChatId || profile?.teams_chat_id) ? "Alterar Código" : "Vincular Código"}
                          </button>

                          {(profile?.teamsChatId || profile?.teams_chat_id) && (
                            <button
                              type="button"
                              disabled={testingTeams}
                              onClick={handleTestTeamsNotification}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            >
                              {testingTeams ? (
                                <>
                                  <RefreshCw size={11} className="animate-spin text-[#464EB8]" />
                                  <span>Enviando...</span>
                                </>
                              ) : (
                                <>
                                  <Send size={11} className="text-[#464EB8]" />
                                  <span>Testar Alerta no Teams</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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

                          {/* Connection Trigger Buttons */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {/* 1. Conectar via QR Code (Nova Funcionalidade) */}
                              <button
                                onClick={() => handleConnect("qr")}
                                disabled={connecting}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 cursor-pointer"
                              >
                                {connecting && connectingMethod === "qr" ? (
                                  <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Gerando QR Code...</span>
                                  </>
                                ) : (
                                  <>
                                    <QrIcon size={16} />
                                    <span>Conectar via QR Code</span>
                                  </>
                                )}
                              </button>

                              {/* 2. Conectar via Código (Como já funcionava) */}
                              <button
                                onClick={() => handleConnect("code")}
                                disabled={connecting}
                                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 cursor-pointer"
                              >
                                {connecting && connectingMethod === "code" ? (
                                  <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Solicitando Código...</span>
                                  </>
                                ) : (
                                  <>
                                    <Smartphone size={16} />
                                    <span>Conectar via Código</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* 3. Injeção de Sessão (Nova Rota /api/inject) */}
                            <button
                              onClick={() => setShowInjectUI(!showInjectUI)}
                              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Link size={15} />
                              <span>
                                {showInjectUI
                                  ? "Ocultar Injeção de Sessão"
                                  : "Injetar Sessão (JSON / Base64 / Banco)"}
                              </span>
                            </button>

                            {/* Injetar direto do banco se já houver sessão salva */}
                            {profile?.savedSessionData && !showInjectUI && (
                              <button
                                onClick={() => handleInjectSession(profile.savedSessionData)}
                                disabled={injecting}
                                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Database size={14} />
                                <span>
                                  {injecting
                                    ? "Injetando sessão salva..."
                                    : "Reconectar Usando Sessão Salva no Banco"}
                                </span>
                              </button>
                            )}
                          </div>

                          {showInjectUI && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-3 overflow-hidden"
                            >
                              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-800 leading-relaxed">
                                <p className="font-bold flex items-center gap-1 mb-1 text-amber-900">
                                  <AlertCircle size={12} />
                                  Injeção de Sessão (JSON direto ou Base64):
                                </p>
                                <ol className="list-decimal ml-3 space-y-1">
                                  <li>
                                    Abra o WhatsApp Web oficial em aba anônima e faça login.
                                  </li>
                                  <li>
                                    Copie o código de sessão gerado pela extensão ou o arquivo{" "}
                                    <code>creds.json</code>.
                                  </li>
                                  <li>Cole o JSON ou código em Base64 no campo abaixo.</li>
                                  <li>
                                    Clique em <strong>Injetar e Conectar</strong>. A API
                                    aceita texto JSON direto ou Base64.
                                  </li>
                                </ol>
                              </div>

                              {profile?.savedSessionData && (
                                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-blue-200 text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                    <Database size={14} className="text-blue-600" />
                                    <span>Sessão anterior salva no banco de dados</span>
                                  </div>
                                  <button
                                    onClick={() => handleInjectSession(profile.savedSessionData)}
                                    disabled={injecting}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    {injecting ? "Injetando..." : "Injetar do Banco"}
                                  </button>
                                </div>
                              )}

                              <textarea
                                value={sessionJSON}
                                onChange={(e) => setSessionJSON(e.target.value)}
                                placeholder="Cole aqui o JSON (creds.json) ou Base64 da sessão..."
                                rows={4}
                                className="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-[10px] font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                              />

                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="saveSessionInDb"
                                  checked={saveSessionInDb}
                                  onChange={(e) => setSaveSessionInDb(e.target.checked)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                                <label
                                  htmlFor="saveSessionInDb"
                                  className="text-[11px] text-slate-600 cursor-pointer select-none font-medium"
                                >
                                  Salvar sessão no banco de dados para reconexões automáticas
                                </label>
                              </div>

                              <button
                                onClick={() => handleInjectSession()}
                                disabled={injecting || !sessionJSON.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                              >
                                {injecting ? (
                                  <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Injetando Sessão na API...</span>
                                  </>
                                ) : (
                                  <>
                                    <Link size={14} />
                                    <span>Injetar e Conectar Agora</span>
                                  </>
                                )}
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

                  {/* QR Code Container when qrUrl is present */}
                  {botStatus !== "online" && qrUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 bg-white p-5 rounded-2xl border-2 border-emerald-400 shadow-md text-center flex flex-col items-center gap-3"
                    >
                      <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                          <QrIcon size={18} />
                          <span>QR Code para Conexão</span>
                        </div>
                        <button
                          onClick={() => handleConnect("qr")}
                          disabled={connecting}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                          title="Gerar novo QR Code"
                        >
                          <RefreshCw
                            size={12}
                            className={connecting && connectingMethod === "qr" ? "animate-spin" : ""}
                          />
                          <span>Atualizar QR</span>
                        </button>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
                        <img
                          src={qrUrl}
                          alt="QR Code WhatsApp"
                          className="w-56 h-56 object-contain rounded-lg mx-auto"
                        />
                      </div>

                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          Escaneie com seu WhatsApp
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                          No WhatsApp do seu celular, vá em{" "}
                          <strong>Aparelhos Conectados</strong> &gt;{" "}
                          <strong>Conectar um Aparelho</strong> e aponte a câmera
                          para o QR Code acima.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Pairing Code Container when pairingCode is present */}
                  {botStatus !== "online" && !qrUrl && botInfo?.pairingCode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-md text-center flex flex-col items-center gap-3"
                    >
                      <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                          <Smartphone size={18} />
                          <span>Código de Pareamento</span>
                        </div>
                        <button
                          onClick={() => handleConnect("code")}
                          disabled={connecting}
                          className="text-[11px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                          title="Gerar novo código"
                        >
                          <RefreshCw
                            size={12}
                            className={connecting && connectingMethod === "code" ? "animate-spin" : ""}
                          />
                          <span>Novo Código</span>
                        </button>
                      </div>

                      <div className="bg-slate-900 text-white font-mono text-2xl font-bold tracking-widest px-6 py-3 rounded-xl shadow flex items-center gap-3">
                        <span>{botInfo.pairingCode}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(botInfo.pairingCode!);
                            onToast("Código copiado!", "success");
                          }}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Copiar código"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                        Abra a notificação recebida no WhatsApp do celular e insira
                        este código para autorizar a conexão.
                      </p>
                    </motion.div>
                  )}

                  {/* Waiting container when in pairing state but code/QR not ready yet */}
                  {botInfo && botStatus === "pairing" && !qrUrl && !botInfo?.pairingCode && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 bg-white p-4 rounded-xl border-2 border-dashed border-amber-300 text-center flex flex-col gap-2 items-center shadow-inner"
                    >
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center animate-pulse">
                        <RefreshCw size={20} className="animate-spin" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Aguardando o servidor gerar a conexão...
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-[240px]">
                        O servidor está preparando os dados. O painel verifica o
                        status a cada 3 segundos e exibirá aqui assim que estiver
                        pronto.
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

                      const conflictFullDay = existingApprovals.find((appr) => {
                        if (appr.solicitanteId === profile.uid) return false;
                        // Only full-day absences (Folga/Férias) block other full-day absences
                        if (appr.tipo === "Saída durante o dia") return false;
                        
                        return (
                          dataInicio <= appr.dataFim &&
                          appr.dataInicio <= dataFim
                        );
                      });

                      if (conflictFullDay && (tipo === "Folga" || tipo === "Férias")) {
                        onToast(
                          `Atenção: Já existe um funcionário (${conflictFullDay.solicitanteNome}) em ${conflictFullDay.tipo} neste período (${formatDateBr(conflictFullDay.dataInicio)} a ${formatDateBr(conflictFullDay.dataFim)}). Como a unidade não pode ficar sem cobertura total, você só pode solicitar "Saída durante o dia" para esta data.`,
                          "error",
                        );
                        setSubmittingFolga(false);
                        return;
                      }

                      const docData: any = {
                        solicitanteId: profile.uid,
                        solicitanteNome: profile.name,
                        solicitanteEmail: profile.email,
                        solicitanteRole: profile.role,
                        dataInicio,
                        dataFim,
                        tipo,
                        status: "Pendente",
                        unidade: profile.unidade || "",
                        justificativa,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                      };

                      if (tipo === "Saída durante o dia") {
                        docData.horaInicio = horaInicio;
                        docData.horaFim = horaFim;
                      }

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
                      setHoraInicio("08:00");
                      setHoraFim("12:00");
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Tipo de Ausência
                      </label>
                      <select
                        value={tipo}
                        onChange={(e) =>
                          setTipo(e.target.value as any)
                        }
                        className={`bg-white w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium h-[38px] ${hasConflictOnSelectedDates && tipo !== "Saída durante o dia" ? "border-amber-500 ring-2 ring-amber-100" : "border-slate-200"}`}
                      >
                        <option value="Folga" disabled={Boolean(hasConflictOnSelectedDates)}>Folga {hasConflictOnSelectedDates ? "(Indisponível)" : ""}</option>
                        <option value="Férias" disabled={Boolean(hasConflictOnSelectedDates)}>Férias {hasConflictOnSelectedDates ? "(Indisponível)" : ""}</option>
                        <option value="Saída durante o dia">Saída durante o dia</option>
                      </select>
                      {hasConflictOnSelectedDates && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700 flex items-start gap-1.5 leading-tight">
                          <AlertCircle size={12} className="shrink-0 mt-0.5" />
                          <span>
                            <strong>Atenção:</strong> Já existe aprovação para <strong>{hasConflictOnSelectedDates.solicitanteNome}</strong> neste período. 
                            Neste caso, você só pode solicitar <strong>"Saída durante o dia"</strong>.
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {tipo === "Saída durante o dia" ? "Data da Ausência" : "Dia de Início"}
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => {
                          setDataInicio(e.target.value);
                          if (tipo === "Saída durante o dia") setDataFim(e.target.value);
                        }}
                        className="bg-white w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none h-[38px]"
                        required
                      />
                    </div>
                  </div>

                  {tipo === "Saída durante o dia" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Horário de Início
                        </label>
                        <input
                          type="time"
                          value={horaInicio}
                          onChange={(e) => setHoraInicio(e.target.value)}
                          className="bg-white w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none h-[38px]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Horário de Fim
                        </label>
                        <input
                          type="time"
                          value={horaFim}
                          onChange={(e) => setHoraFim(e.target.value)}
                          className="bg-white w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none h-[38px]"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
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
                  )}

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
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${folga.tipo === "Férias" ? "bg-purple-100 text-purple-700" : folga.tipo === "Saída durante o dia" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
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
                              {folga.tipo === "Saída durante o dia" ? (
                                <>
                                  Dia: <strong className="text-slate-950 font-bold">{formatDateBr(folga.dataInicio)}</strong>
                                  {" "} Horário: <strong className="text-slate-950 font-bold">{folga.horaInicio} às {folga.horaFim}</strong>
                                </>
                              ) : (
                                <>
                                  Período:{" "}
                                  <strong className="text-slate-950 font-bold">
                                    {formatDateBr(folga.dataInicio)}
                                  </strong>{" "}
                                  a{" "}
                                  <strong className="text-slate-950 font-bold">
                                    {formatDateBr(folga.dataFim)}
                                  </strong>
                                </>
                              )}
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
