import React, { useState, useMemo } from "react";
import { 
  MessageSquare, 
  Send, 
  Mail, 
  Search, 
  Loader2, 
  History, 
  User, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  Database, 
  Building2, 
  RefreshCw, 
  IdCard, 
  GraduationCap, 
  Flame, 
  Snowflake, 
  Bot, 
  Copy, 
  ExternalLink,
  Sparkles,
  ArrowRight,
  Phone
} from "lucide-react";
import { 
  Lead, 
  BaseEntry, 
  CalendarioAcao, 
  UserProfile, 
  Ligacao,
  FiesProuniEntry,
  GapEntry,
  WhatsAppMessage,
  BotConfig
} from "../types";
import { cn, formatPhone, getWhatsAppUrl, getLeadTemperatura, LeadTemperatura } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { db, COLLECTIONS } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

interface ControleWhatsAppMalaDiretaViewProps {
  bases: BaseEntry[];
  leads?: Lead[];
  acoes?: CalendarioAcao[];
  ligacoes: Ligacao[];
  fiesProuni?: FiesProuniEntry[];
  gap?: GapEntry[];
  profile: UserProfile;
  whatsappMessages?: WhatsAppMessage[];
  botConfig?: BotConfig;
  onSendBot?: (tel: string, msg: string, contactName?: string) => void;
  onToast: (m: string, t?: "success" | "error") => void;
  initialBaseName?: string;
  onClose?: () => void;
}

