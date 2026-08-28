import React, { useState, useMemo } from "react";
import {
  Clock,
  Send,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  FileText,
  Calendar,
  RefreshCcw,
} from "lucide-react";

interface InsumosDashboardProps {
  pedidos: any[];
  baixas: any[];
  title?: string;
}

export function InsumosDashboard({
  pedidos,
  baixas,
  title = "Indicadores de Insumos",
}: InsumosDashboardProps) {
  // Filters State
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Clear filters
  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  // Helper to check if a date is within selected range
  const isWithinDateRange = (createdAtStr: any) => {
    if (!createdAtStr) return true;
    const dateStr = String(createdAtStr).split("T")[0];
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  // Calculate top purchased products
  const topPurchased = useMemo(() => {
    const counts: { [key: string]: { qty: number; count: number } } = {};

    // Filter and process pedidos
    pedidos.forEach((p) => {
      // Typically consider any pending/approved/delivered as "compras/requisições"
      if (!isWithinDateRange(p.createdAt)) return;

      const items = p.itens || [];
      items.forEach((item: any) => {
        const name = String(item.material || "").trim();
        if (!name) return;

        // Filter by search query if present
        if (
          searchQuery &&
          !name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return;
        }

        const qty = parseInt(item.quantidade) || 0;

        if (!counts[name]) {
          counts[name] = { qty: 0, count: 0 };
        }
        counts[name].qty += qty;
        counts[name].count += 1;
      });
    });

    // Convert to sorted array
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        qty: data.qty,
        count: data.count,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [pedidos, startDate, endDate, searchQuery]);

  // Calculate top write-offs per reason
  const topBaixasByReason = useMemo(() => {
    const reasons = [
      "Uso em aula",
      "Uso no setor",
      "Material vencido(lixo)",
    ] as const;
    const result: {
      [key in (typeof reasons)[number]]: {
        name: string;
        qty: number;
        count: number;
      }[];
    } = {
      "Uso em aula": [],
      "Uso no setor": [],
      "Material vencido(lixo)": [],
    };

    reasons.forEach((reason) => {
      const counts: { [key: string]: { qty: number; count: number } } = {};

      baixas.forEach((b) => {
        if (b.motivo !== reason) return;
        if (!isWithinDateRange(b.createdAt)) return;

        const name = String(b.materialNome || b.material || "").trim();
        if (!name) return;

        // Filter by search query if present
        if (
          searchQuery &&
          !name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return;
        }

        const qty = parseInt(b.quantidade) || 0;
        if (!counts[name]) {
          counts[name] = { qty: 0, count: 0 };
        }
        counts[name].qty += qty;
        counts[name].count += 1;
      });

      result[reason] = Object.entries(counts)
        .map(([name, data]) => ({
          name,
          qty: data.qty,
          count: data.count,
        }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
    });

    return result;
  }, [baixas, startDate, endDate, searchQuery]);

  // Summary counts
  const summary = useMemo(() => {
    let totalItemsRequested = 0;
    let totalPedidosCount = 0;
    let totalBaixadosQty = 0;
    let totalBaixadosCount = 0;

    pedidos.forEach((p) => {
      if (!isWithinDateRange(p.createdAt)) return;
      totalPedidosCount++;
      const items = p.itens || [];
      items.forEach((item: any) => {
        totalItemsRequested += parseInt(item.quantidade) || 0;
      });
    });

    baixas.forEach((b) => {
      if (!isWithinDateRange(b.createdAt)) return;
      totalBaixadosCount++;
      totalBaixadosQty += parseInt(b.quantidade) || 0;
    });

    return {
      totalItemsRequested,
      totalPedidosCount,
      totalBaixadosQty,
      totalBaixadosCount,
    };
  }, [pedidos, baixas, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION & FILTER BAR */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-805 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={22} />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Visualize estatísticas, insumos solicitados e motivos de
              descarte/baixa física.
            </p>
          </div>

          {(startDate || endDate || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 px-3 py-1.5 rounded-full font-bold transition-all self-start md:self-auto cursor-pointer"
            >
              <RefreshCcw size={13} />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* INPUTS FOR FILTERING */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Data de Início
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-2.5 text-slate-400"
                size={14}
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-705 px-3 py-2 pl-9 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Data de Término
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-2.5 text-slate-400"
                size={14}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-705 px-3 py-2 pl-9 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Buscar Material
            </label>
            <input
              type="text"
              placeholder="Ex: Caneta, Caderno, Reagente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-705 px-3.5 py-2 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-55 text-blue-600 flex items-center justify-center shrink-0 animate-in fade-in duration-300">
            <ShoppingCart size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Itens Solicitados
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5 block">
              {summary.totalItemsRequested}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {summary.totalPedidosCount} fichas enviadas
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-55 text-amber-600 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Materiais Baixados
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5 block">
              {summary.totalBaixadosQty}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {summary.totalBaixadosCount} registros de baixa
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-55 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Produtos Únicos
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5 block">
              {topPurchased.length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              produtos no relatório
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-55 text-purple-650 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Período Relatório
            </span>
            <span className="text-xs font-black text-slate-700 mt-1.5 block leading-tight">
              {startDate || endDate ? (
                <>
                  {startDate
                    ? String(startDate).split("-").reverse().join("/")
                    : "Início"}
                  <span className="text-slate-400 mx-1">➜</span>
                  {endDate
                    ? String(endDate).split("-").reverse().join("/")
                    : "Fim"}
                </>
              ) : (
                "Todo o histórico"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED RESULTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PRODUTOS MAIS COMPRADOS / REQUISITADOS */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm lg:col-span-12 xl:col-span-5">
          <h4 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
            <ShoppingCart size={16} className="text-blue-500" />
            <span>Produtos mais comprados / requisitados</span>
          </h4>

          {topPurchased.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
              <AlertCircle size={28} className="mb-2 text-slate-300" />
              <p className="text-xs font-bold font-mono">
                Sem dados no período filtrado
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topPurchased.map((item, idx) => {
                const maxQty = topPurchased[0]?.qty || 1;
                const percentage = Math.round((item.qty / maxQty) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="font-mono text-blue-600 font-bold shrink-0">
                        {item.qty} un
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                      <span>{percentage}% do líder</span>
                      <span>Solicitado {item.count} vezes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PRODUTOS QUE MAIS APARECEM EM CADA MOTIVO DE BAIXA */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm lg:col-span-12 xl:col-span-7 space-y-4">
          <h4 className="font-black text-slate-800 text-sm mb-2 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-amber-500" />
            <span>Frequência por motivo de baixa física</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* MOTIVO: USO EM AULA */}
            <div className="space-y-3">
              <div className="bg-emerald-50 rounded-xl p-2.5 text-center border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                  Uso em Aula
                </span>
              </div>

              {topBaixasByReason["Uso em aula"].length === 0 ? (
                <p className="text-[10px] text-slate-400 italic text-center py-6">
                  Sem baixas registradas
                </p>
              ) : (
                <div className="space-y-2">
                  {topBaixasByReason["Uso em aula"].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-2 rounded-lg border border-slate-100/50"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span
                          className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span className="text-[10px] font-black font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-xs shrink-0">
                          {item.qty}
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-400 mt-0.5 font-mono">
                        {item.count} ocorrências
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MOTIVO: USO NO SETOR */}
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-105">
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider block">
                  Uso no Setor
                </span>
              </div>

              {topBaixasByReason["Uso no setor"].length === 0 ? (
                <p className="text-[10px] text-slate-400 italic text-center py-6">
                  Sem baixas registradas
                </p>
              ) : (
                <div className="space-y-2">
                  {topBaixasByReason["Uso no setor"].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-2 rounded-lg border border-slate-100/50"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span
                          className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span className="text-[10px] font-black font-mono text-blue-700 bg-white px-1.5 py-0.5 rounded shadow-xs shrink-0">
                          {item.qty}
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-400 mt-0.5 font-mono">
                        {item.count} ocorrências
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MOTIVO: VENCIDO / LIXO */}
            <div className="space-y-3">
              <div className="bg-rose-50 rounded-xl p-2.5 text-center border border-rose-105">
                <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">
                  Material Vencido
                </span>
              </div>

              {topBaixasByReason["Material vencido(lixo)"].length === 0 ? (
                <p className="text-[10px] text-slate-400 italic text-center py-6">
                  Sem baixas registradas
                </p>
              ) : (
                <div className="space-y-2">
                  {topBaixasByReason["Material vencido(lixo)"].map(
                    (item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-2 rounded-lg border border-slate-100/50"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span
                            className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <span className="text-[10px] font-black font-mono text-rose-700 bg-white px-1.5 py-0.5 rounded shadow-xs shrink-0">
                            {item.qty}
                          </span>
                        </div>
                        <div className="text-[8px] text-slate-400 mt-0.5 font-mono">
                          {item.count} ocorrências
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
