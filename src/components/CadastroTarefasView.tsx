import React, { useState } from "react";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Tarefa, UnidadeRegional, UserProfile } from "../types";
import { Plus, Trash2, Edit2, Search, CheckSquare, Clock, AlertCircle } from "lucide-react";

interface Props {
  tarefas: Tarefa[];
  unidades: UnidadeRegional[];
  profile?: UserProfile;
  onToast: (msg: string, type?: "success" | "error") => void;
  onSendNotification?: (textToSearch: string, taskTitle: string, taskType: string) => void;
}

const STATUS_OPTIONS = [
  "Em Andamento",
  "Parado",
  "Atrasado",
  "Deferido",
  "Cancelado",
] as const;

export function CadastroTarefasView({ tarefas, unidades, profile, onToast, onSendNotification }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [dataPrazo, setDataPrazo] = useState("");
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>("Em Andamento");
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (t?: Tarefa) => {
    if (t) {
      setEditingId(t.id);
      setTitulo(t.titulo);
      setDescricao(t.descricao || "");
      setUnidade(t.unidade || (unidades[0]?.nome || ""));
      setResponsavelNome(t.responsavelNome || "");
      setDataPrazo(t.dataPrazo || "");
      setStatus(t.status || "Em Andamento");
    } else {
      setEditingId(null);
      setTitulo("");
      setDescricao("");
      setUnidade(unidades[0]?.nome || "");
      setResponsavelNome("");
      setDataPrazo("");
      setStatus("Em Andamento");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      onToast("Título da atividade é obrigatório", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTIONS.TAREFAS, editingId), {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          unidade: unidade || "",
          responsavelNome: responsavelNome.trim(),
          dataPrazo: dataPrazo || "",
          status,
        });
        onToast("Atividade atualizada com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.TAREFAS), {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          unidade: unidade || profile?.unidade || "",
          responsavelNome: responsavelNome.trim(),
          dataPrazo: dataPrazo || "",
          status,
          creatorId: profile?.uid,
          creatorNome: profile?.name || profile?.nome,
          servidor: profile?.servidor || "unesa",
          createdAt: serverTimestamp(),
        });
        onToast("Atividade cadastrada com sucesso!");
        if (onSendNotification) {
          onSendNotification(responsavelNome.trim(), titulo.trim(), "Acompanhamento de Tarefas");
        }
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      console.error("Erro ao salvar tarefa:", err);
      onToast(`Erro ao salvar tarefa: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a atividade "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.TAREFAS, id));
      onToast("Atividade excluída com sucesso.");
    } catch (err: any) {
      console.error("Erro ao excluir tarefa:", err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleStatusQuickChange = async (id: string, newStatus: typeof STATUS_OPTIONS[number]) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.TAREFAS, id), { status: newStatus });
      onToast(`Status alterado para "${newStatus}"`);
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      onToast(`Erro ao atualizar status: ${err.message}`, "error");
    }
  };

  const filtered = tarefas.filter((t) => {
    const matchesSearch =
      t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.descricao && t.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.responsavelNome && t.responsavelNome.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesUnidade = unidadeFilter === "TODAS" || t.unidade === unidadeFilter;
    const matchesStatus = statusFilter === "TODOS" || t.status === statusFilter;
    return matchesSearch && matchesUnidade && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare className="text-blue-600" size={24} />
            Cadastro de Tarefas e Atividades
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre novas atividades para serem monitoradas e administradas na aba Acompanhamento de Tarefas.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nova Tarefa / Atividade
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título, responsável, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={unidadeFilter}
            onChange={(e) => setUnidadeFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas as Unidades</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.nome}>
                {u.nome}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-end md:self-auto">
          Total: {filtered.length} tarefa(s)
        </span>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Título da Atividade</th>
                <th className="p-4">Unidade</th>
                <th className="p-4">Responsável</th>
                <th className="p-4">Prazo</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma tarefa cadastrada.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-800">
                      <div>{t.titulo}</div>
                      {t.descricao && (
                        <div className="text-xs font-normal text-slate-500 line-clamp-1 mt-0.5">
                          {t.descricao}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{t.unidade || "-"}</td>
                    <td className="p-4 text-slate-600">{t.responsavelNome || "-"}</td>
                    <td className="p-4 text-slate-600">
                      {t.dataPrazo ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Clock size={14} className="text-slate-400" />
                          {t.dataPrazo}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4">
                      <select
                        value={t.status}
                        onChange={(e) =>
                          handleStatusQuickChange(t.id, e.target.value as any)
                        }
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold outline-none cursor-pointer ${
                          t.status === "Em Andamento"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : t.status === "Parado"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : t.status === "Atrasado"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : t.status === "Deferido"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-200 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(t)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.titulo)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? "Editar Atividade" : "Cadastrar Nova Atividade"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Título da Atividade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento de Matrículas, Auditoria..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Descrição / Detalhes
                </label>
                <textarea
                  placeholder="Detalhamento da atividade a ser realizada..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Unidade
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="">Geral / Sem Unidade</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.nome}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do responsável..."
                    value={responsavelNome}
                    onChange={(e) => setResponsavelNome(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Prazo de Conclusão
                  </label>
                  <input
                    type="date"
                    value={dataPrazo}
                    onChange={(e) => setDataPrazo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {loading ? "Salvando..." : editingId ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