export default function ControleWhatsAppMalaDiretaView({
  bases = [],
  leads = [],
  acoes = [],
  ligacoes = [],
  fiesProuni = [],
  gap = [],
  profile,
  whatsappMessages = [],
  botConfig,
  onSendBot,
  onToast,
  initialBaseName = "",
  onClose
}: ControleWhatsAppMalaDiretaViewProps) {
  const [sourceType, setSourceType] = useState<"Base" | "Lead" | "FiesProuni" | "Gap">("Base");
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialBaseName || "");
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [selectedMetodologia, setSelectedMetodologia] = useState<string>("");
  const [currentCandidate, setCurrentCandidate] = useState<Lead | BaseEntry | FiesProuniEntry | GapEntry | null>(null);

  // Message & Channel config
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [activeChannel, setActiveChannel] = useState<"WhatsApp" | "Mala Direta">("WhatsApp");

  // Outcome registration
  const [isSaving, setIsSaving] = useState(false);
  const [observation, setObservation] = useState("");
  const [showObservation, setShowObservation] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedTemperatura, setSelectedTemperatura] = useState<LeadTemperatura>("Quente");

  // Get unique base names
  const baseNames = useMemo(() => {
    const names = new Set(bases.map(b => b.nomeBase).filter(Boolean));
    return Array.from(names).sort();
  }, [bases]);

  // Get unique actions from leads
  const actionOptions = useMemo(() => {
    const names = new Set(leads.map(l => l.acao).filter(Boolean));
    return Array.from(names).sort();
  }, [leads]);

  // Get unique courses for the selected base
  const cursoOptions = useMemo(() => {
    if (sourceType !== "Base" || !selectedSourceId) return [];
    const filtered = bases.filter(b => b.nomeBase === selectedSourceId);
    const names = new Set(filtered.map(b => b.curso).filter(Boolean));
    return Array.from(names).sort();
  }, [bases, sourceType, selectedSourceId]);

  // Get unique methodologies for the selected base
  const metodologiaOptions = useMemo(() => {
    if (sourceType !== "Base" || !selectedSourceId) return [];
    const filtered = bases.filter(b => b.nomeBase === selectedSourceId);
    const names = new Set(filtered.map(b => b.metodologia).filter(Boolean));
    return Array.from(names).sort();
  }, [bases, sourceType, selectedSourceId]);

  // Candidate pool based on current selection
  const candidatePool = useMemo(() => {
    if (!sourceType) return [];
    if ((sourceType === "Base" || sourceType === "Lead") && !selectedSourceId) return [];

    let candidates: (Lead | BaseEntry | FiesProuniEntry | GapEntry)[] = [];
    if (sourceType === "Base") {
      candidates = bases.filter(b => {
        const matchesBase = b.nomeBase === selectedSourceId;
        const matchesCurso = !selectedCurso || b.curso === selectedCurso;
        const matchesMetodologia = !selectedMetodologia || b.metodologia === selectedMetodologia;
        return matchesBase && matchesCurso && matchesMetodologia;
      });
    } else if (sourceType === "Lead") {
      candidates = leads.filter(l => l.acao === selectedSourceId);
    } else if (sourceType === "FiesProuni") {
      candidates = fiesProuni.filter(f => f.docsEntreguesStatus !== "Sim" && f.status !== "Convertido");
    } else if (sourceType === "Gap") {
      candidates = gap;
    }

    // Filter out converted candidates
    const filtered = candidates.filter(c => {
      const status = (c as any).status;
      return status !== 'Convertido' && !(c as any).converted;
    });

    return filtered;
  }, [sourceType, selectedSourceId, selectedCurso, selectedMetodologia, bases, leads, fiesProuni, gap]);

  // Count available candidates not yet contacted today via this channel/interaction
  const availableCount = useMemo(() => {
    if (candidatePool.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];

    const available = candidatePool.filter(c => {
      const lastContact = ligacoes
        .filter(l => l.candidatoId === c.id)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
      
      if (!lastContact || !lastContact.createdAt) return true;
      const contactDate = new Date(lastContact.createdAt.seconds * 1000).toISOString().split('T')[0];
      return contactDate !== today;
    });

    return available.length;
  }, [candidatePool, ligacoes]);

  // Interpolate message variables
  const computedMessage = useMemo(() => {
    if (!currentCandidate) return "";
    let templateText = customMessage;
    if (selectedTemplateId) {
      const t = whatsappMessages.find(m => m.id === selectedTemplateId);
      if (t) templateText = t.texto;
    }

    if (!templateText) {
      templateText = "Olá, {nome}! Tudo bem? Entramos em contato a respeito do seu interesse no curso de {curso} na nossa unidade. Como podemos te ajudar?";
    }

    const cNome = currentCandidate.nome || "Candidato(a)";
    const cCurso = (currentCandidate as any).curso || (currentCandidate as any).cursoInteresse || "Curso Superior";
    const cUnidade = (currentCandidate as any).unidade || profile.unidade || "nossa instituição";

    return templateText
      .replace(/{nome}/gi, cNome)
      .replace(/{curso}/gi, cCurso)
      .replace(/{unidade}/gi, cUnidade);
  }, [currentCandidate, selectedTemplateId, customMessage, whatsappMessages, profile]);

  const handleStartWorkflow = (ignoreId?: string | React.MouseEvent) => {
    if ((sourceType === "Base" || sourceType === "Lead") && !selectedSourceId) {
      onToast("Selecione uma base ou ação para iniciar o trabalho.", "error");
      return;
    }

    if (candidatePool.length === 0) {
      onToast("Não há candidatos disponíveis nesta seleção.", "error");
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const withContactInfo = candidatePool.map(c => {
      const lastContact = ligacoes
        .filter(l => l.candidatoId === c.id)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
      return { candidate: c, lastContact };
    });

    const available = withContactInfo.filter(item => {
      if (typeof ignoreId === 'string' && item.candidate.id === ignoreId) return false;
      if (!item.lastContact || !item.lastContact.createdAt) return true;
      const contactDate = new Date(item.lastContact.createdAt.seconds * 1000).toISOString().split('T')[0];
      return contactDate !== today;
    });

    if (available.length === 0) {
      if (typeof ignoreId === 'string') {
        onToast("Fim da fila! Todos os candidatos selecionados já foram contatados hoje.", "success");
        setCurrentCandidate(null);
      } else {
        onToast("Todos os candidatos desta seleção já foram contatados hoje.", "error");
      }
      return;
    }

    // Sort: never contacted first, then older contacts first
    available.sort((a, b) => {
      if (!a.lastContact) return -1;
      if (!b.lastContact) return 1;
      return (a.lastContact.createdAt?.seconds || 0) - (b.lastContact.createdAt?.seconds || 0);
    });

    setCurrentCandidate(available[0].candidate);
    setObservation("");
    setShowObservation(false);
    setSelectedStatus(null);
  };

  // Actions for opening WhatsApp
  const handleOpenWhatsApp = () => {
    if (!currentCandidate) return;
    const phone = currentCandidate.telefone;
    const url = getWhatsAppUrl(phone, computedMessage);
    window.open(url, "_blank");
    onToast("WhatsApp aberto com mensagem preparada!", "success");
  };

  // Actions for sending via Bot
  const handleSendBot = () => {
    if (!currentCandidate) return;
    if (onSendBot) {
      onSendBot(currentCandidate.telefone, computedMessage, currentCandidate.nome);
      onToast(`Mensagem enviada para a fila do robô para ${currentCandidate.nome}!`, "success");
    } else {
      onToast("Robô de WhatsApp não está ativo nesta sessão.", "error");
    }
  };

  // Copy message text
  const handleCopyMessage = () => {
    if (!computedMessage) return;
    navigator.clipboard.writeText(computedMessage);
    onToast("Mensagem copiada para a área de transferência!", "success");
  };

  // Handle selecting a status
  const handleSelectStatus = (status: string) => {
    setSelectedStatus(status);
    const temp = getLeadTemperatura(status);
    setSelectedTemperatura(temp);
    setShowObservation(true);
  };

  // Confirm and save interaction
  const handleConfirmAndNext = async () => {
    if (!currentCandidate || !selectedStatus) return;

    setIsSaving(true);
    try {
      const candidatoCurso = (currentCandidate as any).curso || (currentCandidate as any).cursoInteresse || "Não informado";
      const originName = selectedSourceId || (sourceType === "FiesProuni" ? "Fies/Prouni" : sourceType === "Gap" ? "GAP" : "Base");

      // 1. Save to CONTROLE_LIGACOES (unified interaction log)
      await addDoc(collection(db, COLLECTIONS.CONTROLE_LIGACOES), {
        candidatoId: currentCandidate.id,
        candidatoNome: currentCandidate.nome,
        candidatoTelefone: currentCandidate.telefone,
        origem: sourceType,
        origemId: originName,
        canal: activeChannel, // WhatsApp or Mala Direta
        temperatura: selectedTemperatura, // Quente or Frio
        status: selectedStatus,
        observacao: observation.trim(),
        mensagemEnviada: computedMessage.substring(0, 300),
        atendenteId: profile.uid,
        atendenteNome: profile.nome || profile.name || "Atendente",
        unidade: profile.unidade || (currentCandidate as any).unidade || "",
        createdAt: serverTimestamp(),
      });

      // 2. Also register in channel-specific collection for reporting consistency
      if (activeChannel === "WhatsApp") {
        await addDoc(collection(db, COLLECTIONS.WHATS_CONTACTS), {
          contactId: currentCandidate.id || "",
          nome: currentCandidate.nome || "Não informado",
          telefone: currentCandidate.telefone || "Não informado",
          curso: candidatoCurso,
          origem: originName,
          temperatura: selectedTemperatura,
          status: selectedStatus,
          observacao: observation.trim(),
          userName: profile.nome || profile.name,
          userEmail: profile.email,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLLECTIONS.MALA_DIRETA_CONTACTS), {
          contactId: currentCandidate.id || "",
          nome: currentCandidate.nome || "Não informado",
          telefone: currentCandidate.telefone || "Não informado",
          curso: candidatoCurso,
          origem: originName,
          temperatura: selectedTemperatura,
          status: selectedStatus,
          observacao: observation.trim(),
          userName: profile.nome || profile.name,
          userEmail: profile.email,
          createdAt: serverTimestamp(),
        });
      }

      // 3. Update candidate base status if applicable
      if (sourceType === "Base" && currentCandidate.id) {
        try {
          const updatePayload: any = {
            temperatura: selectedTemperatura,
          };
          if (selectedStatus === "Convertido") {
            updatePayload.status = "Convertido";
          } else if (selectedStatus === "Interesse") {
            updatePayload.status = "Interessado";
          } else if (selectedStatus === "Sem interesse") {
            updatePayload.status = "Não tem interesse";
          }
          await updateDoc(doc(db, COLLECTIONS.BASES, currentCandidate.id), updatePayload);
        } catch (e) {
          console.warn("Could not update candidate doc in base:", e);
        }
      }

      onToast(`Atendimento registrado com sucesso! Lead classificado como ${selectedTemperatura === 'Quente' ? '🔥 Quente' : '❄️ Frio'}.`, "success");

      const finishedId = currentCandidate.id;
      setCurrentCandidate(null);
      setObservation("");
      setShowObservation(false);
      setSelectedStatus(null);

      // Auto-advance to the next candidate in the queue
      handleStartWorkflow(finishedId);
    } catch (err) {
      console.error(err);
      onToast("Erro ao registrar atendimento.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const candidateHistory = useMemo(() => {
    if (!currentCandidate) return [];
    return ligacoes
      .filter(l => l.candidatoId === currentCandidate.id)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [currentCandidate, ligacoes]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 p-6 rounded-3xl text-white shadow-xl shadow-emerald-500/10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-white">
              <MessageSquare size={26} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Trabalho por WhatsApp & Mala Direta</h2>
          </div>
          <p className="text-emerald-100 text-sm font-medium">
            Fluxo contínuo para acionamento de candidatos em fila, envio de mensagens e classificação térmica (Lead Frio / Lead Quente).
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors self-start sm:self-center"
          >
            Voltar às Bases
          </button>
        )}
      </div>

      {!currentCandidate ? (
        /* Source Selector Screen */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 space-y-6"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Database size={16} className="text-emerald-600" />
                1. Escolha a Origem dos Candidatos
              </label>
              <span className="text-xs font-semibold text-slate-400">Selecione para carregar a fila de contatos</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  setSourceType("Base");
                  setSelectedSourceId("");
                }}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5 text-center relative overflow-hidden",
                  sourceType === "Base" 
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 font-bold shadow-md shadow-emerald-100" 
                    : "border-slate-100 hover:border-emerald-200 text-slate-600"
                )}
              >
                <Database size={28} className={sourceType === "Base" ? "text-emerald-600" : "text-slate-400"} />
                <span className="text-sm font-bold">Bases de Candidatos</span>
                <span className="text-[11px] font-semibold text-slate-400">Total: {bases.length}</span>
              </button>

              <button
                onClick={() => {
                  setSourceType("Lead");
                  setSelectedSourceId("");
                }}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5 text-center relative overflow-hidden",
                  sourceType === "Lead" 
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 font-bold shadow-md shadow-emerald-100" 
                    : "border-slate-100 hover:border-emerald-200 text-slate-600"
                )}
              >
                <Building2 size={28} className={sourceType === "Lead" ? "text-emerald-600" : "text-slate-400"} />
                <span className="text-sm font-bold">Leads (Ações de Rua)</span>
                <span className="text-[11px] font-semibold text-slate-400">Total: {leads.length}</span>
              </button>

              <button
                onClick={() => {
                  setSourceType("FiesProuni");
                  setSelectedSourceId("Fies/Prouni");
                }}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5 text-center relative overflow-hidden",
                  sourceType === "FiesProuni" 
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 font-bold shadow-md shadow-emerald-100" 
                    : "border-slate-100 hover:border-emerald-200 text-slate-600"
                )}
              >
                <GraduationCap size={28} className={sourceType === "FiesProuni" ? "text-emerald-600" : "text-slate-400"} />
                <span className="text-sm font-bold">Fies & ProUni</span>
                <span className="text-[11px] font-semibold text-slate-400">Total: {fiesProuni.length}</span>
              </button>

              <button
                onClick={() => {
                  setSourceType("Gap");
                  setSelectedSourceId("GAP");
                }}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5 text-center relative overflow-hidden",
                  sourceType === "Gap" 
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 font-bold shadow-md shadow-emerald-100" 
                    : "border-slate-100 hover:border-emerald-200 text-slate-600"
                )}
              >
                <Building2 size={28} className={sourceType === "Gap" ? "text-emerald-600" : "text-slate-400"} />
                <span className="text-sm font-bold">GAP Acadêmico</span>
                <span className="text-[11px] font-semibold text-slate-400">Total: {gap.length}</span>
              </button>
            </div>
          </div>

          {/* Source Sub-filters */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {(sourceType === "Base" || sourceType === "Lead") && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Selecione {sourceType === "Base" ? "a Base de Candidatos" : "a Ação de Leads"}
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => {
                    setSelectedSourceId(e.target.value);
                    setSelectedCurso("");
                    setSelectedMetodologia("");
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 transition-all outline-none bg-slate-50 font-bold text-slate-800"
                >
                  <option value="">Selecione a {sourceType === "Base" ? "Base" : "Ação"}...</option>
                  {sourceType === "Base" ? (
                    baseNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))
                  ) : (
                    actionOptions.map(acao => (
                      <option key={acao} value={acao}>{acao}</option>
                    ))
                  )}
                </select>
              </div>
            )}

            {sourceType === "Base" && selectedSourceId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Filtrar por Curso (Opcional)
                  </label>
                  <select
                    value={selectedCurso}
                    onChange={(e) => setSelectedCurso(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-emerald-500 transition-all outline-none bg-slate-50 text-sm font-medium"
                  >
                    <option value="">Todos os Cursos</option>
                    {cursoOptions.map(curso => (
                      <option key={curso} value={curso}>{curso}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Filtrar por Metodologia (Opcional)
                  </label>
                  <select
                    value={selectedMetodologia}
                    onChange={(e) => setSelectedMetodologia(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-emerald-500 transition-all outline-none bg-slate-50 text-sm font-medium"
                  >
                    <option value="">Todas as Metodologias</option>
                    {metodologiaOptions.map(meto => (
                      <option key={meto} value={meto}>{meto}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Default Channel & Template Selector */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Canal Padrão de Trabalho:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveChannel("WhatsApp")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                      activeChannel === "WhatsApp" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
                    )}
                  >
                    <MessageSquare size={14} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setActiveChannel("Mala Direta")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                      activeChannel === "Mala Direta" ? "bg-amber-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
                    )}
                  >
                    <Mail size={14} />
                    Mala Direta
                  </button>
                </div>
              </div>

              {whatsappMessages.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500">Modelo de Mensagem Pré-definido:</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-emerald-500"
                  >
                    <option value="">Mensagem Padrão (Saudação + Curso)</option>
                    {whatsappMessages.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Counter status */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Status da Fila</span>
                <span className="text-base font-black text-emerald-950">
                  {selectedSourceId || (sourceType !== "Base" && sourceType !== "Lead")
                    ? `${availableCount} candidato(s) disponível(eis) para atendimento hoje`
                    : "Aguardando seleção da base..."}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  Fila Inteligente
                </span>
              </div>
            </div>

            <button
              disabled={availableCount === 0}
              onClick={handleStartWorkflow}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
            >
              <Send size={22} />
              Iniciar Atendimento em Fila ({availableCount})
            </button>
          </div>
        </motion.div>
      ) : (
        /* Active Candidate Workflow Screen (Same flow as Controle de Ligações) */
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 space-y-6"
          >
            {/* Candidate Info Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-start sm:items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 rounded-2xl shadow-inner">
                  <User size={34} />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{currentCandidate.nome}</h3>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                      {sourceType}
                    </span>
                    {(currentCandidate as any).temperatura && (
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                        (currentCandidate as any).temperatura === "Quente" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {(currentCandidate as any).temperatura === "Quente" ? <Flame size={12} className="text-amber-600" /> : <Snowflake size={12} className="text-blue-600" />}
                        Lead {(currentCandidate as any).temperatura}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <Phone size={15} className="text-emerald-600" />
                      {formatPhone(currentCandidate.telefone)}
                    </span>
                    {currentCandidate.cpf && (
                      <span className="flex items-center gap-1.5">
                        <IdCard size={15} className="text-slate-400" />
                        {currentCandidate.cpf}
                      </span>
                    )}
                    {((currentCandidate as any).curso || (currentCandidate as any).cursoInteresse) && (
                      <span className="flex items-center gap-1.5">
                        <GraduationCap size={15} className="text-slate-400" />
                        {(currentCandidate as any).curso || (currentCandidate as any).cursoInteresse}
                      </span>
                    )}
                    {(currentCandidate as any).metodologia && (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs">
                        {(currentCandidate as any).metodologia}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress counter & Skip button */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => handleStartWorkflow(currentCandidate.id)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Pular este candidato para o próximo"
                >
                  <span>Pular</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Contact History if exists */}
            {candidateHistory.length > 0 && (
              <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <History size={14} />
                  Histórico de Contatos Anteriores ({candidateHistory.length})
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                  {candidateHistory.map((h) => {
                    const temp = getLeadTemperatura(h);
                    return (
                      <div key={h.id} className="flex gap-3 items-start text-xs bg-white p-3 rounded-xl border border-slate-100">
                        <div className={cn(
                          "mt-0.5 p-1 rounded-full",
                          temp === "Quente" ? "bg-amber-500" : "bg-blue-400"
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 flex items-center gap-1">
                              {h.canal === "WhatsApp" ? <MessageSquare size={13} className="text-emerald-600" /> : h.canal === "Mala Direta" ? <Mail size={13} className="text-amber-600" /> : <Phone size={13} className="text-blue-600" />}
                              {h.canal || "Ligação"} • {h.status}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-0.5",
                              temp === "Quente" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"
                            )}>
                              {temp === "Quente" ? <Flame size={10} /> : <Snowflake size={10} />}
                              {temp}
                            </span>
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {h.atendenteNome} • {h.createdAt?.toDate ? h.createdAt.toDate().toLocaleString("pt-BR") : "Data não disponível"}
                          </div>
                          {h.observacao && (
                            <p className="text-slate-700 mt-1 italic font-medium">"{h.observacao}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Box: WhatsApp & Mala Direta Buttons & Message Preview */}
            <div className="p-6 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl border border-emerald-100/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" />
                  Ações de Envio Imediato
                </span>
                <span className="text-xs font-semibold text-slate-400">Canal ativo: <b>{activeChannel}</b></span>
              </div>

              {/* Message text preview & edit */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Mensagem que será enviada:</label>
                  <button
                    onClick={handleCopyMessage}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Copy size={13} />
                    Copiar Texto
                  </button>
                </div>
                <textarea
                  value={customMessage || computedMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-emerald-500 transition-all text-slate-800"
                  placeholder="Digite ou personalize a mensagem aqui..."
                />
              </div>

              {/* Interactive Send Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* 1. Open WhatsApp */}
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95 group"
                >
                  <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                  Abrir WhatsApp Web / App
                </button>

                {/* 2. Send via Bot */}
                {botConfig?.active || profile?.botNumber ? (
                  <button
                    type="button"
                    onClick={handleSendBot}
                    className="p-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all transform active:scale-95 group"
                  >
                    <Bot size={18} className="group-hover:scale-110 transition-transform" />
                    Enviar via Robô (Bot)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyMessage();
                      setActiveChannel("WhatsApp");
                    }}
                    className="p-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                    <Copy size={18} />
                    Copiar p/ Envio Rápido
                  </button>
                )}

                {/* 3. Send Mala Direta */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveChannel("Mala Direta");
                    handleCopyMessage();
                    onToast("Texto preparado para Mala Direta!", "success");
                  }}
                  className="p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all transform active:scale-95 group"
                >
                  <Mail size={18} className="group-hover:scale-110 transition-transform" />
                  Registrar / Mala Direta
                </button>
              </div>
            </div>

            {/* Outcome Status & Lead Temperature Classification */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  2. Registrar Retorno do Candidato & Classificação do Lead
                </h4>
                <span className="text-xs font-bold text-slate-500">
                  Classificação térmica automática com ajuste manual
                </span>
              </div>

              <AnimatePresence mode="wait">
                {showObservation ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200"
                  >
                    {/* Temperature toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Classificação deste Contato
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {selectedStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Temperatura do Lead:</span>
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setSelectedTemperatura("Quente")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all",
                              selectedTemperatura === "Quente" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            <Flame size={14} />
                            🔥 Lead Quente
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTemperatura("Frio")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all",
                              selectedTemperatura === "Frio" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            <Snowflake size={14} />
                            ❄️ Lead Frio
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Observação do Atendimento:
                      </label>
                      <textarea
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        placeholder="Ex.: Aluno gostou da grade e pediu desconto para turno da noite; aguardando envio de documentos..."
                        className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 transition-all outline-none bg-white font-medium text-sm min-h-[90px]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowObservation(false);
                          setSelectedStatus(null);
                        }}
                        className="flex-1 bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-100 transition-all text-sm"
                      >
                        Voltar e Escolher Outro Status
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleConfirmAndNext}
                        className="flex-[2] bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : (
                          <>
                            <CheckCircle2 size={18} />
                            Confirmar, Salvar e Chamar Próximo
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Frio Options */}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectStatus("Não respondeu")}
                      className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-all flex flex-col items-center gap-2 text-center group"
                    >
                      <Clock size={24} className="text-slate-400 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs">Não respondeu / Pendente</span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Snowflake size={10} /> Lead Frio
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectStatus("Sem interesse")}
                      className="p-4 rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all flex flex-col items-center gap-2 text-center group"
                    >
                      <XCircle size={24} className="text-rose-500 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs">Sem interesse no momento</span>
                      <span className="text-[10px] font-black text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Snowflake size={10} /> Lead Frio
                      </span>
                    </button>

                    {/* Quente Options */}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectStatus("Interesse")}
                      className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100 transition-all flex flex-col items-center gap-2 text-center group"
                    >
                      <Flame size={24} className="text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs">Demonstrou Interesse</span>
                      <span className="text-[10px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Flame size={10} /> Lead Quente
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectStatus("Vai enviar a documentação via whatsapp/email")}
                      className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all flex flex-col items-center gap-2 text-center group"
                    >
                      <MessageSquare size={24} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs">Vai enviar doc Whats/Email</span>
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Flame size={10} /> Lead Quente
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectStatus("Vai entregar pessoalmente na unidade")}
                      className="p-4 rounded-2xl border-2 border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-all flex flex-col items-center gap-2 text-center group"
                    >
                      <Building2 size={24} className="text-teal-600 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs">Vai entregar na Unidade</span>
                      <span className="text-[10px] font-black text-teal-800 bg-teal-200/80 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Flame size={10} /> Lead Quente
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectStatus("Convertido")}
                      className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-all flex flex-col items-center gap-2 text-center group"
                    >
                      <CheckCircle2 size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs">Convertido / Matriculado</span>
                      <span className="text-[10px] font-black text-blue-800 bg-blue-200/80 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Flame size={10} /> Lead Quente
                      </span>
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom cancel & back */}
            <button
              type="button"
              onClick={() => setCurrentCandidate(null)}
              className="text-slate-400 font-bold text-xs hover:text-slate-600 transition-all flex items-center justify-center gap-2 w-full pt-4 border-t border-slate-100"
            >
              Interromper fila e voltar à seleção de bases
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
