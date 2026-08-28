import React, { useState } from "react";
import { Calculator, DollarSign, Award, Target, TrendingUp, Info } from "lucide-react";

export function CalculoRemuneracaoView() {
  const [cargo, setCargo] = useState<"promotor" | "fdv" | "lider">("promotor");
  const [captacoes, setCaptacoes] = useState<number>(10);
  const [meta, setMeta] = useState<number>(20);
  const [valorBolsa, setValorBolsa] = useState<number>(100);

  const atingimento = meta > 0 ? (captacoes / meta) * 100 : 0;

  const getRemuneracao = () => {
    const valorPorMatricula = cargo === "promotor" ? 40 : cargo === "fdv" ? 60 : 80;
    const bonusSuperacao = atingimento >= 100 ? (atingimento >= 120 ? 500 : 250) : 0;
    const totalComissao = captacoes * valorPorMatricula;
    return {
      valorPorMatricula,
      totalComissao,
      bonusSuperacao,
      totalGeral: totalComissao + bonusSuperacao,
    };
  };

  const resultado = getRemuneracao();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="text-blue-600" size={28} />
          Calculadora de Remuneração e Comissões
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Simule a sua remuneração variável com base nas captações e metas atingidas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Parâmetros de Cálculo</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Função / Perfil
            </label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value as any)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="promotor">Promotor de Captação</option>
              <option value="fdv">Consultor FDV</option>
              <option value="lider">Líder / Supervisor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Meta Estabelecida (Matrículas)
            </label>
            <input
              type="number"
              min="1"
              value={meta}
              onChange={(e) => setMeta(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Matrículas Realizadas (Efetivas)
            </label>
            <input
              type="number"
              min="0"
              value={captacoes}
              onChange={(e) => setCaptacoes(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">
              Resultado da Simulação
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-400">
                R$ {resultado.totalGeral.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Estimativa de remuneração total variável</p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800 text-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span>% Atingimento da Meta:</span>
              <span className="font-bold text-white">{atingimento.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Comissão Base ({captacoes} x R${resultado.valorPorMatricula}):</span>
              <span className="font-bold text-white">R$ {resultado.totalComissao.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Bônus por Superação:</span>
              <span className="font-bold text-emerald-400">R$ {resultado.bonusSuperacao.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300 flex items-start gap-2">
            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <span>Os valores calculados são estimativas e dependem da validação final do financeiro.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
