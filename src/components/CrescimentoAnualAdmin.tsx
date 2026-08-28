import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Save, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  X,
  History,
  Calendar,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnalysisScheme, PeriodAnalysis } from "../types";
import { cn } from "../lib/utils";

interface CrescimentoAnualAdminProps {
  schemes: AnalysisScheme[];
  onSave: (scheme: Partial<AnalysisScheme>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function CrescimentoAnualAdmin({ schemes, onSave, onDelete }: CrescimentoAnualAdminProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AnalysisScheme>>({
    nome: "",
    periodos: [
      { periodo: "", meta: 0, realizado: 0 },
      { periodo: "", meta: 0, realizado: 0 },
      { periodo: "", meta: 0, realizado: 0 },
      { periodo: "", meta: 0, realizado: 0 }
    ]
  });

  const handleAddPeriod = () => {
    setFormData({
      ...formData,
      periodos: [...(formData.periodos || []), { periodo: "", meta: 0, realizado: 0 }]
    });
  };

  const handleRemovePeriod = (index: number) => {
    const newPeriodos = [...(formData.periodos || [])];
    newPeriodos.splice(index, 1);
    setFormData({ ...formData, periodos: newPeriodos });
  };

  const handlePeriodChange = (index: number, field: keyof PeriodAnalysis, value: string | number) => {
    const newPeriodos = [...(formData.periodos || [])];
    newPeriodos[index] = { ...newPeriodos[index], [field]: value };
    setFormData({ ...formData, periodos: newPeriodos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      nome: "",
      periodos: [
        { periodo: "", meta: 0, realizado: 0 },
        { periodo: "", meta: 0, realizado: 0 },
        { periodo: "", meta: 0, realizado: 0 },
        { periodo: "", meta: 0, realizado: 0 }
      ]
    });
  };

  const handleEdit = (scheme: AnalysisScheme) => {
    setFormData(scheme);
    setEditingId(scheme.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Crescimento Anual
          </h2>
          <p className="text-slate-500 font-medium">Gerencie esquemas de análise de crescimento e metas.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({
              nome: "",
              periodos: [
                { periodo: "", meta: 0, realizado: 0 },
                { periodo: "", meta: 0, realizado: 0 },
                { periodo: "", meta: 0, realizado: 0 },
                { periodo: "", meta: 0, realizado: 0 }
              ]
            });
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Esquema
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900">
                {editingId ? "Editar Esquema" : "Novo Esquema de Análise"}
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Nome da Análise
                </label>
                <input
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Crescimento Captação 23-26"
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none font-bold text-slate-700"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Períodos</h4>
                  <button
                    type="button"
                    onClick={handleAddPeriod}
                    className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Período
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {formData.periodos?.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Período</label>
                          <input
                            required
                            value={p.periodo}
                            onChange={(e) => handlePeriodChange(idx, "periodo", e.target.value)}
                            placeholder="Ex: 23.3"
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Meta</label>
                          <input
                            required
                            type="number"
                            value={p.meta}
                            onChange={(e) => handlePeriodChange(idx, "meta", Number(e.target.value))}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Realizado</label>
                          <input
                            required
                            type="number"
                            value={p.realizado}
                            onChange={(e) => handlePeriodChange(idx, "realizado", Number(e.target.value))}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                          />
                        </div>
                      </div>
                      {formData.periodos && formData.periodos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePeriod(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all mt-4"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {editingId ? "Salvar Alterações" : "Criar Esquema"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schemes.map((scheme) => (
          <motion.div
            layout
            key={scheme.id}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  {scheme.nome}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {scheme.periodos.length} períodos analisados
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(scheme)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => onDelete(scheme.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {scheme.periodos.map((p, i) => {
                const deliveredPercent = p.meta > 0 ? (p.realizado / p.meta) * 100 : 0;
                let metaGrowth = 0;
                let baseGrowth = 0;

                if (i > 0) {
                  const prev = scheme.periodos[i - 1];
                  metaGrowth = prev.meta > 0 ? ((p.meta - prev.meta) / prev.meta) * 100 : 0;
                  baseGrowth = prev.realizado > 0 ? ((p.realizado - prev.realizado) / prev.realizado) * 100 : 0;
                }

                return (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-200">
                        {p.periodo}
                      </span>
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-blue-500" />
                        <span className="text-xs font-bold text-slate-600">{p.meta}</span>
                        <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                        <span className="text-xs font-bold text-slate-600">{p.realizado}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Entregue</p>
                        <p className={cn(
                          "text-sm font-black",
                          deliveredPercent >= 100 ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {deliveredPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Cresc. Meta</p>
                        <p className={cn(
                          "text-sm font-black",
                          metaGrowth >= 0 ? "text-blue-600" : "text-rose-600"
                        )}>
                          {i === 0 ? "-" : `${metaGrowth.toFixed(1)}%`}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Cresc. Base</p>
                        <p className={cn(
                          "text-sm font-black",
                          baseGrowth >= 0 ? "text-indigo-600" : "text-rose-600"
                        )}>
                          {i === 0 ? "-" : `${baseGrowth.toFixed(1)}%`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
        {schemes.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <History size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">Nenhum esquema de análise criado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
