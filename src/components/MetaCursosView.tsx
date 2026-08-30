import React, { useState, useRef } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase";
import { COLLECTIONS } from "../firebase";
import { Edit2, Plus, Trash2, Download, Upload, FileSpreadsheet } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!formData.semestre.trim() || !formData.curso.trim()) {
      onToast("Informe o semestre e o curso.", "error");
      return;
    }
    
    const parsedData = {
      semestre: formData.semestre.trim(),
      curso: formData.curso.trim(),
      inscritos: {
        metaAA: Number(formData.inscritos.metaAA) || 0,
        metaDia: Number(formData.inscritos.metaDia) || 0,
        metaFinal: Number(formData.inscritos.metaFinal) || 0,
        realizado: Number(formData.inscritos.realizado) || 0,
      },
      financeiro: {
        metaAA: Number(formData.financeiro.metaAA) || 0,
        metaDia: Number(formData.financeiro.metaDia) || 0,
        metaFinal: Number(formData.financeiro.metaFinal) || 0,
        realizado: Number(formData.financeiro.realizado) || 0,
      },
      academico: {
        metaAA: Number(formData.academico.metaAA) || 0,
        metaDia: Number(formData.academico.metaDia) || 0,
        metaFinal: Number(formData.academico.metaFinal) || 0,
        realizado: Number(formData.academico.realizado) || 0,
      },
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.META_CURSOS, editingItem.id), parsedData);
        onToast("Meta de Curso atualizada!");
      } else {
        // Look for existing course + semester to update instead of duplicate
        const existing = metaCursos.find(
          (m) =>
            m.semestre?.trim().toLowerCase() === formData.semestre.trim().toLowerCase() &&
            m.curso?.trim().toLowerCase() === formData.curso.trim().toLowerCase()
        );

        if (existing) {
          await updateDoc(doc(db, COLLECTIONS.META_CURSOS, existing.id), parsedData);
          onToast("Meta existente encontrada e atualizada!");
        } else {
          await addDoc(collection(db, COLLECTIONS.META_CURSOS), {
            ...parsedData,
            createdAt: serverTimestamp(),
          });
          onToast("Meta de Curso cadastrada!");
        }
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

  const handleExportExcel = () => {
    if (metaCursos.length === 0) {
      onToast("Nenhum dado disponível para exportar.", "error");
      return;
    }

    const dataToExport = metaCursos.map((m) => ({
      Semestre: m.semestre || "",
      Curso: m.curso || "",
      "Inscritos Meta AA": m.inscritos?.metaAA || 0,
      "Inscritos Meta Dia": m.inscritos?.metaDia || 0,
      "Inscritos Meta Final": m.inscritos?.metaFinal || 0,
      "Inscritos Realizado": m.inscritos?.realizado || 0,
      "Financeiro Meta AA": m.financeiro?.metaAA || 0,
      "Financeiro Meta Dia": m.financeiro?.metaDia || 0,
      "Financeiro Meta Final": m.financeiro?.metaFinal || 0,
      "Financeiro Realizado": m.financeiro?.realizado || 0,
      "Acadêmico Meta AA": m.academico?.metaAA || 0,
      "Acadêmico Meta Dia": m.academico?.metaDia || 0,
      "Acadêmico Meta Final": m.academico?.metaFinal || 0,
      "Acadêmico Realizado": m.academico?.realizado || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Meta Cursos");
    XLSX.writeFile(wb, `meta_cursos_${new Date().toISOString().split("T")[0]}.xlsx`);
    onToast("Planilha de Meta Cursos exportada com sucesso!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Semestre: "2025.1",
        Curso: "Administração",
        "Inscritos Meta AA": 500,
        "Inscritos Meta Dia": 5,
        "Inscritos Meta Final": 600,
        "Inscritos Realizado": 450,
        "Financeiro Meta AA": 300,
        "Financeiro Meta Dia": 3,
        "Financeiro Meta Final": 350,
        "Financeiro Realizado": 280,
        "Acadêmico Meta AA": 250,
        "Acadêmico Meta Dia": 2,
        "Acadêmico Meta Final": 300,
        "Acadêmico Realizado": 240,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Meta Cursos");
    XLSX.writeFile(wb, "modelo_meta_cursos.xlsx");
    onToast("Modelo de Meta Cursos baixado com sucesso!");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          onToast("Arquivo Excel vazio ou sem registros válidos.", "error");
          return;
        }

        let countAdded = 0;
        let countUpdated = 0;

        for (const row of rawData) {
          const semVal = row.Semestre || row.semestre || row.SEMESTRE || "";
          const cursoVal = row.Curso || row.curso || row.CURSO || row["Nome do Curso"] || "";

          if (semVal && cursoVal) {
            const sTrim = String(semVal).trim();
            const cTrim = String(cursoVal).trim();

            const existing = metaCursos.find(
              (m) =>
                m.semestre?.trim().toLowerCase() === sTrim.toLowerCase() &&
                m.curso?.trim().toLowerCase() === cTrim.toLowerCase()
            );

            const payload = {
              semestre: sTrim,
              curso: cTrim,
              inscritos: {
                metaAA: Number(row["Inscritos Meta AA"] || row.inscritosMetaAA || 0),
                metaDia: Number(row["Inscritos Meta Dia"] || row.inscritosMetaDia || 0),
                metaFinal: Number(row["Inscritos Meta Final"] || row.inscritosMetaFinal || 0),
                realizado: Number(row["Inscritos Realizado"] || row.inscritosRealizado || 0),
              },
              financeiro: {
                metaAA: Number(row["Financeiro Meta AA"] || row.financeiroMetaAA || 0),
                metaDia: Number(row["Financeiro Meta Dia"] || row.financeiroMetaDia || 0),
                metaFinal: Number(row["Financeiro Meta Final"] || row.financeiroMetaFinal || 0),
                realizado: Number(row["Financeiro Realizado"] || row.financeiroRealizado || 0),
              },
              academico: {
                metaAA: Number(row["Acadêmico Meta AA"] || row.academicoMetaAA || 0),
                metaDia: Number(row["Acadêmico Meta Dia"] || row.academicoMetaDia || 0),
                metaFinal: Number(row["Acadêmico Meta Final"] || row.academicoMetaFinal || 0),
                realizado: Number(row["Acadêmico Realizado"] || row.academicoRealizado || 0),
              },
              updatedAt: serverTimestamp(),
            };

            if (existing) {
              await updateDoc(doc(db, COLLECTIONS.META_CURSOS, existing.id), payload);
              countUpdated++;
            } else {
              await addDoc(collection(db, COLLECTIONS.META_CURSOS), {
                ...payload,
                createdAt: serverTimestamp(),
              });
              countAdded++;
            }
          }
        }

        const msg = countAdded > 0 && countUpdated > 0
          ? `${countAdded} novas metas por curso cadastradas e ${countUpdated} atualizadas!`
          : countAdded > 0
          ? `${countAdded} metas por curso importadas com sucesso!`
          : `${countUpdated} metas por curso atualizadas com sucesso!`;

        onToast(msg);
      } catch (err: any) {
        console.error("Erro ao importar planilha Meta Cursos:", err);
        onToast(`Erro ao importar: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const categories = [
    { key: "inscritos", label: "Inscritos" },
    { key: "financeiro", label: "Financeiro" },
    { key: "academico", label: "Acadêmico" }
  ];

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingItem ? "Editar Meta por Curso" : "Nova Meta por Curso"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Cadastre e acompanhe o realizado dos cursos por categoria
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <Download size={15} />
              <span>Modelo Excel</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition cursor-pointer">
              <Upload size={15} />
              <span>Importar Excel</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
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
