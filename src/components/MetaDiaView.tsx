import React, { useState, useRef, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  Target,
  TrendingUp,
  X,
  Layers,
  GraduationCap,
  Laptop,
  BookOpen,
  Award,
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
import { MetaDia } from "../types";

interface MetaDiaViewProps {
  metaDia?: MetaDia[];
  onToast: (m: string, t?: "success" | "error") => void;
}

const initialFormData = {
  data: new Date().toISOString().split("T")[0],
  aaPresencial: "",
  ytdPresencial: "",
  realizadoPresencial: "",
  aaSemipresencial: "",
  ytdSemipresencial: "",
  realizadoSemipresencial: "",
  aaDigital: "",
  ytdDigital: "",
  realizadoDigital: "",
  aaTecnico: "",
  ytdTecnico: "",
  realizadoTecnico: "",
  aaPosGraduacao: "",
  ytdPosGraduacao: "",
  realizadoPosGraduacao: "",
};

export default function MetaDiaView({ metaDia = [], onToast }: MetaDiaViewProps) {
  const [editingItem, setEditingItem] = useState<MetaDia | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [dataInicioFilter, setDataInicioFilter] = useState("");
  const [dataFimFilter, setDataFimFilter] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Filtered & sorted daily metas
  const filteredList = useMemo(() => {
    return [...metaDia]
      .filter((item) => {
        if (searchDate && !item.data.includes(searchDate)) return false;
        if (dataInicioFilter && item.data < dataInicioFilter) return false;
        if (dataFimFilter && item.data > dataFimFilter) return false;
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [metaDia, searchDate, dataInicioFilter, dataFimFilter]);

  // Overall quick statistics
  const summaryStats = useMemo(() => {
    const totalDays = metaDia.length;
    let totalRealizado = 0;
    let totalMeta = 0;
    let totalAA = 0;

    metaDia.forEach((m) => {
      totalRealizado +=
        (m.realizadoPresencial || 0) +
        (m.realizadoSemipresencial || 0) +
        (m.realizadoDigital || 0) +
        (m.realizadoTecnico || 0) +
        (m.realizadoPosGraduacao || 0);

      totalMeta +=
        (m.ytdPresencial || 0) +
        (m.ytdSemipresencial || 0) +
        (m.ytdDigital || 0) +
        (m.ytdTecnico || 0) +
        (m.ytdPosGraduacao || 0);

      totalAA +=
        (m.aaPresencial || 0) +
        (m.aaSemipresencial || 0) +
        (m.aaDigital || 0) +
        (m.aaTecnico || 0) +
        (m.aaPosGraduacao || 0);
    });

    const latestDate =
      metaDia.length > 0
        ? [...metaDia].sort((a, b) => b.data.localeCompare(a.data))[0].data
        : "Nenhum";

    return { totalDays, totalRealizado, totalMeta, totalAA, latestDate };
  }, [metaDia]);

  // Current form computed totals
  const formTotals = useMemo(() => {
    const presMeta = Number(formData.ytdPresencial) || 0;
    const semiMeta = Number(formData.ytdSemipresencial) || 0;
    const digMeta = Number(formData.ytdDigital) || 0;
    const tecMeta = Number(formData.ytdTecnico) || 0;
    const posMeta = Number(formData.ytdPosGraduacao) || 0;

    const presReal = Number(formData.realizadoPresencial) || 0;
    const semiReal = Number(formData.realizadoSemipresencial) || 0;
    const digReal = Number(formData.realizadoDigital) || 0;
    const tecReal = Number(formData.realizadoTecnico) || 0;
    const posReal = Number(formData.realizadoPosGraduacao) || 0;

    const buMeta = presMeta + semiMeta + digMeta;
    const buReal = presReal + semiReal + digReal;
    const totalMeta = buMeta + tecMeta + posMeta;
    const totalReal = buReal + tecReal + posReal;

    return { buMeta, buReal, totalMeta, totalReal };
  }, [formData]);

  const handleEdit = (item: MetaDia) => {
    setEditingItem(item);
    setFormData({
      data: item.data || "",
      aaPresencial: item.aaPresencial?.toString() || "",
      ytdPresencial: item.ytdPresencial?.toString() || "",
      realizadoPresencial: item.realizadoPresencial?.toString() || "",
      aaSemipresencial: item.aaSemipresencial?.toString() || "",
      ytdSemipresencial: item.ytdSemipresencial?.toString() || "",
      realizadoSemipresencial: item.realizadoSemipresencial?.toString() || "",
      aaDigital: item.aaDigital?.toString() || "",
      ytdDigital: item.ytdDigital?.toString() || "",
      realizadoDigital: item.realizadoDigital?.toString() || "",
      aaTecnico: item.aaTecnico?.toString() || "",
      ytdTecnico: item.ytdTecnico?.toString() || "",
      realizadoTecnico: item.realizadoTecnico?.toString() || "",
      aaPosGraduacao: item.aaPosGraduacao?.toString() || "",
      ytdPosGraduacao: item.ytdPosGraduacao?.toString() || "",
      realizadoPosGraduacao: item.realizadoPosGraduacao?.toString() || "",
    });

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData(initialFormData);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data.trim()) {
      onToast("Selecione a data da meta.", "error");
      return;
    }

    const payload = {
      data: formData.data.trim(),
      aaPresencial: Number(formData.aaPresencial) || 0,
      ytdPresencial: Number(formData.ytdPresencial) || 0,
      realizadoPresencial: Number(formData.realizadoPresencial) || 0,
      aaSemipresencial: Number(formData.aaSemipresencial) || 0,
      ytdSemipresencial: Number(formData.ytdSemipresencial) || 0,
      realizadoSemipresencial: Number(formData.realizadoSemipresencial) || 0,
      aaDigital: Number(formData.aaDigital) || 0,
      ytdDigital: Number(formData.ytdDigital) || 0,
      realizadoDigital: Number(formData.realizadoDigital) || 0,
      aaTecnico: Number(formData.aaTecnico) || 0,
      ytdTecnico: Number(formData.ytdTecnico) || 0,
      realizadoTecnico: Number(formData.realizadoTecnico) || 0,
      aaPosGraduacao: Number(formData.aaPosGraduacao) || 0,
      ytdPosGraduacao: Number(formData.ytdPosGraduacao) || 0,
      realizadoPosGraduacao: Number(formData.realizadoPosGraduacao) || 0,
      updatedAt: serverTimestamp(),
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.META_DIA, editingItem.id), payload);
        onToast(`Meta do dia ${formData.data} atualizada com sucesso!`);
        setEditingItem(null);
      } else {
        // Check if date already exists to update instead of duplicating
        const existing = metaDia.find((m) => m.data === formData.data.trim());
        if (existing) {
          await updateDoc(doc(db, COLLECTIONS.META_DIA, existing.id), payload);
          onToast(`Meta para o dia ${formData.data} já existia e foi atualizada!`);
        } else {
          await addDoc(collection(db, COLLECTIONS.META_DIA), {
            ...payload,
            createdAt: serverTimestamp(),
          });
          onToast(`Meta do dia ${formData.data} cadastrada com sucesso!`);
        }
      }
      setFormData(initialFormData);
    } catch (error: any) {
      console.error("Erro ao salvar Meta Dia:", error);
      onToast(`Erro ao salvar Meta Dia: ${error.message || "Tente novamente"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: MetaDia) => {
    if (!window.confirm(`Deseja realmente excluir o registro do dia ${item.data}?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.META_DIA, item.id));
      onToast(`Registro de ${item.data} excluído com sucesso.`);
      if (editingItem?.id === item.id) {
        handleCancelEdit();
      }
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      onToast(`Erro ao excluir: ${error.message}`, "error");
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Data: "2025-03-01",
        "Presencial AA": 100,
        "Presencial Meta Dia": 120,
        "Presencial Realizado": 115,
        "Semipresencial AA": 50,
        "Semipresencial Meta Dia": 60,
        "Semipresencial Realizado": 58,
        "Digital AA": 200,
        "Digital Meta Dia": 250,
        "Digital Realizado": 240,
        "Tecnico AA": 30,
        "Tecnico Meta Dia": 40,
        "Tecnico Realizado": 35,
        "Pos-Graduacao AA": 40,
        "Pos-Graduacao Meta Dia": 50,
        "Pos-Graduacao Realizado": 45,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo_Meta_Dia");
    XLSX.writeFile(wb, "modelo_meta_dia.xlsx");
    onToast("Modelo baixado com sucesso!");
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (metaDia.length === 0) {
      onToast("Nenhum dado disponível para exportar.", "error");
      return;
    }

    const exportData = filteredList.map((m) => {
      const presReal = m.realizadoPresencial || 0;
      const semiReal = m.realizadoSemipresencial || 0;
      const digReal = m.realizadoDigital || 0;
      const tecReal = m.realizadoTecnico || 0;
      const posReal = m.realizadoPosGraduacao || 0;

      const presMeta = m.ytdPresencial || 0;
      const semiMeta = m.ytdSemipresencial || 0;
      const digMeta = m.ytdDigital || 0;
      const tecMeta = m.ytdTecnico || 0;
      const posMeta = m.ytdPosGraduacao || 0;

      return {
        Data: m.data,
        "Presencial AA": m.aaPresencial || 0,
        "Presencial Meta Dia": presMeta,
        "Presencial Realizado": presReal,
        "Semipresencial AA": m.aaSemipresencial || 0,
        "Semipresencial Meta Dia": semiMeta,
        "Semipresencial Realizado": semiReal,
        "Digital AA": m.aaDigital || 0,
        "Digital Meta Dia": digMeta,
        "Digital Realizado": digReal,
        "Tecnico AA": m.aaTecnico || 0,
        "Tecnico Meta Dia": tecMeta,
        "Tecnico Realizado": tecReal,
        "Pos-Graduacao AA": m.aaPosGraduacao || 0,
        "Pos-Graduacao Meta Dia": posMeta,
        "Pos-Graduacao Realizado": posReal,
        "Total Meta": presMeta + semiMeta + digMeta + tecMeta + posMeta,
        "Total Realizado": presReal + semiReal + digReal + tecReal + posReal,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Metas_Dia");
    XLSX.writeFile(wb, `metas_dia_${new Date().toISOString().split("T")[0]}.xlsx`);
    onToast("Dados exportados com sucesso!");
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          onToast("Nenhuma linha encontrada na planilha.", "error");
          return;
        }

        let countAdded = 0;
        let countUpdated = 0;

        for (const row of rows) {
          // Normalize date field
          let rawDate = row.Data || row.data || row.DATA || "";
          if (typeof rawDate === "number") {
            // Excel serial date to YYYY-MM-DD
            const dateObj = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
            rawDate = dateObj.toISOString().split("T")[0];
          } else {
            rawDate = String(rawDate).trim();
            // Try formatting if DD/MM/YYYY
            if (rawDate.includes("/")) {
              const parts = rawDate.split("/");
              if (parts.length === 3) {
                rawDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              }
            }
          }

          if (!rawDate) continue;

          const payload = {
            data: rawDate,
            aaPresencial: Number(row["Presencial AA"] ?? row.aaPresencial ?? 0),
            ytdPresencial: Number(row["Presencial Meta Dia"] ?? row["Presencial Meta"] ?? row.ytdPresencial ?? 0),
            realizadoPresencial: Number(row["Presencial Realizado"] ?? row.realizadoPresencial ?? 0),
            aaSemipresencial: Number(row["Semipresencial AA"] ?? row.aaSemipresencial ?? 0),
            ytdSemipresencial: Number(row["Semipresencial Meta Dia"] ?? row["Semipresencial Meta"] ?? row.ytdSemipresencial ?? 0),
            realizadoSemipresencial: Number(row["Semipresencial Realizado"] ?? row.realizadoSemipresencial ?? 0),
            aaDigital: Number(row["Digital AA"] ?? row.aaDigital ?? 0),
            ytdDigital: Number(row["Digital Meta Dia"] ?? row["Digital Meta"] ?? row.ytdDigital ?? 0),
            realizadoDigital: Number(row["Digital Realizado"] ?? row.realizadoDigital ?? 0),
            aaTecnico: Number(row["Tecnico AA"] ?? row.aaTecnico ?? 0),
            ytdTecnico: Number(row["Tecnico Meta Dia"] ?? row["Tecnico Meta"] ?? row.ytdTecnico ?? 0),
            realizadoTecnico: Number(row["Tecnico Realizado"] ?? row.realizadoTecnico ?? 0),
            aaPosGraduacao: Number(row["Pos-Graduacao AA"] ?? row["Pos Graduacao AA"] ?? row.aaPosGraduacao ?? 0),
            ytdPosGraduacao: Number(row["Pos-Graduacao Meta Dia"] ?? row["Pos-Graduacao Meta"] ?? row.ytdPosGraduacao ?? 0),
            realizadoPosGraduacao: Number(row["Pos-Graduacao Realizado"] ?? row.realizadoPosGraduacao ?? 0),
            updatedAt: serverTimestamp(),
          };

          const existing = metaDia.find((m) => m.data === rawDate);
          if (existing) {
            await updateDoc(doc(db, COLLECTIONS.META_DIA, existing.id), payload);
            countUpdated++;
          } else {
            await addDoc(collection(db, COLLECTIONS.META_DIA), {
              ...payload,
              createdAt: serverTimestamp(),
            });
            countAdded++;
          }
        }

        const msg =
          countAdded > 0 && countUpdated > 0
            ? `${countAdded} novas metas do dia cadastradas e ${countUpdated} atualizadas!`
            : countAdded > 0
            ? `${countAdded} metas do dia importadas com sucesso!`
            : `${countUpdated} metas do dia atualizadas com sucesso!`;

        onToast(msg);
      } catch (err: any) {
        console.error("Erro ao importar planilha Meta Dia:", err);
        onToast(`Erro ao importar: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Dias Cadastrados</p>
            <p className="text-2xl font-black text-slate-800">{summaryStats.totalDays}</p>
            <p className="text-[11px] text-slate-400">Última: {summaryStats.latestDate}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Total Realizado</p>
            <p className="text-2xl font-black text-emerald-700">{summaryStats.totalRealizado.toLocaleString("pt-BR")}</p>
            <p className="text-[11px] text-slate-400">Todas as modalidades</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Target size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Meta Acumulada</p>
            <p className="text-2xl font-black text-blue-700">{summaryStats.totalMeta.toLocaleString("pt-BR")}</p>
            <p className="text-[11px] text-slate-400">GAP: {(summaryStats.totalMeta - summaryStats.totalRealizado).toLocaleString("pt-BR")}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Atingimento Geral</p>
            <p className="text-2xl font-black text-purple-700">
              {summaryStats.totalMeta > 0
                ? `${((summaryStats.totalRealizado / summaryStats.totalMeta) * 100).toFixed(1)}%`
                : "0%"}
            </p>
            <p className="text-[11px] text-slate-400">Ano Ant: {summaryStats.totalAA.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </div>

      {/* Main card: Form & Controls */}
      <section ref={formRef} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Target className="text-blue-600" size={22} />
              {editingItem ? `Editando Meta do Dia: ${editingItem.data}` : "Cadastro de Metas Dia"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre e gerencie os objetivos e realizados diários por modalidade de ensino.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <Download size={15} />
              <span>Modelo Excel</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition cursor-pointer">
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
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Top row: Date selection & status preview */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 p-4 bg-blue-50/40 rounded-2xl border border-blue-100/60">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                Data da Meta <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            {/* Quick real-time totals preview */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase">Total Meta: </span>
                <span className="text-blue-600 font-black">{formTotals.totalMeta}</span>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase">Total Realizado: </span>
                <span className="text-emerald-600 font-black">{formTotals.totalReal}</span>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase">GAP: </span>
                <span className={formTotals.totalMeta - formTotals.totalReal > 0 ? "text-amber-600 font-black" : "text-emerald-600 font-black"}>
                  {formTotals.totalMeta - formTotals.totalReal}
                </span>
              </div>
            </div>
          </div>

          {/* Modality input blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Presencial */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm border-b border-slate-200 pb-2">
                <GraduationCap size={18} />
                <span>Presencial</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta A.A</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.aaPresencial}
                    onChange={(e) => setFormData({ ...formData, aaPresencial: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta Dia</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.ytdPresencial}
                    onChange={(e) => setFormData({ ...formData, ytdPresencial: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Realizado</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.realizadoPresencial}
                    onChange={(e) => setFormData({ ...formData, realizadoPresencial: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Semipresencial */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-b border-slate-200 pb-2">
                <Layers size={18} />
                <span>Semipresencial</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta A.A</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.aaSemipresencial}
                    onChange={(e) => setFormData({ ...formData, aaSemipresencial: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta Dia</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.ytdSemipresencial}
                    onChange={(e) => setFormData({ ...formData, ytdSemipresencial: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Realizado</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.realizadoSemipresencial}
                    onChange={(e) => setFormData({ ...formData, realizadoSemipresencial: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Digital (EAD) */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm border-b border-slate-200 pb-2">
                <Laptop size={18} />
                <span>Digital (EAD)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta A.A</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.aaDigital}
                    onChange={(e) => setFormData({ ...formData, aaDigital: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta Dia</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.ytdDigital}
                    onChange={(e) => setFormData({ ...formData, ytdDigital: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Realizado</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.realizadoDigital}
                    onChange={(e) => setFormData({ ...formData, realizadoDigital: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Técnico */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm border-b border-slate-200 pb-2">
                <BookOpen size={18} />
                <span>Curso Técnico</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta A.A</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.aaTecnico}
                    onChange={(e) => setFormData({ ...formData, aaTecnico: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta Dia</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.ytdTecnico}
                    onChange={(e) => setFormData({ ...formData, ytdTecnico: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Realizado</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.realizadoTecnico}
                    onChange={(e) => setFormData({ ...formData, realizadoTecnico: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. Pós-Graduação */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm border-b border-slate-200 pb-2">
                <Award size={18} />
                <span>Pós-Graduação</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta A.A</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.aaPosGraduacao}
                    onChange={(e) => setFormData({ ...formData, aaPosGraduacao: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta Dia</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.ytdPosGraduacao}
                    onChange={(e) => setFormData({ ...formData, ytdPosGraduacao: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Realizado</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.realizadoPosGraduacao}
                    onChange={(e) => setFormData({ ...formData, realizadoPosGraduacao: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Form actions block */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-end gap-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {editingItem ? <Edit2 size={18} /> : <Plus size={18} />}
                <span>
                  {isSubmitting
                    ? "Salvando..."
                    : editingItem
                    ? "Atualizar Meta Dia"
                    : "Cadastrar Meta Dia"}
                </span>
              </button>

              {editingItem && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X size={14} />
                  <span>Cancelar Edição</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Table section: List of registered daily goals */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table header & filters */}
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
          <div>
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              Histórico de Metas Cadastradas ({filteredList.length})
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize, edite ou exclua as metas diárias registradas no sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Filter size={14} className="text-slate-400" />
              <input
                type="date"
                value={dataInicioFilter}
                onChange={(e) => setDataInicioFilter(e.target.value)}
                className="outline-none text-slate-700 text-xs font-semibold"
                placeholder="De"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={dataFimFilter}
                onChange={(e) => setDataFimFilter(e.target.value)}
                className="outline-none text-slate-700 text-xs font-semibold"
                placeholder="Até"
              />
            </div>

            {(dataInicioFilter || dataFimFilter) && (
              <button
                type="button"
                onClick={() => {
                  setDataInicioFilter("");
                  setDataFimFilter("");
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition cursor-pointer"
              >
                Limpar Filtro
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-3">Presencial (M / R)</th>
                <th className="py-3.5 px-3">Semi (M / R)</th>
                <th className="py-3.5 px-3">Digital (M / R)</th>
                <th className="py-3.5 px-3">Técnico (M / R)</th>
                <th className="py-3.5 px-3">Pós (M / R)</th>
                <th className="py-3.5 px-4 text-center">Total Meta</th>
                <th className="py-3.5 px-4 text-center">Total Realizado</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Target size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">Nenhuma meta diária encontrada.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Preencha o formulário acima para cadastrar a meta de um dia ou importe via Excel.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const presM = item.ytdPresencial || 0;
                  const presR = item.realizadoPresencial || 0;
                  const semiM = item.ytdSemipresencial || 0;
                  const semiR = item.realizadoSemipresencial || 0;
                  const digM = item.ytdDigital || 0;
                  const digR = item.realizadoDigital || 0;
                  const tecM = item.ytdTecnico || 0;
                  const tecR = item.realizadoTecnico || 0;
                  const posM = item.ytdPosGraduacao || 0;
                  const posR = item.realizadoPosGraduacao || 0;

                  const totalM = presM + semiM + digM + tecM + posM;
                  const totalR = presR + semiR + digR + tecR + posR;
                  const atingiu = totalM > 0 && totalR >= totalM;
                  const isCurrentEditing = editingItem?.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentEditing ? "bg-blue-50/60 font-medium" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md text-[11px]">
                          {item.data}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-600 font-semibold">{presM}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-bold text-blue-600">{presR}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-600 font-semibold">{semiM}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-bold text-indigo-600">{semiR}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-600 font-semibold">{digM}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-bold text-emerald-600">{digR}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-600 font-semibold">{tecM}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-bold text-amber-600">{tecR}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-600 font-semibold">{posM}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-bold text-purple-600">{posR}</span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                        {totalM}
                      </td>

                      <td className="py-3 px-4 text-center font-black text-slate-900 whitespace-nowrap">
                        {totalR}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {atingiu ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />
                            Alcançada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            GAP: {totalM - totalR}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            title="Editar Meta Dia"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            title="Excluir"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
