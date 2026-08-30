import React, { useState } from "react";
import {
  CalendarRange,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  Tag
} from "lucide-react";
import { PeriodoCaptacao } from "../types";
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
  periodos: PeriodoCaptacao[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminPeriodoCaptacaoView({ periodos = [], onToast }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PeriodoCaptacao | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [inicioInscricao, setInicioInscricao] = useState("");
  const [fimInscricao, setFimInscricao] = useState("");
  const [inicioMatFin, setInicioMatFin] = useState("");
  const [fimMatFin, setFimMatFin] = useState("");
  const [inicioMatAcad, setInicioMatAcad] = useState("");
  const [fimMatAcad, setFimMatAcad] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNome("");
    setInicioInscricao("");
    setFimInscricao("");
    setInicioMatFin("");
    setFimMatFin("");
    setInicioMatAcad("");
    setFimMatAcad("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PeriodoCaptacao) => {
    setEditingItem(item);
    setNome(item.nome || "");
    setInicioInscricao(item.inicioInscricao || "");
    setFimInscricao(item.fimInscricao || "");
    setInicioMatFin(item.inicioMatFin || "");
    setFimMatFin(item.fimMatFin || "");
    setInicioMatAcad(item.inicioMatAcad || "");
    setFimMatAcad(item.fimMatAcad || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este período de captação?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.PERIODO_CAPTACAO, id));
      onToast("Período excluído com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast("Insira o nome do ciclo ou safra.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        inicioInscricao,
        fimInscricao,
        inicioMatFin,
        fimMatFin,
        inicioMatAcad,
        fimMatAcad,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.PERIODO_CAPTACAO, editingItem.id), payload);
        onToast("Período atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.PERIODO_CAPTACAO), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Novo período de captação cadastrado!");
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
            <CalendarRange className="text-blue-600" size={24} />
            Período da Captação
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Defina os calendários oficiais de inscrição, matrícula financeira e matrícula acadêmica.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Período de Captação</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {periodos.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 text-slate-400">
            <CalendarRange className="mx-auto mb-3 text-slate-300" size={48} />
            <p className="text-sm font-semibold">Nenhum período de captação cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Novo Período de Captação" para adicionar.</p>
          </div>
        ) : (
          periodos.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{item.nome}</h3>
                    <span className="text-xs text-slate-400">Calendário de Captação</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
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

              {/* Fases */}
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <span className="font-bold text-blue-800">1. Inscrições</span>
                  <span className="font-semibold text-slate-700">
                    {item.inicioInscricao || "N/D"} <span className="text-slate-400">até</span> {item.fimInscricao || "N/D"}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <span className="font-bold text-emerald-800">2. Matrícula Financeira (Mat Fin)</span>
                  <span className="font-semibold text-slate-700">
                    {item.inicioMatFin || "N/D"} <span className="text-slate-400">até</span> {item.fimMatFin || "N/D"}
                  </span>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                  <span className="font-bold text-purple-800">3. Matrícula Acadêmica (Mat Acad)</span>
                  <span className="font-semibold text-slate-700">
                    {item.inicioMatAcad || "N/D"} <span className="text-slate-400">até</span> {item.fimMatAcad || "N/D"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CalendarRange className="text-blue-600" size={20} />
              {editingItem ? "Editar Período de Captação" : "Novo Período de Captação"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Ciclo / Safra *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Captação 2026.1, Ciclo Reabertura..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Inscrições */}
              <div>
                <label className="block text-xs font-bold text-blue-700 mb-1">Período de Inscrições</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={inicioInscricao}
                    onChange={(e) => setInicioInscricao(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="date"
                    value={fimInscricao}
                    onChange={(e) => setFimInscricao(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Mat Fin */}
              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">Período de Matrícula Financeira</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={inicioMatFin}
                    onChange={(e) => setInicioMatFin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="date"
                    value={fimMatFin}
                    onChange={(e) => setFimMatFin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Mat Acad */}
              <div>
                <label className="block text-xs font-bold text-purple-700 mb-1">Período de Matrícula Acadêmica</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={inicioMatAcad}
                    onChange={(e) => setInicioMatAcad(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="date"
                    value={fimMatAcad}
                    onChange={(e) => setFimMatAcad(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
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
                  {saving ? "Salvando..." : "Salvar Período"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
