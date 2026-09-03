import React, { useState, useRef } from "react";
import { Plus, Trash2, Edit2, Download, Upload, FileSpreadsheet } from "lucide-react";
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.semestre.trim()) {
      onToast("Informe o semestre.", "error");
      return;
    }

    const payload = {
      semestre: formData.semestre.trim(),
      metaAA: Number(formData.metaAA) || 0,
      metaDia: Number(formData.metaDia) || 0,
      metaFinal: Number(formData.metaFinal) || 0,
      realizado: Number(formData.realizado) || 0,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.META_SM, editingItem.id), payload);
        onToast("Meta SM atualizada com sucesso!");
        setEditingItem(null);
      } else {
        // Look for existing semester record to update instead of duplicate
        const existing = metaSM.find(
          (m) => m.semestre?.trim().toLowerCase() === formData.semestre.trim().toLowerCase()
        );

        if (existing) {
          await updateDoc(doc(db, COLLECTIONS.META_SM, existing.id), payload);
          onToast("Meta SM existente encontrada e atualizada com sucesso!");
        } else {
          await addDoc(collection(db, COLLECTIONS.META_SM), {
            ...payload,
            createdAt: serverTimestamp(),
          });
          onToast("Meta SM cadastrada com sucesso!");
        }
      }
      setFormData({
        semestre: "",
        metaAA: "",
        metaDia: "",
        metaFinal: "",
        realizado: "",
      });
    } catch (error: any) {
      console.error(error);
      onToast(`Erro ao salvar Meta SM: ${error?.message || "Tente novamente"}`, "error");
    }
  };

  const handleExportExcel = () => {
    if (metaSM.length === 0) {
      onToast("Nenhum dado disponível para exportar.", "error");
      return;
    }

    const dataToExport = metaSM.map((m) => ({
      Semestre: m.semestre || "",
      "Meta A.A": m.metaAA || 0,
      "Meta Dia": m.metaDia || 0,
      "Meta Final": m.metaFinal || 0,
      "Realizado SM": m.realizado || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Meta SM");
    XLSX.writeFile(wb, `meta_sm_${new Date().toISOString().split("T")[0]}.xlsx`);
    onToast("Planilha de Meta SM exportada com sucesso!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Semestre: "2025.1",
        "Meta A.A": 1500,
        "Meta Dia": 20,
        "Meta Final": 1800,
        "Realizado SM": 1250,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Meta SM");
    XLSX.writeFile(wb, "modelo_meta_sm.xlsx");
    onToast("Modelo de Meta SM baixado com sucesso!");
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
          if (semVal) {
            const sTrim = String(semVal).trim();
            const metaAAVal = Number(row["Meta A.A"] || row.metaAA || row["Meta AA"] || 0);
            const metaDiaVal = Number(row["Meta Dia"] || row.metaDia || row["Meta dia"] || 0);
            const metaFinalVal = Number(row["Meta Final"] || row.metaFinal || row["Meta final"] || 0);
            const realizadoVal = Number(row["Realizado SM"] || row.Realizado || row.realizado || 0);

            const existing = metaSM.find(
              (m) => m.semestre?.trim().toLowerCase() === sTrim.toLowerCase()
            );

            const payload = {
              semestre: sTrim,
              metaAA: metaAAVal,
              metaDia: metaDiaVal,
              metaFinal: metaFinalVal,
              realizado: realizadoVal,
              updatedAt: serverTimestamp(),
            };

            if (existing) {
              await updateDoc(doc(db, COLLECTIONS.META_SM, existing.id), payload);
              countUpdated++;
            } else {
              await addDoc(collection(db, COLLECTIONS.META_SM), {
                ...payload,
                createdAt: serverTimestamp(),
              });
              countAdded++;
            }
          }
        }

        const msg = countAdded > 0 && countUpdated > 0
          ? `${countAdded} novas metas SM cadastradas e ${countUpdated} atualizadas!`
          : countAdded > 0
          ? `${countAdded} metas SM importadas com sucesso!`
          : `${countUpdated} metas SM atualizadas com sucesso!`;

        onToast(msg);
      } catch (err: any) {
        console.error("Erro ao importar planilha Meta SM:", err);
        onToast(`Erro ao importar: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
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
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Cadastro de Metas SM
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Cadastre e acompanhe o realizado do canal SM
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
