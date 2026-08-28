import React, { useState, useMemo, useEffect } from "react";
import { SolicitacaoManutencao, UserProfile } from "../types";
import { db, COLLECTIONS, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  Trash2,
  Check,
  X,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Send,
  User,
  MapPin,
  Clock,
  Wrench,
  Search,
  LayoutDashboard,
  TrendingUp,
  Share2,
  Building,
  Hash,
} from "lucide-react";

interface Props {
  profile: UserProfile | null;
  onToast: (m: string, t?: "success" | "error") => void;
  users?: UserProfile[];
}

export function SolicitacoesManutencaoView({ profile, onToast, users = [] }: Props) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoManutencao[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");
  const [isAdding, setIsAdding] = useState(false);
  const [newDescricao, setNewDescricao] = useState("");
  const [newLocal, setNewLocal] = useState("");
  const [newPredio, setNewPredio] = useState("");
  const [newSetor, setNewSetor] = useState("");
  const [newMatricula, setNewMatricula] = useState("");
  const [newSolicitanteName, setNewSolicitanteName] = useState("");
  const [observacoes, setObservacoes] = useState<{ [key: string]: string }>({});

  const predios = ["Predio A", "Predio B", "Predio C", "Estacionamento", "Guarita"];

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.SOLICITACOES_MANUTENCAO),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SolicitacaoManutencao[];
        data.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setSolicitacoes(data);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "solicitações de manutenção");
        onToast("Erro ao carregar solicitações de manutenção", "error");
      }
    );
    return () => unsub();
  }, [onToast]);

  const isFinanceiro = useMemo(() => {
    if (!profile) return false;
    return profile.role === "Financeiro" || profile.role === "Admin Master";
  }, [profile]);

  const stats = useMemo(() => {
    return {
      pendente: solicitacoes.filter((s) => s.status === "Pendente").length,
      andamento: solicitacoes.filter((s) => s.status === "Em Andamento").length,
      concluido: solicitacoes.filter((s) => s.status === "Concluído").length,
      total: solicitacoes.length,
    };
  }, [solicitacoes]);

  const topDemands = useMemo(() => {
    const counts: { [key: string]: number } = {};
    solicitacoes.forEach((s) => {
      const key = `${s.predio || "N/A"} - ${s.local || "N/A"}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [solicitacoes]);

  const setoresUnicos = useMemo(() => {
    const sets = new Set<string>();
    solicitacoes.forEach((s) => {
      if (s.setor) sets.add(s.setor);
    });
    return Array.from(sets).sort();
  }, [solicitacoes]);

  const filteredSolicitacoes = useMemo(() => {
    return solicitacoes.filter((s) => {
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      const matchSetor = filterSetor === "all" || s.setor === filterSetor;
      const matchSearch =
        s.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.solicitanteNome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.setor || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSetor && matchSearch;
    });
  }, [solicitacoes, filterStatus, filterSetor, searchTerm]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!newDescricao.trim() || !newLocal.trim() || !newPredio) {
      onToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    try {
      await addDoc(collection(db, COLLECTIONS.SOLICITACOES_MANUTENCAO), {
        descricao: newDescricao.trim(),
        local: newLocal.trim(),
        predio: newPredio,
        setor: newSetor.trim(),
        matricula: newMatricula.trim(),
        status: "Pendente",
        solicitanteId: profile.uid,
        solicitanteNome: newSolicitanteName || profile.name,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewDescricao("");
      setNewLocal("");
      setNewPredio("");
      setNewSetor("");
      setNewMatricula("");
      setNewSolicitanteName("");
      onToast("Solicitação enviada com sucesso!", "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "solicitação de manutenção");
      onToast(`Erro ao criar solicitação: ${err.message}`, "error");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: SolicitacaoManutencao["status"]) => {
    if (!isFinanceiro) return;
    try {
      const obs = observacoes[id]?.trim();
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      if (obs) updateData.observacoesFinanceiro = obs;
      await updateDoc(doc(db, COLLECTIONS.SOLICITACOES_MANUTENCAO, id), updateData);
      onToast(`Status atualizado para ${newStatus}`, "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, "solicitação de manutenção");
      onToast(`Erro ao atualizar status: ${err.message}`, "error");
    }
  };

  const handleDelete = async (id: string, solicitanteId: string) => {
    if (!profile) return;
    if (!isFinanceiro && profile.uid !== solicitanteId) {
      onToast("Sem permissão para excluir", "error");
      return;
    }
    if (window.confirm("Deseja realmente excluir esta solicitação?")) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.SOLICITACOES_MANUTENCAO, id));
        onToast("Solicitação excluída com sucesso!");
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, "solicitação de manutenção");
        onToast(`Erro ao excluir solicitação: ${err.message}`, "error");
      }
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=manutencao-publica`;
    navigator.clipboard.writeText(url);
    onToast("Link público copiado!", "success");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aprovado": return "bg-green-100 text-green-700 border-green-200";
      case "Rejeitado": return "bg-rose-100 text-rose-700 border-rose-200";
      case "Em Andamento": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Concluído": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Pendente": default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="text-blue-600" size={28} />
            Solicitações de Manutenção
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestão e acompanhamento de manutenções prediais.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyPublicLink}
            className="flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl text-sm transition-all shadow-sm border border-slate-200"
            title="Copiar link para solicitação pública"
          >
            <Share2 size={18} />
            <span>Link Público</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-md"
          >
            <Plus size={18} />
            <span>Nova Solicitação</span>
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total</p>
            <h3 className="text-xl font-black text-slate-900">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Pendente</p>
            <h3 className="text-xl font-black text-slate-900">{stats.pendente}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-100 text-orange-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Em Andamento</p>
            <h3 className="text-xl font-black text-slate-900">{stats.andamento}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100 text-green-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Concluído</p>
            <h3 className="text-xl font-black text-slate-900">{stats.concluido}</h3>
          </div>
        </div>
      </div>

      {/* Top Demands & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-blue-600" />
            Top 5 Maiores Demandas
          </h3>
          <div className="space-y-3">
            {topDemands.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-700 truncate pr-2">{d.name}</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-black">{d.count}</span>
              </div>
            ))}
            {topDemands.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sem dados disponíveis</p>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, local, setor ou solicitante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
              <select
                value={filterSetor}
                onChange={(e) => setFilterSetor(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto bg-slate-50 focus:bg-white cursor-pointer"
              >
                <option value="all">Todos os Setores</option>
                {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto bg-slate-50 focus:bg-white cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Rejeitado">Rejeitado</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Nova Solicitação</h3>
                  <p className="text-xs text-slate-500 font-medium">Detalhe o problema e o local</p>
                </div>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="manutencao-form" onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 ml-1">Prédio / Local *</label>
                    <select
                      required
                      value={newPredio}
                      onChange={(e) => setNewPredio(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                    >
                      <option value="">Selecione...</option>
                      {predios.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 ml-1">Setor / Sala *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sala 2, Recepção..."
                      value={newLocal}
                      onChange={(e) => setNewLocal(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 ml-1">Setor Administrativo</label>
                  <input
                    type="text"
                    placeholder="Ex: Financeiro, RH..."
                    value={newSetor}
                    onChange={(e) => setNewSetor(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 ml-1">Solicitante (Nome)</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        list="users-list"
                        type="text"
                        placeholder="Digite o nome..."
                        value={newSolicitanteName}
                        onChange={(e) => {
                          const name = e.target.value;
                          setNewSolicitanteName(name);
                          const found = users.find(u => (u.name || u.nome) === name);
                          if (found) setNewMatricula(found.uid.slice(0, 8).toUpperCase()); // Mocking matricula if not present
                        }}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                      />
                      <datalist id="users-list">
                        {users.map((u, i) => <option key={i} value={u.name || u.nome} />)}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 ml-1">Matrícula</label>
                    <div className="relative">
                      <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Matrícula..."
                        value={newMatricula}
                        onChange={(e) => setNewMatricula(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 ml-1">Descrição do Problema *</label>
                  <textarea
                    required
                    placeholder="Descreva o que precisa ser consertado ou verificado..."
                    value={newDescricao}
                    onChange={(e) => setNewDescricao(e.target.value)}
                    rows={4}
                    className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="manutencao-form" className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <Send size={18} />
                  <span>Enviar Solicitação</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSolicitacoes.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusColor(s.status)}`}>
                    {s.status}
                  </span>
                  {s.predio && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                      {s.predio}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-slate-800 line-clamp-2">{s.descricao}</h4>
              </div>
              {(isFinanceiro || (profile && profile.uid === s.solicitanteId && s.status === 'Pendente')) && (
                <button onClick={() => handleDelete(s.id, s.solicitanteId)} className="p-2 text-slate-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="p-5 space-y-3 flex-1">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="font-medium truncate">{s.local} {s.setor ? `(${s.setor})` : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <span className="font-medium truncate">{s.solicitanteNome} {s.matricula ? `- ${s.matricula}` : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Clock size={14} className="text-slate-400 shrink-0" />
                  <span className="font-medium">
                    {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString("pt-BR") : "Recente"}
                  </span>
                </div>
              </div>

              {s.observacoesFinanceiro && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-1.5 mb-1 text-amber-700">
                    <ClipboardList size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Obs. Financeiro</span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">{s.observacoesFinanceiro}</p>
                </div>
              )}
            </div>

            {isFinanceiro && (
              <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase ml-1">Observações</label>
                  <input
                    type="text"
                    placeholder="Notas internas..."
                    value={observacoes[s.id] ?? s.observacoesFinanceiro ?? ""}
                    onChange={(e) => setObservacoes(prev => ({ ...prev, [s.id]: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {s.status === "Pendente" && (
                    <>
                      <button onClick={() => handleUpdateStatus(s.id, "Aprovado")} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-1">
                        <Check size={14} /> Aprovar
                      </button>
                      <button onClick={() => handleUpdateStatus(s.id, "Rejeitado")} className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-700 py-2 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-1">
                        <X size={14} /> Rejeitar
                      </button>
                    </>
                  )}
                  {s.status === "Aprovado" && (
                    <button onClick={() => handleUpdateStatus(s.id, "Em Andamento")} className="w-full bg-amber-100 hover:bg-amber-200 text-amber-700 py-2 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-1">
                      <AlertTriangle size={14} /> Em Andamento
                    </button>
                  )}
                  {s.status === "Em Andamento" && (
                    <button onClick={() => handleUpdateStatus(s.id, "Concluído")} className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-1">
                      <CheckCircle2 size={14} /> Concluir
                    </button>
                  )}
                  {(s.status === "Concluído" || s.status === "Rejeitado") && (
                    <button onClick={() => handleUpdateStatus(s.id, "Pendente")} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg text-[10px] font-black uppercase transition-colors">
                      Reiniciar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

