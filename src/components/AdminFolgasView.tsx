import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Plus,
  Trash2,
  Filter,
  UserCheck,
  Calendar,
  AlertCircle,
  FileText
} from "lucide-react";
import { SolicitacaoFolga, UserProfile } from "../types";
import { db, COLLECTIONS, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

interface Props {
  profile: UserProfile;
  users?: UserProfile[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminFolgasView({ profile, users = [], onToast }: Props) {
  const [folgas, setFolgas] = useState<SolicitacaoFolga[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [tipoFilter, setTipoFilter] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for new folga
  const [solicitanteId, setSolicitanteId] = useState("");
  const [tipo, setTipo] = useState<"Folga" | "Férias">("Folga");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const q = query(
        collection(db, COLLECTIONS.SOLICITACAO_FOLGA),
        orderBy("createdAt", "desc")
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as SolicitacaoFolga[];
          setFolgas(list);
          setLoading(false);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, COLLECTIONS.SOLICITACAO_FOLGA);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const handleUpdateStatus = async (
    folgaId: string,
    newStatus: "Aprovado" | "Recusado"
  ) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.SOLICITACAO_FOLGA, folgaId), {
        status: newStatus,
        aprovadoPorId: profile.uid,
        aprovadoPorNome: profile.name || profile.nome || profile.email,
        updatedAt: serverTimestamp(),
      });
      onToast(`Solicitação marcada como ${newStatus.toLowerCase()}!`, "success");
    } catch (err: any) {
      console.error("Erro ao atualizar solicitação:", err);
      onToast(`Erro ao atualizar: ${err.message}`, "error");
    }
  };

  const handleDelete = async (folgaId: string) => {
    if (!confirm("Deseja realmente excluir este registro de folga/férias?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.SOLICITACAO_FOLGA, folgaId));
      onToast("Registro excluído com sucesso!", "success");
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleCreateFolga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitanteId || !dataInicio || !dataFim) {
      onToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    const selectedUser = users.find((u) => u.uid === solicitanteId);
    if (!selectedUser) {
      onToast("Colaborador não encontrado.", "error");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.SOLICITACAO_FOLGA), {
        solicitanteId: selectedUser.uid,
        solicitanteNome: selectedUser.name || selectedUser.nome || selectedUser.email,
        solicitanteEmail: selectedUser.email,
        solicitanteRole: selectedUser.role,
        dataInicio,
        dataFim,
        tipo,
        status: "Aprovado",
        aprovadoPorId: profile.uid,
        aprovadoPorNome: profile.name || profile.nome || profile.email,
        justificativa: justificativa.trim() || "Registrado diretamente pela Administração",
        createdAt: serverTimestamp(),
      });
      onToast("Registro cadastrado com sucesso!", "success");
      setIsAddModalOpen(false);
      setSolicitanteId("");
      setDataInicio("");
      setDataFim("");
      setJustificativa("");
    } catch (err: any) {
      console.error("Erro ao registrar:", err);
      onToast(`Erro ao registrar: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredFolgas = folgas.filter((f) => {
    const matchesStatus =
      statusFilter === "TODOS" || f.status === statusFilter;
    const matchesTipo =
      tipoFilter === "TODOS" || f.tipo === tipoFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (f.solicitanteNome || "").toLowerCase().includes(term) ||
      (f.solicitanteEmail || "").toLowerCase().includes(term) ||
      (f.justificativa || "").toLowerCase().includes(term);
    return matchesStatus && matchesTipo && matchesSearch;
  });

  const pendentesCount = folgas.filter((f) => f.status === "Pendente").length;
  const aprovadasCount = folgas.filter((f) => f.status === "Aprovado").length;
  const recusadasCount = folgas.filter((f) => f.status === "Recusado").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="text-blue-600" size={24} />
            Gestão de Folgas e Férias
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe, aprove ou registre solicitações de folgas e períodos de férias da equipe.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Nova Solicitação / Registro</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50/70 border border-amber-200/70 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700">Pendentes de Aprovação</span>
            <div className="text-2xl font-black text-amber-900 mt-1">{pendentesCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/70 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700">Aprovadas</span>
            <div className="text-2xl font-black text-emerald-900 mt-1">{aprovadasCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/70 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700">Recusadas</span>
            <div className="text-2xl font-black text-rose-900 mt-1">{recusadasCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por colaborador, e-mail ou justificativa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="Pendente">Pendentes</option>
            <option value="Aprovado">Aprovados</option>
            <option value="Recusado">Recusados</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Tipo:</span>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="Folga">Folga</option>
            <option value="Férias">Férias</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Colaborador</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Período</th>
                <th className="py-3.5 px-4">Justificativa</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Aprovado Por</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    Carregando solicitações...
                  </td>
                </tr>
              ) : filteredFolgas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                filteredFolgas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{f.solicitanteNome}</div>
                      <div className="text-[11px] text-slate-400">{f.solicitanteRole || f.solicitanteEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          f.tipo === "Férias"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {f.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {f.dataInicio} <span className="text-slate-400 font-normal">até</span> {f.dataFim}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={f.justificativa}>
                      {f.justificativa || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          f.status === "Aprovado"
                            ? "bg-emerald-100 text-emerald-700"
                            : f.status === "Recusado"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {f.aprovadoPorNome || "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {f.status === "Pendente" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(f.id, "Aprovado")}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Aprovar"
                            >
                              <CheckCircle size={14} />
                              <span>Aprovar</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(f.id, "Recusado")}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Recusar"
                            >
                              <XCircle size={14} />
                              <span>Recusar</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Adicionar Folga */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CalendarDays className="text-blue-600" size={20} />
              Registrar Folga / Férias
            </h3>

            <form onSubmit={handleCreateFolga} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Colaborador *
                </label>
                <select
                  required
                  value={solicitanteId}
                  onChange={(e) => setSolicitanteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o colaborador...</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name || u.nome || u.email} ({u.role}) - {u.unidade || "Regional"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Folga">Folga</option>
                    <option value="Férias">Férias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Data Fim *
                </label>
                <input
                  type="date"
                  required
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Justificativa / Observação
                </label>
                <textarea
                  rows={3}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Motivo ou observações do agendamento..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                >
                  {saving ? "Salvando..." : "Salvar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
