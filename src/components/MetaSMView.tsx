import React, { useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../firebase";
import { MetaSM } from "../types";

export default function MetaSMView({
  metaSM = [],
  onToast,
}: {
  metaSM?: MetaSM[];
  onToast: (m: string, t?: "success" | "error") => void;
}) {
  const [editingItem, setEditingItem] = useState<MetaSM | null>(null);
  const [formData, setFormData] = useState({
    semestre: "",
    metaAA: "",
    metaDia: "",
    metaFinal: "",
    realizado: "",
  });

  const handleEdit = (item: MetaSM) => {
    setEditingItem(item);
    setFormData({
      semestre: item.semestre || "",
      metaAA: item.metaAA?.toString() || "",
      metaDia: item.metaDia?.toString() || "",
      metaFinal: item.metaFinal?.toString() || "",
      realizado: item.realizado?.toString() || "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      semestre: formData.semestre,
      metaAA: Number(formData.metaAA) || 0,
      metaDia: Number(formData.metaDia) || 0,
      metaFinal: Number(formData.metaFinal) || 0,
      realizado: Number(formData.realizado) || 0,
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.META_SM, editingItem.id), payload);
        onToast("Meta SM atualizada com sucesso!");
        setEditingItem(null);
      } else {
        await addDoc(collection(db, COLLECTIONS.META_SM), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Meta SM cadastrada com sucesso!");
      }
      setFormData({
        semestre: "",
        metaAA: "",
        metaDia: "",
        metaFinal: "",
        realizado: "",
      });
    } catch (error) {
      console.error(error);
      onToast("Erro ao salvar Meta SM.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.META_SM, id));
      onToast("Registro excluído.");
    } catch (error) {
      console.error(error);
      onToast("Erro ao excluir.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Cadastro de Metas SM
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Cadastre e acompanhe o realizado do canal SM
            </p>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Semestre
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 2024.1"
                value={formData.semestre}
                onChange={(e) =>
                  setFormData({ ...formData, semestre: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Meta A.A
              </label>
              <input
                type="number"
                required
                value={formData.metaAA}
                onChange={(e) =>
                  setFormData({ ...formData, metaAA: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Meta Dia
              </label>
              <input
                type="number"
                required
                value={formData.metaDia}
                onChange={(e) =>
                  setFormData({ ...formData, metaDia: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Meta Final
              </label>
              <input
                type="number"
                required
                value={formData.metaFinal}
                onChange={(e) =>
                  setFormData({ ...formData, metaFinal: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Realizado SM
              </label>
              <input
                type="number"
                required
                value={formData.realizado}
                onChange={(e) =>
                  setFormData({ ...formData, realizado: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                {editingItem ? <Edit2 size={18} /> : <Plus size={18} />}
                <span>{editingItem ? "Atualizar" : "Cadastrar"}</span>
              </button>
            </div>
          </form>

          {editingItem && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setFormData({
                    semestre: "",
                    metaAA: "",
                    metaDia: "",
                    metaFinal: "",
                    realizado: "",
                  });
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar Edição
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 border-y border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Semestre
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Meta A.A
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Meta Dia
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Meta Final
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Realizado SM
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...(metaSM || [])].sort((a,b) => (b.semestre || "").localeCompare(a.semestre || "")).map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-slate-900">
                      {item.semestre}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-slate-600">{item.metaAA}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-slate-600">{item.metaDia}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-slate-600">{item.metaFinal}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-emerald-600 font-bold">{item.realizado}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors inline-flex mr-2"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!metaSM || metaSM.length === 0) && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Nenhuma Meta SM cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
