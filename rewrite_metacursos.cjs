const fs = require('fs');

const code = `import React, { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { MetaCurso } from "../types";

const emptyMetrics = {
  metaAA: "",
  metaDia: "",
  metaFinal: "",
  realizado: "",
};

export default function MetaCursosView({
  metaCursos = [],
  onToast,
}: {
  metaCursos?: MetaCurso[];
  onToast: (m: string, t?: "success" | "error") => void;
}) {
  const [editingItem, setEditingItem] = useState<MetaCurso | null>(null);
  const [formData, setFormData] = useState({
    semestre: "",
    curso: "",
    inscritos: { ...emptyMetrics },
    financeiro: { ...emptyMetrics },
    academico: { ...emptyMetrics },
  });

  const handleEdit = (item: MetaCurso) => {
    setEditingItem(item);
    setFormData({
      semestre: item.semestre || "",
      curso: item.curso || "",
      inscritos: item.inscritos ? {
        metaAA: String(item.inscritos.metaAA || ""),
        metaDia: String(item.inscritos.metaDia || ""),
        metaFinal: String(item.inscritos.metaFinal || ""),
        realizado: String(item.inscritos.realizado || "")
      } : { ...emptyMetrics },
      financeiro: item.financeiro ? {
        metaAA: String(item.financeiro.metaAA || ""),
        metaDia: String(item.financeiro.metaDia || ""),
        metaFinal: String(item.financeiro.metaFinal || ""),
        realizado: String(item.financeiro.realizado || "")
      } : { ...emptyMetrics },
      academico: item.academico ? {
        metaAA: String(item.academico.metaAA || ""),
        metaDia: String(item.academico.metaDia || ""),
        metaFinal: String(item.academico.metaFinal || ""),
        realizado: String(item.academico.realizado || "")
      } : { ...emptyMetrics },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir este registro?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.META_CURSOS, id));
      onToast("Registro removido.");
    } catch (error) {
      onToast("Erro ao remover registro.", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedData = {
      semestre: formData.semestre,
      curso: formData.curso,
      inscritos: {
        metaAA: Number(formData.inscritos.metaAA),
        metaDia: Number(formData.inscritos.metaDia),
        metaFinal: Number(formData.inscritos.metaFinal),
        realizado: Number(formData.inscritos.realizado),
      },
      financeiro: {
        metaAA: Number(formData.financeiro.metaAA),
        metaDia: Number(formData.financeiro.metaDia),
        metaFinal: Number(formData.financeiro.metaFinal),
        realizado: Number(formData.financeiro.realizado),
      },
      academico: {
        metaAA: Number(formData.academico.metaAA),
        metaDia: Number(formData.academico.metaDia),
        metaFinal: Number(formData.academico.metaFinal),
        realizado: Number(formData.academico.realizado),
      }
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.META_CURSOS, editingItem.id), parsedData);
        onToast("Registro atualizado!");
      } else {
        await addDoc(collection(db, COLLECTIONS.META_CURSOS), {
          ...parsedData,
          createdAt: serverTimestamp(),
        });
        onToast("Registro salvo!");
      }
      setEditingItem(null);
      setFormData({
        semestre: "",
        curso: "",
        inscritos: { ...emptyMetrics },
        financeiro: { ...emptyMetrics },
        academico: { ...emptyMetrics },
      });
    } catch (error) {
      onToast("Erro ao salvar registro.", "error");
    }
  };

  const categories = [
    { key: "inscritos", label: "Inscritos" },
    { key: "financeiro", label: "Financeiro" },
    { key: "academico", label: "Acadêmico" }
  ];

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 max-w-5xl mx-auto">
        <h3 className="text-xl font-bold text-slate-900 mb-6">
          {editingItem ? "Editar Meta por Curso" : "Nova Meta por Curso"}
        </h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Curso
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Direito"
                value={formData.curso}
                onChange={(e) =>
                  setFormData({ ...formData, curso: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
          </div>

          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.key} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-700 mb-4">{cat.label}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Meta A.A
                    </label>
                    <input
                      type="number"
                      required
                      value={(formData as any)[cat.key].metaAA}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [cat.key]: { ...(formData as any)[cat.key], metaAA: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Meta Dia
                    </label>
                    <input
                      type="number"
                      required
                      value={(formData as any)[cat.key].metaDia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [cat.key]: { ...(formData as any)[cat.key], metaDia: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Meta Final
                    </label>
                    <input
                      type="number"
                      required
                      value={(formData as any)[cat.key].metaFinal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [cat.key]: { ...(formData as any)[cat.key], metaFinal: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Realizado
                    </label>
                    <input
                      type="number"
                      required
                      value={(formData as any)[cat.key].realizado}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [cat.key]: { ...(formData as any)[cat.key], realizado: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              {editingItem ? <Edit2 size={18} /> : <Plus size={18} />}
              <span>{editingItem ? "Atualizar Meta" : "Salvar Meta"}</span>
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
                  curso: "",
                  inscritos: { ...emptyMetrics },
                  financeiro: { ...emptyMetrics },
                  academico: { ...emptyMetrics },
                });
              }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar Edição
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden max-w-7xl mx-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            Metas Cadastradas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 border-y border-slate-100">
              <tr>
                <th rowSpan={2} className="px-4 py-2 border-r border-slate-200 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider align-middle">
                  Curso/Sem.
                </th>
                <th colSpan={4} className="px-4 py-2 border-r border-slate-200 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Inscritos
                </th>
                <th colSpan={4} className="px-4 py-2 border-r border-slate-200 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Financeiro
                </th>
                <th colSpan={4} className="px-4 py-2 border-r border-slate-200 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Acadêmico
                </th>
                <th rowSpan={2} className="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider align-middle">
                  Ações
                </th>
              </tr>
              <tr className="bg-slate-50/80">
                {/* Inscritos */}
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">A.A</th>
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">Dia</th>
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">Final</th>
                <th className="px-2 py-2 border-r border-slate-200 text-center text-[9px] font-bold text-emerald-600 uppercase">Real</th>
                
                {/* Financeiro */}
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">A.A</th>
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">Dia</th>
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">Final</th>
                <th className="px-2 py-2 border-r border-slate-200 text-center text-[9px] font-bold text-emerald-600 uppercase">Real</th>
                
                {/* Acadêmico */}
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">A.A</th>
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">Dia</th>
                <th className="px-2 py-2 text-center text-[9px] font-bold text-slate-400 uppercase">Final</th>
                <th className="px-2 py-2 border-r border-slate-200 text-center text-[9px] font-bold text-emerald-600 uppercase">Real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...(metaCursos || [])]
                .sort((a, b) => (b.semestre || "").localeCompare(a.semestre || "") || (a.curso || "").localeCompare(b.curso || ""))
                .map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 border-r border-slate-100">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{item.curso}</div>
                      <div className="text-[10px] text-slate-500">{item.semestre}</div>
                    </td>
                    
                    {/* Inscritos */}
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.inscritos?.metaAA ?? item.metaAA ?? "-"}</td>
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.inscritos?.metaDia ?? item.metaDia ?? "-"}</td>
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.inscritos?.metaFinal ?? item.metaFinal ?? "-"}</td>
                    <td className="px-2 py-3 border-r border-slate-100 text-center text-xs font-bold text-emerald-600">{item.inscritos?.realizado ?? item.realizado ?? "-"}</td>

                    {/* Financeiro */}
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.financeiro?.metaAA ?? "-"}</td>
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.financeiro?.metaDia ?? "-"}</td>
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.financeiro?.metaFinal ?? "-"}</td>
                    <td className="px-2 py-3 border-r border-slate-100 text-center text-xs font-bold text-emerald-600">{item.financeiro?.realizado ?? "-"}</td>

                    {/* Acadêmico */}
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.academico?.metaAA ?? "-"}</td>
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.academico?.metaDia ?? "-"}</td>
                    <td className="px-2 py-3 text-center text-xs text-slate-600">{item.academico?.metaFinal ?? "-"}</td>
                    <td className="px-2 py-3 border-r border-slate-100 text-center text-xs font-bold text-emerald-600">{item.academico?.realizado ?? "-"}</td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors inline-flex mr-1"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              {(!metaCursos || metaCursos.length === 0) && (
                <tr>
                  <td colSpan={14} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma Meta por Curso cadastrada.
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
`

fs.writeFileSync('src/components/MetaCursosView.tsx', code);
console.log("Rewrote MetaCursosView.tsx");
