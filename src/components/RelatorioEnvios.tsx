import React, { useState, useMemo } from "react";
import { SendContact } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Send, Mail, Calendar, Filter, BookOpen, Layers } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#22c55e"];

interface RelatorioEnviosProps {
  title: string;
  contacts: SendContact[];
  typeLabel: "Whats" | "Mala Direta";
  iconType?: "whats" | "mala";
}

export function RelatorioEnvios({ title, contacts = [], typeLabel, iconType = "whats" }: RelatorioEnviosProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cursoFilter, setCursoFilter] = useState("");
  const [origemFilter, setOrigemFilter] = useState("");

  const uniqueCursos = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.curso || "Não informado"))).sort(),
    [contacts]
  );
  const uniqueOrigens = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.origem || "Desconhecido"))).sort(),
    [contacts]
  );

  const filteredData = useMemo(() => {
    return contacts
      .filter((contact) => {
        if (!contact.createdAt) return false;
        const date = contact.createdAt.toDate ? contact.createdAt.toDate() : new Date(contact.createdAt);
        if (startDate && date < new Date(startDate + "T00:00:00")) return false;
        if (endDate && date > new Date(endDate + "T23:59:59")) return false;
        if (cursoFilter && contact.curso !== cursoFilter) return false;
        if (origemFilter && contact.origem !== origemFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [contacts, startDate, endDate, cursoFilter, origemFilter]);

  const totalEnvios = filteredData.length;
  const totalCursosDistintos = useMemo(
    () => new Set(filteredData.map((c) => c.curso || "Não informado")).size,
    [filteredData]
  );
  const totalOrigensDistintas = useMemo(
    () => new Set(filteredData.map((c) => c.origem || "Desconhecido")).size,
    [filteredData]
  );

  const byCourse = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredData.forEach((c) => {
      const curso = c.curso || "Não informado";
      acc[curso] = (acc[curso] || 0) + 1;
    });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const byOrigin = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredData.forEach((c) => {
      const origem = c.origem || "Desconhecido";
      acc[origem] = (acc[origem] || 0) + 1;
    });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const IconComponent = iconType === "whats" ? Send : Mail;
  const iconBg = iconType === "whats" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600";
  const badgeClass = iconType === "whats" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">Acompanhamento e estatísticas dos envios via {typeLabel}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Curso
          </label>
          <select
            value={cursoFilter}
            onChange={(e) => setCursoFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Todos os Cursos</option>
            {uniqueCursos.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Origem (Base/Ação)
          </label>
          <select
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Todas as Origens</option>
            {uniqueOrigens.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setCursoFilter("");
            setOrigemFilter("");
          }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 h-[42px]"
        >
          <Filter size={16} />
          Limpar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className={`p-4 rounded-xl ${iconBg}`}>
            <IconComponent size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de Envios</p>
            <p className="text-3xl font-black text-slate-800">{totalEnvios}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Cursos Impactados</p>
            <p className="text-3xl font-black text-slate-800">{totalCursosDistintos}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
            <Layers size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Origens Distintas</p>
            <p className="text-3xl font-black text-slate-800">{totalOrigensDistintas}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Envios por Curso</h3>
          <div className="h-80">
            {byCourse.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCourse} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="value" fill={iconType === "whats" ? "#10b981" : "#f59e0b"} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Nenhum dado para exibir no gráfico
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Envios por Origem</h3>
          <div className="h-80">
            {byOrigin.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byOrigin}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {byOrigin.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Nenhum dado para exibir no gráfico
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Histórico de Envios via {typeLabel}</h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {filteredData.length} registro(s)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Data/Hora</th>
                <th className="px-6 py-4 font-bold">Candidato</th>
                <th className="px-6 py-4 font-bold">Telefone</th>
                <th className="px-6 py-4 font-bold">Curso</th>
                <th className="px-6 py-4 font-bold">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((contact) => {
                const date = contact.createdAt?.toDate
                  ? contact.createdAt.toDate()
                  : new Date(contact.createdAt || 0);
                return (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar size={14} className="mr-2 text-slate-400" />
                        {format(date, "dd/MM/yyyy HH:mm")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {contact.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {contact.telefone}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {contact.curso}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badgeClass}`}>
                        {contact.origem}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                    Nenhum registro de envio encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
