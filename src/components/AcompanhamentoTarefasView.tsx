import React, { useState } from "react";
import { db, COLLECTIONS } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Tarefa, UnidadeRegional, UserProfile } from "../types";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PauseCircle,
  XCircle,
  Search,
  Building2,
  User,
  LayoutGrid,
  List,
  CalendarDays,
} from "lucide-react";

interface Props {
  tarefas: Tarefa[];
  unidades: UnidadeRegional[];
  profile?: UserProfile;
  onToast: (msg: string, type?: "success" | "error") => void;
}

const STATUS_CONFIG: Record<
  Tarefa["status"],
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ElementType;
    badgeBg: string;
  }
> = {
  "Em Andamento": {
    label: "Em Andamento",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: Clock,
    badgeBg: "bg-blue-600 text-white",
  },
  Parado: {
    label: "Parado",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: PauseCircle,
    badgeBg: "bg-amber-500 text-white",
  },
  Atrasado: {
    label: "Atrasado",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: AlertTriangle,
    badgeBg: "bg-rose-600 text-white",
  },
  Deferido: {
    label: "Deferido",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle2,
    badgeBg: "bg-emerald-600 text-white",
  },
  Cancelado: {
    label: "Cancelado",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    icon: XCircle,
    badgeBg: "bg-slate-600 text-white",
  },
};

export function AcompanhamentoTarefasView({
  tarefas,
  unidades,
  profile,
  onToast,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [unidadeFilter, setUnidadeFilter] = useState("TODAS");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const handleStatusChange = async (id: string, newStatus: Tarefa["status"]) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.TAREFAS, id), {
        status: newStatus,
      });
      onToast(`Status da tarefa atualizado para "${newStatus}"!`);
    } catch (err: any) {
      console.error("Erro ao alterar status:", err);
      onToast(`Erro ao alterar status: ${err.message}`, "error");
    }
  };

  const filtered = tarefas.filter((t) => {
    const matchesSearch =
      t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.descricao && t.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.responsavelNome && t.responsavelNome.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "TODOS" || t.status === statusFilter;
    const matchesUnidade = unidadeFilter === "TODAS" || t.unidade === unidadeFilter;
    return matchesSearch && matchesStatus && matchesUnidade;
  });

  const countEmAndamento = tarefas.filter((t) => t.status === "Em Andamento").length;
  const countParado = tarefas.filter((t) => t.status === "Parado").length;
  const countAtrasado = tarefas.filter((t) => t.status === "Atrasado").length;
  const countDeferido = tarefas.filter((t) => t.status === "Deferido").length;
  const countCancelado = tarefas.filter((t) => t.status === "Cancelado").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-blue-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-500/30 mb-3">
              <CalendarDays size={14} /> Agenda de Atividades
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Acompanhamento de Tarefas
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-xl">
              Monitore o progresso, prazos e status de todas as atividades cadastradas no sistema.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xs text-blue-200 font-semibold">Em Andamento</div>
              <div className="text-xl font-black text-blue-400 mt-0.5">{countEmAndamento}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xs text-amber-200 font-semibold">Parado</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">{countParado}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xs text-rose-200 font-semibold">Atrasado</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">{countAtrasado}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xs text-emerald-200 font-semibold">Deferido</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">{countDeferido}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xs text-slate-300 font-semibold">Cancelado</div>
              <div className="text-xl font-black text-slate-400 mt-0.5">{countCancelado}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tarefa por título, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Parado">Parado</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Deferido">Deferido</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          <select
            value={unidadeFilter}
            onChange={(e) => setUnidadeFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas as Unidades</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.nome}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 self-end md:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid size={14} /> Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "table"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <List size={14} /> Tabela
          </button>
        </div>
      </div>

      {/* Main View Display */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3">
          <CalendarDays size={48} className="mx-auto text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">Nenhuma tarefa encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não há atividades correspondentes aos filtros selecionados. Você pode cadastrar novas tarefas no Painel Administrativo.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG["Em Andamento"];
            const StatusIcon = cfg.icon;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border ${cfg.border} hover:shadow-md transition-all flex flex-col justify-between space-y-4`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${cfg.bg} ${cfg.text}`}
                    >
                      <StatusIcon size={14} />
                      {cfg.label}
                    </span>

                    {t.unidade && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                        <Building2 size={12} />
                        {t.unidade}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-800 leading-snug">
                    {t.titulo}
                  </h3>

                  {t.descricao && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                      {t.descricao}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    {t.responsavelNome ? (
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <User size={14} className="text-slate-400" />
                        {t.responsavelNome}
                      </div>
                    ) : (
                      <div className="text-slate-400">Sem responsável</div>
                    )}

                    {t.dataPrazo && (
                      <div className="flex items-center gap-1 text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                        <Calendar size={12} className="text-slate-500" />
                        {t.dataPrazo}
                      </div>
                    )}
                  </div>

                  {/* Quick Status Select */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Alterar Status:
                    </label>
                    <select
                      value={t.status}
                      onChange={(e) =>
                        handleStatusChange(t.id, e.target.value as Tarefa["status"])
                      }
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Parado">Parado</option>
                      <option value="Atrasado">Atrasado</option>
                      <option value="Deferido">Deferido</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Atividade</th>
                  <th className="p-4">Unidade</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Prazo</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Alterar Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filtered.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG["Em Andamento"];
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{t.titulo}</div>
                        {t.descricao && (
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {t.descricao}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{t.unidade || "-"}</td>
                      <td className="p-4 text-slate-600">{t.responsavelNome || "-"}</td>
                      <td className="p-4 text-slate-600 text-xs font-bold">
                        {t.dataPrazo || "-"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold ${cfg.bg} ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <select
                          value={t.status}
                          onChange={(e) =>
                            handleStatusChange(t.id, e.target.value as Tarefa["status"])
                          }
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Parado">Parado</option>
                          <option value="Atrasado">Atrasado</option>
                          <option value="Deferido">Deferido</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
