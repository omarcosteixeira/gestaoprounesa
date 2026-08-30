import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
  Target,
  Building2,
  TrendingUp,
  Award,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db, COLLECTIONS } from "../firebase";
import { MetaUnidadeRegional, UnidadeRegional } from "../types";

interface Props {
  metas?: MetaUnidadeRegional[];
  unidades?: UnidadeRegional[];
  onToast: (m: string, t?: "success" | "error") => void;
}

export function MetasUnidadeRegionalView({
  metas = [],
  unidades = [],
  onToast,
}: Props) {
  const [editingItem, setEditingItem] = useState<MetaUnidadeRegional | null>(null);
  const [formData, setFormData] = useState({
    unidade: "",
    semestre: "",
    metaAA: "",
    metaDia: "",
    metaFinal: "",
    realizado: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemestre, setSelectedSemestre] = useState("TODOS");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract unique available semesters for filter
  const uniqueSemestres = useMemo(() => {
    const s = new Set<string>();
    metas.forEach((m) => {
      if (m.semestre) s.add(m.semestre);
    });
    return Array.from(s).sort().reverse();
  }, [metas]);

  // Unique sorted unit names
  const unitOptions = useMemo(() => {
    const names = new Set<string>();
    unidades.forEach((u) => {
      if (u.nome) names.add(u.nome);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [unidades]);

  const handleEdit = (item: MetaUnidadeRegional) => {
    setEditingItem(item);
    setFormData({
      unidade: item.unidade || "",
      semestre: item.semestre || "",
      metaAA: item.metaAA?.toString() || "",
      metaDia: item.metaDia?.toString() || "",
      metaFinal: item.metaFinal?.toString() || "",
      realizado: item.realizado?.toString() || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData({
      unidade: "",
      semestre: "",
      metaAA: "",
      metaDia: "",
      metaFinal: "",
      realizado: "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unidade.trim()) {
      onToast("Selecione ou digite a unidade.", "error");
      return;
    }
    if (!formData.semestre.trim()) {
      onToast("Informe o semestre (ex: 2025.1).", "error");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      unidade: formData.unidade.trim(),
      semestre: formData.semestre.trim(),
      metaAA: Number(formData.metaAA) || 0,
      metaDia: Number(formData.metaDia) || 0,
      metaFinal: Number(formData.metaFinal) || 0,
      realizado: Number(formData.realizado) || 0,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.META_UNIDADE_REGIONAL, editingItem.id), payload);
        onToast("Meta da Unidade Regional atualizada com sucesso!");
        handleCancelEdit();
      } else {
        await addDoc(collection(db, COLLECTIONS.META_UNIDADE_REGIONAL), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Meta da Unidade Regional cadastrada com sucesso!");
        setFormData({
          unidade: "",
          semestre: formData.semestre, // keep semester for faster continuous input
          metaAA: "",
          metaDia: "",
          metaFinal: "",
          realizado: "",
        });
      }
    } catch (error: any) {
      console.error("Erro ao salvar meta regional:", error);
      onToast(`Erro ao salvar: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, unitName: string) => {
    if (!window.confirm(`Deseja realmente excluir a meta da unidade "${unitName}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.META_UNIDADE_REGIONAL, id));
      onToast("Registro excluído com sucesso.");
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      onToast(`Erro ao excluir: ${error.message}`, "error");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (metas.length === 0) {
      onToast("Nenhum dado disponível para exportar.", "error");
      return;
    }

    const dataToExport = metas.map((m, idx) => {
      const convFinal = m.metaFinal > 0 ? (m.realizado / m.metaFinal) * 100 : 0;
      const gapDia = m.realizado - m.metaDia;
      const gapFinal = m.realizado - m.metaFinal;

      return {
        "Nº": idx + 1,
        Unidade: m.unidade || "",
        Semestre: m.semestre || "",
        "Meta A.A": m.metaAA || 0,
        "Meta Dia": m.metaDia || 0,
        "Meta Final": m.metaFinal || 0,
        Realizado: m.realizado || 0,
        "Gap Dia": gapDia,
        "Gap Final": gapFinal,
        "Conversão Final (%)": `${convFinal.toFixed(1)}%`,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Metas Unidade Regional");
    XLSX.writeFile(wb, `Metas_Unidade_Regional_${new Date().toISOString().split("T")[0]}.xlsx`);
    onToast("Planilha de Metas exportada com sucesso!");
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Unidade: "Madureira",
        Semestre: "2025.1",
        "Meta A.A": 150,
        "Meta Dia": 10,
        "Meta Final": 180,
        Realizado: 125,
      },
      {
        Unidade: "Cabo Frio",
        Semestre: "2025.1",
        "Meta A.A": 80,
        "Meta Dia": 6,
        "Meta Final": 95,
        Realizado: 90,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Metas");
    XLSX.writeFile(wb, "Modelo_Metas_Unidade_Regional.xlsx");
    onToast("Modelo baixado com sucesso!");
  };

  // Import from Excel
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
        for (const row of rawData) {
          const unidadeVal =
            row.Unidade ||
            row.unidade ||
            row.UNIDADE ||
            row["Nome da Unidade"] ||
            row.Nome ||
            "";
          const semestreVal =
            row.Semestre ||
            row.semestre ||
            row.SEMESTRE ||
            "2025.1";

          if (unidadeVal) {
            const metaAAVal = Number(row["Meta A.A"] || row.metaAA || row["Meta AA"] || row.meta_aa || 0);
            const metaDiaVal = Number(row["Meta Dia"] || row.metaDia || row["Meta dia"] || row.meta_dia || 0);
            const metaFinalVal = Number(row["Meta Final"] || row.metaFinal || row["Meta final"] || row.meta_final || 0);
            const realizadoVal = Number(row.Realizado || row.realizado || row.REALIZADO || row["Realizado SM"] || 0);

            await addDoc(collection(db, COLLECTIONS.META_UNIDADE_REGIONAL), {
              unidade: String(unidadeVal).trim(),
              semestre: String(semestreVal).trim(),
              metaAA: metaAAVal,
              metaDia: metaDiaVal,
              metaFinal: metaFinalVal,
              realizado: realizadoVal,
              createdAt: serverTimestamp(),
            });
            countAdded++;
          }
        }

        onToast(`${countAdded} metas de unidades importadas com sucesso!`);
      } catch (err: any) {
        console.error("Erro ao importar planilha:", err);
        onToast(`Erro ao importar arquivo: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Filter and sort items
  const filteredMetas = useMemo(() => {
    return metas
      .filter((item) => {
        const matchesSearch =
          (item.unidade || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.semestre || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSemestre =
          selectedSemestre === "TODOS" || item.semestre === selectedSemestre;
        return matchesSearch && matchesSemestre;
      })
      .sort((a, b) => {
        // Sort best to worst conversion
        const convA = a.metaFinal > 0 ? a.realizado / a.metaFinal : 0;
        const convB = b.metaFinal > 0 ? b.realizado / b.metaFinal : 0;
        return convB - convA;
      });
  }, [metas, searchTerm, selectedSemestre]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totRealizado = 0;
    let totMetaDia = 0;
    let totMetaFinal = 0;
    let totMetaAA = 0;

    filteredMetas.forEach((m) => {
      totRealizado += Number(m.realizado || 0);
      totMetaDia += Number(m.metaDia || 0);
      totMetaFinal += Number(m.metaFinal || 0);
      totMetaAA += Number(m.metaAA || 0);
    });

    const conversaoGeral =
      totMetaFinal > 0 ? (totRealizado / totMetaFinal) * 100 : 0;

    const topUnit = filteredMetas.length > 0 ? filteredMetas[0] : null;

    return {
      count: filteredMetas.length,
      totRealizado,
      totMetaDia,
      totMetaFinal,
      totMetaAA,
      conversaoGeral,
      topUnit,
    };
  }, [filteredMetas]);

  return (
    <div className="space-y-6">
      {/* Header & Excel Controls */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-blue-600" size={24} />
            Metas Unidade Regional
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre, importe e gerencie as metas e realizado de cada unidade da regional.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">
            <Upload size={15} />
            <span>Importar Excel</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Download size={15} />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Baixar planilha modelo para importação"
          >
            <FileSpreadsheet size={15} />
            <span>Modelo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-600 rounded-xl text-white">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Unidades Cadastradas</p>
            <h3 className="text-xl font-bold text-slate-900">{summary.count}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-600 rounded-xl text-white">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Realizado Total</p>
            <h3 className="text-xl font-bold text-slate-900">{summary.totRealizado}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-xl text-white">
            <Target size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Meta Final Total</p>
            <h3 className="text-xl font-bold text-slate-900">{summary.totMetaFinal}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-500 rounded-xl text-white">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Conversão Geral</p>
            <h3 className="text-xl font-bold text-slate-900">
              {summary.conversaoGeral.toFixed(1)}%
            </h3>
          </div>
        </div>
      </div>

      {/* Cadastro / Edição Form */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {editingItem ? <Edit2 size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
              {editingItem ? "Editar Meta da Unidade" : "Cadastrar Meta de Unidade Regional"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecione a unidade e informe as metas e o realizado.
            </p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            {/* Dropdown de Seleção de Unidade */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Unidade Regional *
              </label>
              <div className="relative">
                <input
                  list="unidades-list-suggestions"
                  type="text"
                  required
                  placeholder="Selecione ou digite a unidade..."
                  value={formData.unidade}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-800"
                />
                <datalist id="unidades-list-suggestions">
                  {unitOptions.map((uNome) => (
                    <option key={uNome} value={uNome}>
                      {uNome}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Semestre *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 2025.1"
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
                placeholder="0"
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
                placeholder="0"
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
                placeholder="0"
                value={formData.metaFinal}
                onChange={(e) =>
                  setFormData({ ...formData, metaFinal: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Realizado
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.realizado}
                onChange={(e) =>
                  setFormData({ ...formData, realizado: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
          </form>

          <div className="mt-4 flex items-center justify-end gap-3">
            {editingItem && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                Cancelar Edição
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              {editingItem ? <Edit2 size={16} /> : <Plus size={16} />}
              <span>{editingItem ? "Salvar Alterações" : "Cadastrar Meta"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar por unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Semestre:</span>
          <select
            value={selectedSemestre}
            onChange={(e) => setSelectedSemestre(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Semestres</option>
            {uniqueSemestres.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Unidade
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Semestre
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Meta A.A
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Meta Dia
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Meta Final
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Realizado
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Gap Final
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">
                  % Conversão Final
                </th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMetas.map((item, index) => {
                const convFinal =
                  item.metaFinal > 0
                    ? (item.realizado / item.metaFinal) * 100
                    : 0;
                const gapFinal = item.realizado - item.metaFinal;

                let rankBadgeColor = "bg-slate-100 text-slate-600";
                if (index === 0) rankBadgeColor = "bg-amber-100 text-amber-800 font-black";
                else if (index === 1) rankBadgeColor = "bg-slate-200 text-slate-800 font-bold";
                else if (index === 2) rankBadgeColor = "bg-amber-50 text-amber-700 font-bold";

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${rankBadgeColor}`}
                      >
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.unidade}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        {item.semestre}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs text-slate-600 font-medium">
                      {item.metaAA}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs text-slate-600 font-medium">
                      {item.metaDia}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-bold text-slate-800">
                      {item.metaFinal}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-black text-emerald-600">
                      {item.realizado}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-bold">
                      <span
                        className={
                          gapFinal >= 0 ? "text-emerald-600" : "text-rose-600"
                        }
                      >
                        {gapFinal > 0 ? `+${gapFinal}` : gapFinal}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              convFinal >= 100
                                ? "bg-emerald-500"
                                : convFinal >= 70
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(convFinal, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-black ${
                            convFinal >= 100
                              ? "text-emerald-600"
                              : convFinal >= 70
                              ? "text-blue-600"
                              : "text-amber-600"
                          }`}
                        >
                          {convFinal.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.unidade)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMetas.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-slate-400 text-xs"
                  >
                    Nenhuma meta de unidade encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default MetasUnidadeRegionalView;
