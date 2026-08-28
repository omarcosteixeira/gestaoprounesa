import React, { useState, useMemo } from "react";
import { SalesContact } from "../types";
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
import { MessageSquare, DollarSign, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

interface RelatorioSalesProps {
  salesContacts: SalesContact[];
}

export function RelatorioSales({ salesContacts }: RelatorioSalesProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cursoFilter, setCursoFilter] = useState("");
  const [origemFilter, setOrigemFilter] = useState("");

  const uniqueCursos = useMemo(() => Array.from(new Set(salesContacts.map(c => c.curso || 'Não informado'))).sort(), [salesContacts]);
  const uniqueOrigens = useMemo(() => Array.from(new Set(salesContacts.map(c => c.origem || 'Desconhecido'))).sort(), [salesContacts]);

  const filteredData = useMemo(() => { // 1
    return salesContacts.filter((contact) => {
      if (!contact.createdAt) return false;
      const date = contact.createdAt.toDate ? contact.createdAt.toDate() : new Date(contact.createdAt);
      if (startDate && date < new Date(startDate + "T00:00:00")) return false;
      if (endDate && date > new Date(endDate + "T23:59:59")) return false;
      if (cursoFilter && contact.curso !== cursoFilter) return false;
      if (origemFilter && contact.origem !== origemFilter) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [salesContacts, startDate, endDate]);

  const totalMessages = filteredData.length;
  const totalCost = totalMessages * 0.35;

  const byCourse = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredData.forEach(c => {
      const curso = c.curso || "Não informado";
      acc[curso] = (acc[curso] || 0) + 1;
    });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const byOrigin = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredData.forEach(c => {
      const origem = c.origem || "Desconhecido";
      acc[origem] = (acc[origem] || 0) + 1;
    });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Curso
          </label>
          <select
            value={cursoFilter}
            onChange={(e) => setCursoFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Todos os Cursos</option>
            {uniqueCursos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Origem (Base)
          </label>
          <select
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Todas as Bases</option>
            {uniqueOrigens.map(o => (
              <option key={o} value={o}>{o}</option>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <MessageSquare size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de Mensagens</p>
            <p className="text-3xl font-black text-slate-800">{totalMessages}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Custo Total Estimado</p>
            <p className="text-3xl font-black text-slate-800">{formatCurrency(totalCost)}</p>
            <p className="text-xs text-slate-400 mt-1">Baseado em {formatCurrency(0.35)} por envio</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Por Curso</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCourse} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Por Origem (Base)</h3>
          <div className="h-80">
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
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Histórico de Envios</h3>
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
                const date = contact.createdAt?.toDate ? contact.createdAt.toDate() : new Date(contact.createdAt || 0);
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
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {contact.telefone}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {contact.curso}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        {contact.origem}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                    Nenhum registro encontrado para o período selecionado.
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
