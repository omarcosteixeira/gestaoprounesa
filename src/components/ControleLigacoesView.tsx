import React, { useState, useMemo } from "react";
import { 
  Phone, 
  Search, 
  Loader2, 
  History, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronRight,
  Database,
  Building2,
  RefreshCw,
  IdCard,
  GraduationCap
} from "lucide-react";
import { 
  Lead, 
  BaseEntry, 
  CalendarioAcao, 
  UserProfile, 
  Ligacao,
  FiesProuniEntry,
  GapEntry
} from "../types";
import { cn, formatPhone } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ControleLigacoesViewProps {
  leads: Lead[];
  bases: BaseEntry[];
  acoes: CalendarioAcao[];
  ligacoes: Ligacao[];
  fiesProuni: FiesProuniEntry[];
  gap: GapEntry[];
  profile: UserProfile;
  onSaveLigacao: (ligacao: Partial<Ligacao>) => Promise<void>;
  onToast: (m: string, t?: "success" | "error") => void;
}

export default function ControleLigacoesView({
  leads,
  bases,
  acoes,
  ligacoes,
  fiesProuni,
  gap,
  profile,
  onSaveLigacao,
  onToast
}: ControleLigacoesViewProps) {
  const [sourceType, setSourceType] = useState<"Base" | "Lead" | "FiesProuni" | "Gap" | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [selectedMetodologia, setSelectedMetodologia] = useState<string>("");
  const [currentCandidate, setCurrentCandidate] = useState<Lead | BaseEntry | FiesProuniEntry | GapEntry | null>(null);

  const availableCount = useMemo(() => {
    if (!sourceType) return 0;
    if ((sourceType === "Base" || sourceType === "Lead") && !selectedSourceId) return 0;

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

    // Filter out converted and called today
    const filtered = candidates.filter(c => {
      const status = (c as any).status;
      return status !== 'Convertido' && !(c as any).converted;
    });

    const today = new Date().toISOString().split('T')[0];
    const available = filtered.filter(c => {
      const lastCall = ligacoes
        .filter(l => l.candidatoId === c.id)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
      
      if (!lastCall || !lastCall.createdAt) return true;
      const callDate = new Date(lastCall.createdAt.seconds * 1000).toISOString().split('T')[0];
      return callDate !== today;
    });

    return available.length;
  }, [sourceType, selectedSourceId, selectedCurso, selectedMetodologia, bases, leads, fiesProuni, gap, ligacoes]);

  const availableStatusText = useMemo(() => {
    if (!sourceType) return "";
    if ((sourceType === "Base" || sourceType === "Lead") && !selectedSourceId) return "";
    return `${availableCount} candidato(s) disponível(eis) para ligar`;
  }, [availableCount, sourceType, selectedSourceId]);

  const [isSaving, setIsSaving] = useState(false);
  const [observation, setObservation] = useState("");
  const [showObservation, setShowObservation] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'Não atendeu' | 'Sem interesse' | 'Interesse' | 'Convertido' | 'Vai enviar a documentação via whatsapp/email' | 'Vai entregar pessoalmente na unidade' | null>(null);

  // Get unique base names
  const baseNames = useMemo(() => {
    const names = new Set(bases.map(b => b.nomeBase));
    return Array.from(names).sort();
  }, [bases]);

  // Get unique actions from leads (Historico)
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

  const handleStartCall = (ignoreId?: string | React.MouseEvent) => {
    if ((sourceType === "Base" || sourceType === "Lead") && !selectedSourceId) {
      onToast("Selecione uma base ou ação para continuar.", "error");
      return;
    }

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
      // In Gap we assume they need documents if not all are true. We'll just filter out converted if there's such a status.
      // But they are in GAP because they have pending docs or matAcad false.
      // Let's filter out candidates who have ALL documents checked or if that's not easily checked, we just load them all.
      candidates = gap.filter(g => {
        // You might want to refine this filter, but generally GAP means they are missing something.
        // Let's assume if it's in GAP, it needs docs.
        return true; 
      });
    }

    // Filter out converted candidates
    const filtered = candidates.filter(c => {
      const status = (c as any).status;
      return status !== 'Convertido' && !(c as any).converted;
    });

    if (filtered.length === 0) {
      onToast("Não há candidatos disponíveis nesta seleção.", "error");
      return;
    }

    // Filter out candidates called today and optionally the ignored one
    const today = new Date().toISOString().split('T')[0];
    
    const withCallInfo = filtered.map(c => {
      const lastCall = ligacoes
        .filter(l => l.candidatoId === c.id)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
      return { candidate: c, lastCall };
    });

    const available = withCallInfo.filter(item => {
      if (typeof ignoreId === 'string' && item.candidate.id === ignoreId) return false;
      if (!item.lastCall || !item.lastCall.createdAt) return true;
      
      const callDate = new Date(item.lastCall.createdAt.seconds * 1000).toISOString().split('T')[0];
      return callDate !== today;
    });

    if (available.length === 0) {
      if (typeof ignoreId === 'string') {
        onToast("Fim da fila! Todos os candidatos desta lista já foram contatados hoje.", "success");
        setCurrentCandidate(null);
      } else {
        onToast("Todos os candidatos desta lista já foram contatados hoje.", "error");
      }
      return;
    }

    // Sort: never called first, then older calls first
    available.sort((a, b) => {
      if (!a.lastCall) return -1;
      if (!b.lastCall) return 1;
      return (a.lastCall.createdAt?.seconds || 0) - (b.lastCall.createdAt?.seconds || 0);
    });

    setCurrentCandidate(available[0].candidate);
    setObservation("");
    setShowObservation(false);
    setSelectedStatus(null);
  };

  const handleAction = async (status: 'Não atendeu' | 'Sem interesse' | 'Interesse' | 'Convertido' | 'Vai enviar a documentação via whatsapp/email' | 'Vai entregar pessoalmente na unidade') => {
    if (!currentCandidate) return;

    if ((status === 'Sem interesse' || status === 'Interesse' || status === 'Convertido' || status === 'Vai enviar a documentação via whatsapp/email' || status === 'Vai entregar pessoalmente na unidade') && !showObservation) {
      setSelectedStatus(status);
      setShowObservation(true);
      return;
    }

    setIsSaving(true);
    try {
      await onSaveLigacao({
        candidatoId: currentCandidate.id,
        candidatoNome: currentCandidate.nome,
        candidatoTelefone: currentCandidate.telefone,
        origem: sourceType as 'Lead' | 'Base' | 'FiesProuni' | 'Gap',
        origemId: selectedSourceId || (sourceType === "FiesProuni" ? "Fies/Prouni" : "GAP"),
        status: status,
        observacao: observation,
        atendenteId: profile.uid,
        atendenteNome: profile.nome || profile.name,
        unidade: profile.unidade,
      });

      onToast("Ligação registrada com sucesso!", "success");
      
      // Clear current and move to next (automatically or let user click start again)
      const currentId = currentCandidate.id;
      setCurrentCandidate(null);
      setObservation("");
      setShowObservation(false);
      setSelectedStatus(null);
      
      // Optionally auto-start next call
      handleStartCall(currentId); 
    } catch (err) {
      console.error(err);
      onToast("Erro ao salvar ligação.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const candidateHistory = useMemo(() => {
    if (!currentCandidate) return [];
    return ligacoes
      .filter(l => l.candidatoId === currentCandidate.id)
      .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
  }, [currentCandidate, ligacoes]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-200">
            <Phone size={24} />
          </div>
          Controle de Ligações
        </h2>
      </div>

      {!currentCandidate ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  setSourceType("Base");
                  setSelectedSourceId("");
                }}
                className={cn(
                  "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                  sourceType === "Base" 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-slate-100 hover:border-blue-200 text-slate-500"
                )}
              >
                <Database size={32} />
                <span className="font-bold text-sm">Bases</span>
              </button>
              <button
                onClick={() => {
                  setSourceType("Lead");
                  setSelectedSourceId("");
                }}
                className={cn(
                  "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                  sourceType === "Lead" 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-slate-100 hover:border-blue-200 text-slate-500"
                )}
              >
                <Building2 size={32} />
                <span className="font-bold text-sm">Leads (Ações)</span>
              </button>
              <button
                onClick={() => {
                  setSourceType("FiesProuni");
                  setSelectedSourceId("Fies/Prouni");
                }}
                className={cn(
                  "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                  sourceType === "FiesProuni" 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-slate-100 hover:border-blue-200 text-slate-500"
                )}
              >
                <Database size={32} />
                <span className="font-bold text-sm">Fies/Prouni</span>
              </button>
              <button
                onClick={() => {
                  setSourceType("Gap");
                  setSelectedSourceId("GAP");
                }}
                className={cn(
                  "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                  sourceType === "Gap" 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-slate-100 hover:border-blue-200 text-slate-500"
                )}
              >
                <Building2 size={32} />
                <span className="font-bold text-sm">GAP Acadêmico</span>
              </button>
            </div>

            {sourceType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                {(sourceType === "Base" || sourceType === "Lead") && (
                  <>
                    <label className="block text-sm font-bold text-slate-700">
                      Selecione {sourceType === "Base" ? "a Base" : "a Ação"}
                    </label>
                    <select
                      value={selectedSourceId}
                      onChange={(e) => {
                        setSelectedSourceId(e.target.value);
                        setSelectedCurso("");
                        setSelectedMetodologia("");
                      }}
                      className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50 font-medium"
                    >
                      <option value="">Selecione...</option>
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

                    {sourceType === "Base" && selectedSourceId && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Curso (Opcional)
                          </label>
                          <select
                            value={selectedCurso}
                            onChange={(e) => setSelectedCurso(e.target.value)}
                            className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50 text-sm font-medium"
                          >
                            <option value="">Todos os Cursos</option>
                            {cursoOptions.map(curso => (
                              <option key={curso} value={curso}>{curso}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Metodologia (Opcional)
                          </label>
                          <select
                            value={selectedMetodologia}
                            onChange={(e) => setSelectedMetodologia(e.target.value)}
                            className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50 text-sm font-medium"
                          >
                            <option value="">Todas as Metodologias</option>
                            {metodologiaOptions.map(meto => (
                              <option key={meto} value={meto}>{meto}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {availableStatusText && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm font-bold text-center">
                    {availableStatusText}
                  </div>
                )}

                <button
                  disabled={availableCount === 0}
                  onClick={handleStartCall}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={20} />
                  Iniciar Nova Ligação
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-100 rounded-2xl text-slate-600">
                  <User size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{currentCandidate.nome}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                    <p className="text-slate-500 font-bold flex items-center gap-2">
                      <Phone size={16} />
                      {formatPhone(currentCandidate.telefone)}
                    </p>
                    {currentCandidate.cpf && (
                      <p className="text-slate-500 font-bold flex items-center gap-2">
                        <IdCard size={16} />
                        {currentCandidate.cpf}
                      </p>
                    )}
                    {((currentCandidate as any).cursoInteresse || (currentCandidate as any).curso) && (
                      <p className="text-slate-500 font-bold flex items-center gap-2">
                        <GraduationCap size={16} />
                        {(currentCandidate as any).cursoInteresse || (currentCandidate as any).curso}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {sourceType}
                </span>
              </div>
            </div>

            {candidateHistory.length > 0 && (
              <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <History size={16} />
                  Histórico de Ligações
                </h4>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                  {candidateHistory.map((h, i) => (
                    <div key={h.id} className="flex gap-4 items-start">
                      <div className={cn(
                        "mt-1 p-1 rounded-full",
                        h.status === 'Convertido' ? "bg-blue-500" :
                        h.status === 'Interesse' ? "bg-emerald-500" : 
                        h.status === 'Sem interesse' ? "bg-rose-500" : "bg-amber-500"
                      )} />
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span>{h.atendenteNome}</span>
                          <span>•</span>
                          <span>{h.createdAt?.toDate().toLocaleString("pt-BR")}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{h.status}</p>
                        {h.observacao && (
                          <p className="text-sm text-slate-600 mt-1 italic">"{h.observacao}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {showObservation ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <label className="block text-sm font-bold text-slate-700">
                    Observação ({selectedStatus})
                  </label>
                  <textarea
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Descreva o motivo ou detalhes do interesse..."
                    className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none bg-slate-50 font-medium min-h-[120px]"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowObservation(false);
                        setSelectedStatus(null);
                      }}
                      className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      disabled={isSaving || !observation.trim()}
                      onClick={() => selectedStatus && handleAction(selectedStatus)}
                      className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                    >
                      {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Confirmar e Salvar"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <button
                    disabled={isSaving}
                    onClick={() => handleAction('Não atendeu')}
                    className="p-6 rounded-2xl border-2 border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all flex flex-col items-center gap-2 group"
                  >
                    <Clock className="group-hover:scale-110 transition-transform" size={28} />
                    <span className="font-bold text-sm text-center">Não atendeu</span>
                  </button>
                  
                  {sourceType === "FiesProuni" || sourceType === "Gap" ? (
                    <>
                      <button
                        disabled={isSaving}
                        onClick={() => handleAction('Vai enviar a documentação via whatsapp/email')}
                        className="p-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex flex-col items-center gap-2 group"
                      >
                        <MessageSquare className="group-hover:scale-110 transition-transform" size={28} />
                        <span className="font-bold text-sm text-center">Vai enviar doc via whats/email</span>
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={() => handleAction('Vai entregar pessoalmente na unidade')}
                        className="p-6 rounded-2xl border-2 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all flex flex-col items-center gap-2 group"
                      >
                        <User className="group-hover:scale-110 transition-transform" size={28} />
                        <span className="font-bold text-sm text-center">Vai entregar na unidade</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={isSaving}
                        onClick={() => handleAction('Sem interesse')}
                        className="p-6 rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all flex flex-col items-center gap-2 group"
                      >
                        <XCircle className="group-hover:scale-110 transition-transform" size={28} />
                        <span className="font-bold text-sm text-center">Sem interesse</span>
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={() => handleAction('Interesse')}
                        className="p-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex flex-col items-center gap-2 group"
                      >
                        <CheckCircle2 className="group-hover:scale-110 transition-transform" size={28} />
                        <span className="font-bold text-sm text-center">Interesse</span>
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={() => handleAction('Convertido')}
                        className="p-6 rounded-2xl border-2 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all flex flex-col items-center gap-2 group"
                      >
                        <CheckCircle2 className="group-hover:scale-110 transition-transform" size={28} />
                        <span className="font-bold text-sm text-center">Convertido</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setCurrentCandidate(null)}
              className="mt-8 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all flex items-center justify-center gap-2 w-full"
            >
              Cancelar e voltar para seleção
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
