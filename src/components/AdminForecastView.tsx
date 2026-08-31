import React, { useState } from "react";
import {
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  Target,
  Percent,
  CheckCircle2
} from "lucide-react";
import { ForecastCaptacao } from "../types";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

interface Props {
  forecast: ForecastCaptacao[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminForecastView({ forecast = [], onToast }: Props) {
  const [activeTab, setActiveTab] = useState<"ativos" | "inativos">("ativos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ForecastCaptacao | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split("T")[0]);
  const [metaDiaYTD, setMetaDiaYTD] = useState(0);
  const [realizado, setRealizado] = useState(0);
  const [metaFechamento, setMetaFechamento] = useState(0);
  const [oculto, setOculto] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNome("");
    setDataInicio(new Date().toISOString().split("T")[0]);
    setDataFim(new Date().toISOString().split("T")[0]);
    setMetaDiaYTD(0);
    setRealizado(0);
    setMetaFechamento(0);
    setOculto(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ForecastCaptacao) => {
    setEditingItem(item);
    setNome(item.nome || "");
    setDataInicio(item.dataInicio || "");
    setDataFim(item.dataFim || "");
    setMetaDiaYTD(item.metaDiaYTD || 0);
    setRealizado(item.realizado || 0);
    setMetaFechamento(item.metaFechamento || 0);
    setOculto(!!item.oculto);
    setIsModalOpen(true);
  };

  const handleToggleOculto = async (item: ForecastCaptacao) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.FORECAST, item.id), {
        oculto: !item.oculto,
        updatedAt: serverTimestamp(),
      });
      onToast(item.oculto ? "Forecast agora visível no dashboard!" : "Forecast ocultado do dashboard.");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao alterar visibilidade: ${err.message}`, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este Forecast?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.FORECAST, id));
      onToast("Forecast excluído com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast("Insira o nome do período de Forecast.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        dataInicio,
        dataFim,
        metaDiaYTD: Number(metaDiaYTD) || 0,
        realizado: Number(realizado) || 0,
        metaFechamento: Number(metaFechamento) || 0,
        oculto,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.FORECAST, editingItem.id), payload);
        onToast("Forecast atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.FORECAST), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Novo Forecast cadastrado!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={24} />
            Forecasts de Captação
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie as projeções de metas diárias (YTD), fechamento e realizado por ciclo ou safra.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Forecast</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(() => {
          const today = new Date().toISOString().split("T")[0];
          const filteredForecast = forecast.filter((item) => {
            const isAtivo = item.dataFim >= today && !item.oculto;
            return activeTab === "ativos" ? isAtivo : !isAtivo;
          });

          if (filteredForecast.length === 0) {
            return (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 text-slate-400">
                <TrendingUp className="mx-auto mb-3 text-slate-300" size={48} />
                <p className="text-sm font-semibold">Nenhum Forecast {activeTab} cadastrado.</p>
                <p className="text-xs text-slate-400 mt-1">Clique em "Novo Forecast" para adicionar.</p>
              </div>
            );
          }

          return filteredForecast.map((item) => {
            const atingimento = item.metaFechamento > 0 ? (item.realizado / item.metaFechamento) * 100 : 0;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                  item.oculto ? "border-slate-200 bg-slate-50/50 opacity-75" : "border-slate-100 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{item.nome}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <Calendar size={13} />
                      <span>{item.dataInicio} até {item.dataFim}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleOculto(item)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        item.oculto
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                      title={item.oculto ? "Exibir" : "Ocultar"}
                    >
                      {item.oculto ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Meta YTD</span>
                    <strong className="text-slate-700 text-sm">{item.metaDiaYTD}</strong>
                  </div>
                  <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-600 block uppercase">Realizado</span>
                    <strong className="text-blue-800 text-sm">{item.realizado}</strong>
                  </div>
                  <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] font-bold text-purple-600 block uppercase">Meta Fech.</span>
                    <strong className="text-purple-800 text-sm">{item.metaFechamento}</strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-slate-500">Progresso</span>
                    <span className={atingimento >= 100 ? "text-emerald-600" : "text-blue-600"}>
                      {atingimento.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        atingimento >= 100 ? "bg-emerald-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${Math.min(atingimento, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              {editingItem ? "Editar Forecast" : "Novo Forecast"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Ciclo / Safra *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Graduação 2026.1, Ciclo de Março..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data Início</label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data Fim</label>
                  <input
                    type="date"
                    required
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Meta Dia YTD</label>
                  <input
                    type="number"
                    value={metaDiaYTD}
                    onChange={(e) => setMetaDiaYTD(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Realizado</label>
                  <input
                    type="number"
                    value={realizado}
                    onChange={(e) => setRealizado(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Meta Fech.</label>
                  <input
                    type="number"
                    value={metaFechamento}
                    onChange={(e) => setMetaFechamento(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ocultoForecastCheckbox"
                  checked={oculto}
                  onChange={(e) => setOculto(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="ocultoForecastCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Ocultar este forecast no Dashboard
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  {saving ? "Salvando..." : "Salvar Forecast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
