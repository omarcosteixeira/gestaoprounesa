import React, { useState, useRef, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  FileSpreadsheet,
  Award,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Percent
} from "lucide-react";
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db, COLLECTIONS } from "../firebase";
import { MetaRVV } from "../types";

export default function MetaRVVView({
  metaRVV = [],
  onToast,
}: {
  metaRVV?: MetaRVV[];
  onToast: (m: string, t?: "success" | "error") => void;
}) {
  const [editingItem, setEditingItem] = useState<MetaRVV | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    mesAno: "",
    realFinDig: "",
    metaFinDig: "",
    multDigi: "",
    multConvDigi: "",
    realFinPres: "",
    metaFinPres: "",
    multPres: "",
    multConvPres: "",
    statusPagamento: "Pendente" as "Paga" | "Contestada" | "Pendente",
  });

  // Calculate live values
  const realDigVal = Number(formData.realFinDig) || 0;
  const metaDigVal = Number(formData.metaFinDig) || 0;
  const atingDigCalc = metaDigVal > 0 ? (realDigVal / metaDigVal) * 100 : 0;

  const realPresVal = Number(formData.realFinPres) || 0;
  const metaPresVal = Number(formData.metaFinPres) || 0;
  const atingPresCalc = metaPresVal > 0 ? (realPresVal / metaPresVal) * 100 : 0;

  const multDigiVal = Number(formData.multDigi) || 0;
  const multConvDigiVal = Number(formData.multConvDigi) || 0;
  const multPresVal = Number(formData.multPres) || 0;
  const multConvPresVal = Number(formData.multConvPres) || 0;
  const totalMultiploCalc = multDigiVal + multConvDigiVal + multPresVal + multConvPresVal;

  // KPI calculations
  const kpis = useMemo(() => {
    const totalRegistros = metaRVV.length;
    const totalMultiplos = metaRVV.reduce(
      (acc, curr) => acc + (curr.totalMultiploRVV ?? (
        (curr.multDigi || 0) +
        (curr.multConvDigi || 0) +
        (curr.multPres || 0) +
        (curr.multConvPres || 0)
      )),
      0
    );
    const pagas = metaRVV.filter((m) => m.statusPagamento === "Paga").length;
    const contestadas = metaRVV.filter((m) => m.statusPagamento === "Contestada").length;
    return { totalRegistros, totalMultiplos, pagas, contestadas };
  }, [metaRVV]);

  const handleEdit = (item: MetaRVV) => {
    setEditingItem(item);
    setFormData({
      mesAno: item.mesAno || "",
      realFinDig: item.realFinDig !== undefined ? String(item.realFinDig) : "",
      metaFinDig: item.metaFinDig !== undefined ? String(item.metaFinDig) : "",
      multDigi: item.multDigi !== undefined ? String(item.multDigi) : "",
      multConvDigi: item.multConvDigi !== undefined ? String(item.multConvDigi) : "",
      realFinPres: item.realFinPres !== undefined ? String(item.realFinPres) : "",
      metaFinPres: item.metaFinPres !== undefined ? String(item.metaFinPres) : "",
      multPres: item.multPres !== undefined ? String(item.multPres) : "",
      multConvPres: item.multConvPres !== undefined ? String(item.multConvPres) : "",
      statusPagamento: item.statusPagamento || "Pendente",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleStatus = async (item: MetaRVV, newStatus: "Paga" | "Contestada") => {
    try {
      await updateDoc(doc(db, COLLECTIONS.META_RVV, item.id), {
        statusPagamento: newStatus,
        updatedAt: serverTimestamp(),
      });
      onToast(`Meta RVV marcada como ${newStatus}!`);
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao alterar status: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mesAno.trim()) {
      onToast("Informe o Mês/Ano.", "error");
      return;
    }

    const payload = {
      mesAno: formData.mesAno.trim(),
      realFinDig: Number(formData.realFinDig) || 0,
      metaFinDig: Number(formData.metaFinDig) || 0,
      atingDigPercent: Number(atingDigCalc.toFixed(2)),
      multDigi: Number(formData.multDigi) || 0,
      multConvDigi: Number(formData.multConvDigi) || 0,
      realFinPres: Number(formData.realFinPres) || 0,
      metaFinPres: Number(formData.metaFinPres) || 0,
      atingPresPercent: Number(atingPresCalc.toFixed(2)),
      multPres: Number(formData.multPres) || 0,
      multConvPres: Number(formData.multConvPres) || 0,
      totalMultiploRVV: Number(totalMultiploCalc.toFixed(2)),
      statusPagamento: formData.statusPagamento || "Pendente",
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.META_RVV, editingItem.id), payload);
        onToast("Meta RVV atualizada com sucesso!");
        setEditingItem(null);
      } else {
        // Look for existing record by mesAno to update instead of duplicate (same rule as Meta SM)
        const existing = metaRVV.find(
          (m) => m.mesAno?.trim().toLowerCase() === formData.mesAno.trim().toLowerCase()
        );

        if (existing) {
          await updateDoc(doc(db, COLLECTIONS.META_RVV, existing.id), payload);
          onToast("Meta RVV existente encontrada e atualizada com sucesso!");
        } else {
          await addDoc(collection(db, COLLECTIONS.META_RVV), {
            ...payload,
            createdAt: serverTimestamp(),
          });
          onToast("Meta RVV cadastrada com sucesso!");
        }
      }

      setFormData({
        mesAno: "",
        realFinDig: "",
        metaFinDig: "",
        multDigi: "",
        multConvDigi: "",
        realFinPres: "",
        metaFinPres: "",
        multPres: "",
        multConvPres: "",
        statusPagamento: "Pendente",
      });
    } catch (error: any) {
      console.error(error);
      onToast(`Erro ao salvar Meta RVV: ${error?.message || "Tente novamente"}`, "error");
    }
  };

  const handleExportExcel = () => {
    if (metaRVV.length === 0) {
      onToast("Nenhum dado disponível para exportar.", "error");
      return;
    }

    const dataToExport = metaRVV.map((m) => {
      const realDig = m.realFinDig || 0;
      const metaDig = m.metaFinDig || 0;
      const atingDig = m.atingDigPercent !== undefined ? m.atingDigPercent : (metaDig > 0 ? (realDig / metaDig) * 100 : 0);

      const realPres = m.realFinPres || 0;
      const metaPres = m.metaFinPres || 0;
      const atingPres = m.atingPresPercent !== undefined ? m.atingPresPercent : (metaPres > 0 ? (realPres / metaPres) * 100 : 0);

      const totalMult = m.totalMultiploRVV !== undefined
        ? m.totalMultiploRVV
        : (m.multDigi || 0) + (m.multConvDigi || 0) + (m.multPres || 0) + (m.multConvPres || 0);

      return {
        "Mês/Ano": m.mesAno || "",
        "Real Fin Dig": realDig,
        "Meta Fin Dig": metaDig,
        "Ating Dig %": Number(atingDig.toFixed(2)),
        "MULT DIGI": m.multDigi || 0,
        "MULT CONV DIGI": m.multConvDigi || 0,
        "Real Fin Pres": realPres,
        "Meta Fin Pres": metaPres,
        "Ating Pres %": Number(atingPres.toFixed(2)),
        "MULT Pres": m.multPres || 0,
        "MULT CONV Pres": m.multConvPres || 0,
        "ToTal Multiplo RVV": Number(totalMult.toFixed(2)),
        "Status Pagamento": m.statusPagamento || "Pendente",
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Metas RVV");
    XLSX.writeFile(wb, `metas_rvv_${new Date().toISOString().split("T")[0]}.xlsx`);
    onToast("Planilha de Metas RVV exportada com sucesso!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Mês/Ano": "03/2025",
        "Real Fin Dig": 120000,
        "Meta Fin Dig": 100000,
        "MULT DIGI": 1.5,
        "MULT CONV DIGI": 0.8,
        "Real Fin Pres": 180000,
        "Meta Fin Pres": 200000,
        "MULT Pres": 1.2,
        "MULT CONV Pres": 1.0,
        "Status Pagamento": "Paga",
      },
      {
        "Mês/Ano": "04/2025",
        "Real Fin Dig": 95000,
        "Meta Fin Dig": 110000,
        "MULT DIGI": 1.0,
        "MULT CONV DIGI": 0.6,
        "Real Fin Pres": 210000,
        "Meta Fin Pres": 190000,
        "MULT Pres": 1.5,
        "MULT CONV Pres": 1.1,
        "Status Pagamento": "Contestada",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Meta RVV");
    XLSX.writeFile(wb, "modelo_metas_rvv.xlsx");
    onToast("Modelo de Metas RVV baixado com sucesso!");
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
          const mesVal = row["Mês/Ano"] || row["Mes/Ano"] || row.mesAno || row.MesAno || row["MÊS/ANO"] || "";
          if (mesVal) {
            const mesTrim = String(mesVal).trim();
            const realFinDig = Number(row["Real Fin Dig"] || row.realFinDig || row["Real Digi"] || 0);
            const metaFinDig = Number(row["Meta Fin Dig"] || row.metaFinDig || row["Meta Digi"] || 0);
            const atingDigPercent = metaFinDig > 0 ? Number(((realFinDig / metaFinDig) * 100).toFixed(2)) : 0;

            const multDigi = Number(row["MULT DIGI"] || row.multDigi || row["Mult Digi"] || 0);
            const multConvDigi = Number(row["MULT CONV DIGI"] || row.multConvDigi || row["Mult Conv Digi"] || 0);

            const realFinPres = Number(row["Real Fin Pres"] || row.realFinPres || row["Real Pres"] || 0);
            const metaFinPres = Number(row["Meta Fin Pres"] || row.metaFinPres || row["Meta Pres"] || 0);
            const atingPresPercent = metaFinPres > 0 ? Number(((realFinPres / metaFinPres) * 100).toFixed(2)) : 0;

            const multPres = Number(row["MULT Pres"] || row.multPres || row["Mult Pres"] || 0);
            const multConvPres = Number(row["MULT CONV Pres"] || row.multConvPres || row["Mult Conv Pres"] || 0);

            const totalMultiploRVV = Number((multDigi + multConvDigi + multPres + multConvPres).toFixed(2));

            const rawStatus = String(row["Status Pagamento"] || row.statusPagamento || row.Status || "").trim().toLowerCase();
            const statusPagamento = rawStatus.includes("paga")
              ? "Paga"
              : rawStatus.includes("contest")
              ? "Contestada"
              : "Pendente";

            const existing = metaRVV.find(
              (m) => m.mesAno?.trim().toLowerCase() === mesTrim.toLowerCase()
            );

            const payload = {
              mesAno: mesTrim,
              realFinDig,
              metaFinDig,
              atingDigPercent,
              multDigi,
              multConvDigi,
              realFinPres,
              metaFinPres,
              atingPresPercent,
              multPres,
              multConvPres,
              totalMultiploRVV,
              statusPagamento,
              updatedAt: serverTimestamp(),
            };

            if (existing) {
              await updateDoc(doc(db, COLLECTIONS.META_RVV, existing.id), payload);
              countUpdated++;
            } else {
              await addDoc(collection(db, COLLECTIONS.META_RVV), {
                ...payload,
                createdAt: serverTimestamp(),
              });
              countAdded++;
            }
          }
        }

        const msg =
          countAdded > 0 && countUpdated > 0
            ? `${countAdded} novas metas RVV cadastradas e ${countUpdated} atualizadas!`
            : countAdded > 0
            ? `${countAdded} metas RVV importadas com sucesso!`
            : `${countUpdated} metas RVV atualizadas com sucesso!`;

        onToast(msg);
      } catch (err: any) {
        console.error("Erro ao importar planilha Meta RVV:", err);
        onToast(`Erro ao importar: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro de Meta RVV?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.META_RVV, id));
      onToast("Registro de Meta RVV excluído.");
    } catch (error) {
      console.error(error);
      onToast("Erro ao excluir.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Meses Registrados
            </span>
            <span className="text-2xl font-black text-slate-800">{kpis.totalRegistros}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Award size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total Múltiplo Acumulado
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {kpis.totalMultiplos.toFixed(2)}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Metas RVV Pagas
            </span>
            <span className="text-2xl font-black text-emerald-600">{kpis.pagas}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Metas RVV Contestadas
            </span>
            <span className="text-2xl font-black text-rose-600">{kpis.contestadas}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Main Section */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="text-blue-600" size={24} />
              Metas RVV
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Acompanhamento de metas financeiras, múltiplos e status de pagamento RVV (Digital & Presencial)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 bg-slate-50/30 border-b border-slate-100">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Linha 1: Mês/Ano e Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Mês/Ano *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 03/2025 ou Março/2025"
                  value={formData.mesAno}
                  onChange={(e) => setFormData({ ...formData, mesAno: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Status de Pagamento (Paga ou Contestada) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, statusPagamento: "Paga" })}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formData.statusPagamento === "Paga"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>Paga</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, statusPagamento: "Contestada" })}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formData.statusPagamento === "Contestada"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <AlertTriangle size={16} />
                    <span>Contestada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, statusPagamento: "Pendente" })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.statusPagamento === "Pendente"
                        ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>Pendente</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bloco Digital */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} /> Módulo Digital
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                  Atingimento Dig: {atingDigCalc.toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Real Fin Dig
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.realFinDig}
                    onChange={(e) => setFormData({ ...formData, realFinDig: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Meta Fin Dig
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.metaFinDig}
                    onChange={(e) => setFormData({ ...formData, metaFinDig: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    MULT DIGI
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={formData.multDigi}
                    onChange={(e) => setFormData({ ...formData, multDigi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    MULT CONV DIGI
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={formData.multConvDigi}
                    onChange={(e) => setFormData({ ...formData, multConvDigi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Bloco Presencial */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase text-purple-700 tracking-wider flex items-center gap-1.5">
                  <Award size={14} /> Módulo Presencial
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700">
                  Atingimento Pres: {atingPresCalc.toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Real Fin Pres
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.realFinPres}
                    onChange={(e) => setFormData({ ...formData, realFinPres: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Meta Fin Pres
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.metaFinPres}
                    onChange={(e) => setFormData({ ...formData, metaFinPres: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    MULT Pres
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={formData.multPres}
                    onChange={(e) => setFormData({ ...formData, multPres: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    MULT CONV Pres
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={formData.multConvPres}
                    onChange={(e) => setFormData({ ...formData, multConvPres: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>
            </div>

            {/* Totalizador e Ações */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/70 rounded-2xl px-5 py-3 flex items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Total Múltiplo RVV (Soma Automática)
                  </span>
                  <div className="text-xl font-black text-emerald-700">
                    {totalMultiploCalc.toFixed(2)}
                  </div>
                </div>
                <div className="text-[11px] text-emerald-700/80 font-medium">
                  DIGI ({multDigiVal}) + CONV DIGI ({multConvDigiVal}) + PRES ({multPresVal}) + CONV PRES ({multConvPresVal})
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setFormData({
                        mesAno: "",
                        realFinDig: "",
                        metaFinDig: "",
                        multDigi: "",
                        multConvDigi: "",
                        realFinPres: "",
                        metaFinPres: "",
                        multPres: "",
                        multConvPres: "",
                        statusPagamento: "Pendente",
                      });
                    }}
                    className="px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {editingItem ? <Edit2 size={16} /> : <Plus size={16} />}
                  <span>{editingItem ? "Atualizar Meta RVV" : "Cadastrar Meta RVV"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Mês/Ano</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Real Fin Dig</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Meta Fin Dig</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Ating Dig %</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Mult Digi</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Mult Conv Dig</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Real Fin Pres</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Meta Fin Pres</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Ating Pres %</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Mult Pres</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Mult Conv Pres</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-center font-black text-emerald-700">Total Multiplo RVV</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-center">Status Pagamento</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...(metaRVV || [])]
                .sort((a, b) => (b.mesAno || "").localeCompare(a.mesAno || ""))
                .map((item) => {
                  const realDig = item.realFinDig || 0;
                  const metaDig = item.metaFinDig || 0;
                  const atingDig = item.atingDigPercent !== undefined
                    ? item.atingDigPercent
                    : metaDig > 0 ? (realDig / metaDig) * 100 : 0;

                  const realPres = item.realFinPres || 0;
                  const metaPres = item.metaFinPres || 0;
                  const atingPres = item.atingPresPercent !== undefined
                    ? item.atingPresPercent
                    : metaPres > 0 ? (realPres / metaPres) * 100 : 0;

                  const totalMult = item.totalMultiploRVV !== undefined
                    ? item.totalMultiploRVV
                    : (item.multDigi || 0) + (item.multConvDigi || 0) + (item.multPres || 0) + (item.multConvPres || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-900">
                        {item.mesAno}
                      </td>

                      {/* Digital */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-700 font-medium">
                        {realDig.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {metaDig.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            atingDig >= 100
                              ? "bg-emerald-100 text-emerald-700"
                              : atingDig >= 80
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {atingDig.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-center text-slate-700 font-semibold">
                        {item.multDigi || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-slate-700 font-semibold">
                        {item.multConvDigi || 0}
                      </td>

                      {/* Presencial */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-700 font-medium">
                        {realPres.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {metaPres.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            atingPres >= 100
                              ? "bg-emerald-100 text-emerald-700"
                              : atingPres >= 80
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {atingPres.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-center text-slate-700 font-semibold">
                        {item.multPres || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-slate-700 font-semibold">
                        {item.multConvPres || 0}
                      </td>

                      {/* Total Múltiplo */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                          {totalMult.toFixed(2)}
                        </span>
                      </td>

                      {/* Botão para marcar se foi paga ou contestada */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, "Paga")}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              item.statusPagamento === "Paga"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-emerald-700 hover:bg-white"
                            }`}
                            title="Marcar como Paga"
                          >
                            <CheckCircle2 size={12} />
                            <span>Paga</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, "Contestada")}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              item.statusPagamento === "Contestada"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-rose-700 hover:bg-white"
                            }`}
                            title="Marcar como Contestada"
                          >
                            <AlertTriangle size={12} />
                            <span>Contestada</span>
                          </button>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors inline-flex mr-1 cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors inline-flex cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {(!metaRVV || metaRVV.length === 0) && (
                <tr>
                  <td colSpan={14} className="px-6 py-10 text-center text-slate-400">
                    Nenhuma Meta RVV cadastrada até o momento.
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
