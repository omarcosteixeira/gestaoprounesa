import React, { useState } from "react";
import {
  Sun,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  TrendingUp,
  Calendar,
  Save,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { BomDiaCaptacao, BomDiaMetrics } from "../types";
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
  bomDia: BomDiaCaptacao[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

const emptyMetrics: BomDiaMetrics = { insc: 0, matFin: 0, matAcad: 0 };

export function AdminBomDiaView({ bomDia = [], onToast }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BomDiaCaptacao | null>(null);

  // Form State
  const [titulo, setTitulo] = useState("Bom Dia Captação");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [metaFinal, setMetaFinal] = useState<BomDiaMetrics>({ ...emptyMetrics });
  const [metaDia, setMetaDia] = useState<BomDiaMetrics>({ ...emptyMetrics });
  const [anoAnterior, setAnoAnterior] = useState<BomDiaMetrics>({ ...emptyMetrics });
  const [real, setReal] = useState<BomDiaMetrics>({ ...emptyMetrics });
  const [oculto, setOculto] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitulo("Bom Dia Captação");
    setData(new Date().toISOString().split("T")[0]);
    setMetaFinal({ insc: 0, matFin: 0, matAcad: 0 });
    setMetaDia({ insc: 0, matFin: 0, matAcad: 0 });
    setAnoAnterior({ insc: 0, matFin: 0, matAcad: 0 });
    setReal({ insc: 0, matFin: 0, matAcad: 0 });
    setOculto(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: BomDiaCaptacao) => {
    setEditingItem(item);
    setTitulo(item.titulo || "Bom Dia Captação");
    setData(item.data || new Date().toISOString().split("T")[0]);
    setMetaFinal(item.metaFinal || { ...emptyMetrics });
    setMetaDia(item.metaDia || { ...emptyMetrics });
    setAnoAnterior(item.anoAnterior || { ...emptyMetrics });
    setReal(item.real || { ...emptyMetrics });
    setOculto(!!item.oculto);
    setIsModalOpen(true);
  };

  const handleToggleOculto = async (item: BomDiaCaptacao) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.BOM_DIA, item.id), {
        oculto: !item.oculto,
        updatedAt: serverTimestamp(),
      });
      onToast(item.oculto ? "Card agora está visível no dashboard!" : "Card ocultado do dashboard.");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao alterar visibilidade: ${err.message}`, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este card de Bom Dia?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.BOM_DIA, id));
      onToast("Card excluído com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim() || "Bom Dia Captação",
        data,
        metaFinal: {
          insc: Number(metaFinal.insc) || 0,
          matFin: Number(metaFinal.matFin) || 0,
          matAcad: Number(metaFinal.matAcad) || 0,
        },
        metaDia: {
          insc: Number(metaDia.insc) || 0,
          matFin: Number(metaDia.matFin) || 0,
          matAcad: Number(metaDia.matAcad) || 0,
        },
        anoAnterior: {
          insc: Number(anoAnterior.insc) || 0,
          matFin: Number(anoAnterior.matFin) || 0,
          matAcad: Number(anoAnterior.matAcad) || 0,
        },
        real: {
          insc: Number(real.insc) || 0,
          matFin: Number(real.matFin) || 0,
          matAcad: Number(real.matAcad) || 0,
        },
        oculto,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.BOM_DIA, editingItem.id), payload);
        onToast("Card Bom Dia atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.BOM_DIA), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Novo card Bom Dia criado com sucesso!");
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
            <Sun className="text-amber-500" size={24} />
            Bom Dia Captação
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure as métricas diárias de captação (Inscrições, Matrículas Financeiras e Acadêmicas) exibidas no Dashboard.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Card Bom Dia</span>
        </button>
      </div>

      {/* List / Cards */}
      <div className="grid grid-cols-1 gap-4">
        {bomDia.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 text-slate-400">
            <Sun className="mx-auto mb-3 text-amber-300" size={48} />
            <p className="text-sm font-semibold">Nenhum card de Bom Dia cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Novo Card Bom Dia" para adicionar.</p>
          </div>
        ) : (
          bomDia.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                item.oculto ? "border-slate-200 bg-slate-50/50 opacity-75" : "border-slate-100 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                    <Sun size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{item.titulo}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <Calendar size={13} />
                      <span>Data: {item.data}</span>
                      {item.oculto && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          Oculto no Dashboard
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleToggleOculto(item)}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      item.oculto
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                    title={item.oculto ? "Exibir no Dashboard" : "Ocultar do Dashboard"}
                  >
                    {item.oculto ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{item.oculto ? "Oculto" : "Visível"}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Inscrições */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-blue-700 uppercase tracking-wider block mb-2">
                    Inscrições
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Real</span>
                      <strong className="text-slate-800 text-sm">{item.real?.insc || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Meta Dia</span>
                      <strong className="text-slate-800 text-sm">{item.metaDia?.insc || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Meta Final</span>
                      <span className="text-slate-600 font-semibold">{item.metaFinal?.insc || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ano Anterior</span>
                      <span className="text-slate-600 font-semibold">{item.anoAnterior?.insc || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Matrículas Financeiras */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider block mb-2">
                    Matrícula Financeira (Mat Fin)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Real</span>
                      <strong className="text-slate-800 text-sm">{item.real?.matFin || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Meta Dia</span>
                      <strong className="text-slate-800 text-sm">{item.metaDia?.matFin || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Meta Final</span>
                      <span className="text-slate-600 font-semibold">{item.metaFinal?.matFin || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ano Anterior</span>
                      <span className="text-slate-600 font-semibold">{item.anoAnterior?.matFin || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Matrículas Acadêmicas */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-purple-700 uppercase tracking-wider block mb-2">
                    Matrícula Acadêmica (Mat Acad)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Real</span>
                      <strong className="text-slate-800 text-sm">{item.real?.matAcad || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Meta Dia</span>
                      <strong className="text-slate-800 text-sm">{item.metaDia?.matAcad || 0}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Meta Final</span>
                      <span className="text-slate-600 font-semibold">{item.metaFinal?.matAcad || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ano Anterior</span>
                      <span className="text-slate-600 font-semibold">{item.anoAnterior?.matAcad || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 my-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sun className="text-amber-500" size={20} />
              {editingItem ? "Editar Card Bom Dia" : "Criar Novo Card Bom Dia"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Título do Card *</label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Referência *</label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Inscrições */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                <span className="text-xs font-bold text-blue-800">1. Métricas de Inscrições</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500">Realizado</label>
                    <input
                      type="number"
                      value={real.insc}
                      onChange={(e) => setReal({ ...real, insc: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Meta Dia</label>
                    <input
                      type="number"
                      value={metaDia.insc}
                      onChange={(e) => setMetaDia({ ...metaDia, insc: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Meta Final</label>
                    <input
                      type="number"
                      value={metaFinal.insc}
                      onChange={(e) => setMetaFinal({ ...metaFinal, insc: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Ano Anterior</label>
                    <input
                      type="number"
                      value={anoAnterior.insc}
                      onChange={(e) => setAnoAnterior({ ...anoAnterior, insc: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Mat Fin */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                <span className="text-xs font-bold text-emerald-800">2. Matrícula Financeira (Mat Fin)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500">Realizado</label>
                    <input
                      type="number"
                      value={real.matFin}
                      onChange={(e) => setReal({ ...real, matFin: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Meta Dia</label>
                    <input
                      type="number"
                      value={metaDia.matFin}
                      onChange={(e) => setMetaDia({ ...metaDia, matFin: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Meta Final</label>
                    <input
                      type="number"
                      value={metaFinal.matFin}
                      onChange={(e) => setMetaFinal({ ...metaFinal, matFin: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Ano Anterior</label>
                    <input
                      type="number"
                      value={anoAnterior.matFin}
                      onChange={(e) => setAnoAnterior({ ...anoAnterior, matFin: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Mat Acad */}
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                <span className="text-xs font-bold text-purple-800">3. Matrícula Acadêmica (Mat Acad)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500">Realizado</label>
                    <input
                      type="number"
                      value={real.matAcad}
                      onChange={(e) => setReal({ ...real, matAcad: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Meta Dia</label>
                    <input
                      type="number"
                      value={metaDia.matAcad}
                      onChange={(e) => setMetaDia({ ...metaDia, matAcad: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Meta Final</label>
                    <input
                      type="number"
                      value={metaFinal.matAcad}
                      onChange={(e) => setMetaFinal({ ...metaFinal, matAcad: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Ano Anterior</label>
                    <input
                      type="number"
                      value={anoAnterior.matAcad}
                      onChange={(e) => setAnoAnterior({ ...anoAnterior, matAcad: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ocultoCheckbox"
                  checked={oculto}
                  onChange={(e) => setOculto(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="ocultoCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Ocultar este card da tela principal (Dashboard)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
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
                  {saving ? "Salvando..." : "Salvar Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
