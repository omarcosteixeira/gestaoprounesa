import React, { useState, useMemo } from "react";
import { IsencaoEntry, GapEntry, UserProfile } from "../types";
import { db, COLLECTIONS, OperationType, handleFirestoreError } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  ShieldCheck,
  Check,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  User,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";

interface IsencoesViewProps {
  isencoes: IsencaoEntry[];
  gap: GapEntry[];
  onToast: (m: string, t?: "success" | "error") => void;
  profile: UserProfile;
}

export function IsencoesView({
  isencoes,
  gap,
  onToast,
  profile,
}: IsencoesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [digitalizaFilter, setDigitalizaFilter] = useState<string>("");
  const [boletoFilter, setBoletoFilter] = useState<string>("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IsencaoEntry | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal Sem Interesse State
  const [resultadoModalState, setResultadoModalState] = useState<{
    isOpen: boolean;
    isencaoId: string | null;
    observacao: string;
  }>({
    isOpen: false,
    isencaoId: null,
    observacao: "",
  });

  // Form State
  const [formNome, setFormNome] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formOportunidade, setFormOportunidade] = useState("");
  const [formCurso, setFormCurso] = useState("");
  const [formCursoOrigem, setFormCursoOrigem] = useState("");
  const [formUniversidadeOrigem, setFormUniversidadeOrigem] = useState("");
  const [formFormaIngresso, setFormFormaIngresso] = useState("");
  const [formDigitaliza, setFormDigitaliza] = useState<"Sim" | "Não">("Não");
  const [formStatus, setFormStatus] = useState<"Pendente" | "Solicitado" | "Deferido">("Pendente");
  const [formBoletoPago, setFormBoletoPago] = useState(false);

  const openAddModal = () => {
    setEditingEntry(null);
    setFormNome("");
    setFormCpf("");
    setFormTelefone("");
    setFormOportunidade("");
    setFormCurso("");
    setFormCursoOrigem("");
    setFormUniversidadeOrigem("");
    setFormFormaIngresso("");
    setFormDigitaliza("Não");
    setFormStatus("Pendente");
    setFormBoletoPago(false);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: IsencaoEntry) => {
    setEditingEntry(entry);
    setFormNome(entry.nome || "");
    setFormCpf(entry.cpf || "");
    setFormTelefone(entry.telefone || "");
    setFormOportunidade(entry.numeroOportunidade || "");
    setFormCurso(entry.curso || "");
    setFormCursoOrigem(entry.cursoOrigem || "");
    setFormUniversidadeOrigem(entry.universidadeOrigem || "");
    setFormFormaIngresso(entry.formaIngresso || "");
    setFormDigitaliza(entry.inseridoDigitaliza || "Não");
    setFormStatus(entry.status || "Pendente");
    setFormBoletoPago(entry.boletoPago || false);
    setIsModalOpen(true);
  };

  // Automatically handles copying data to GAP Academic when "Boleto Pago" is marked
  const ensureCopiedToGap = async (entryData: {
    nome: string;
    cpf: string;
    telefone: string;
    numeroOportunidade?: string;
    curso: string;
  }) => {
    try {
      // 1. Format CPF to search for existing duplicates in current GAP state or database
      const cleanCpf = entryData.cpf.replace(/\D/g, "");
      const existsInGap = gap.some(
        (g) => (g.cpf || "").replace(/\D/g, "") === cleanCpf
      );

      if (existsInGap) {
        onToast("Candidato já está cadastrado no GAP Acadêmico.", "error");
        return;
      }

      // 2. Add to GAP Academic collection
      await addDoc(collection(db, COLLECTIONS.GAP), {
        nome: entryData.nome,
        cpf: entryData.cpf,
        telefone: entryData.telefone,
        produto: "Graduação", // Default fallback
        numeroOportunidade: entryData.numeroOportunidade || "",
        curso: entryData.curso,
        metodologia: "Isenção", // Metodologia default or placeholder
        formaIngresso: "Isenção",
        matAcad: false,
        documentos: {},
        unidade: profile.unidade || "",
        createdAt: serverTimestamp(),
      });
      onToast("Boleto Pago! Dados enviados automaticamente para o GAP Acadêmico.", "success");
    } catch (err) {
      console.error("Erro ao enviar dados para o GAP:", err);
      onToast("Erro ao sincronizar com GAP Acadêmico.", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome || !formCpf || !formTelefone || !formCurso) {
      onToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    setLoading(true);
    const entryData = {
      nome: formNome.trim(),
      cpf: formCpf.trim(),
      telefone: formTelefone.trim(),
      numeroOportunidade: formOportunidade.trim(),
      curso: formCurso.trim(),
      cursoOrigem: formCursoOrigem.trim(),
      universidadeOrigem: formUniversidadeOrigem.trim(),
      formaIngresso: formFormaIngresso.trim(),
      inseridoDigitaliza: formDigitaliza,
      status: formStatus,
      boletoPago: formBoletoPago,
      unidade: profile.unidade || "",
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingEntry) {
        // Edit flow
        const wasBoletoPago = editingEntry.boletoPago;
        await updateDoc(doc(db, COLLECTIONS.ISENCOES, editingEntry.id), entryData);
        onToast("Isenção atualizada com sucesso!", "success");

        // If it was toggled to paid, copy to GAP
        if (formBoletoPago && !wasBoletoPago) {
          await ensureCopiedToGap(entryData);
        }
      } else {
        // Create flow
        const newDoc = await addDoc(collection(db, COLLECTIONS.ISENCOES), {
          ...entryData,
          createdAt: serverTimestamp(),
          createdByNome: profile.name || profile.email || "Usuário Desconhecido",
        });
        onToast("Isenção cadastrada com sucesso!", "success");

        if (formBoletoPago) {
          await ensureCopiedToGap(entryData);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.ISENCOES);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este registro de isenção?")) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.ISENCOES, id));
        onToast("Registro excluído com sucesso!", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, COLLECTIONS.ISENCOES);
      }
    }
  };

  const handleToggleStatus = async (entry: IsencaoEntry, newStatus: "Pendente" | "Solicitado" | "Deferido") => {
    try {
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, entry.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      onToast(`Status alterado para ${newStatus}!`, "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, COLLECTIONS.ISENCOES);
    }
  };

  const handleToggleResultado = async (
    item: IsencaoEntry,
    resultado: "Convertido" | "Sem interesse"
  ) => {
    if (resultado === "Sem interesse") {
      setResultadoModalState({
        isOpen: true,
        isencaoId: item.id,
        observacao: item.observacaoResultado || "",
      });
      return;
    }

    try {
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, item.id), {
        resultado: resultado,
        observacaoResultado: null,
        updatedAt: serverTimestamp(),
      });
      onToast("Resultado atualizado para Convertido!", "success");
    } catch (error) {
      console.error(error);
      onToast("Erro ao atualizar resultado.", "error");
    }
  };

  const handleSaveSemInteresse = async () => {
    if (!resultadoModalState.isencaoId) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, resultadoModalState.isencaoId), {
        resultado: "Sem interesse",
        observacaoResultado: resultadoModalState.observacao,
        updatedAt: serverTimestamp(),
      });
      onToast("Observação salva com sucesso!", "success");
      setResultadoModalState({ isOpen: false, isencaoId: null, observacao: "" });
    } catch (error) {
      console.error(error);
      onToast("Erro ao salvar observação.", "error");
    }
  };

  const handleToggleBoleto = async (entry: IsencaoEntry) => {
    try {
      const nextBoletoStatus = !entry.boletoPago;
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, entry.id), {
        boletoPago: nextBoletoStatus,
        updatedAt: serverTimestamp(),
      });

      onToast(`Boleto marcado como ${nextBoletoStatus ? "Pago" : "Pendente"}!`, "success");

      if (nextBoletoStatus) {
        await ensureCopiedToGap({
          nome: entry.nome,
          cpf: entry.cpf,
          telefone: entry.telefone,
          numeroOportunidade: entry.numeroOportunidade,
          curso: entry.curso,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, COLLECTIONS.ISENCOES);
    }
  };

  // Filter & Search Logic
  const filteredIsencoes = useMemo(() => {
    return isencoes.filter((item) => {
      // Gestor Unidade filtering: only see actions from the same unit
      if (profile.role === "Gestor Unidade") {
        if (!profile.unidade || item.unidade !== profile.unidade) {
          return false;
        }
      }

      const matchSearch =
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cpf?.includes(searchTerm) ||
        item.telefone?.includes(searchTerm);

      const matchStatus = !statusFilter || item.status === statusFilter;
      const matchDigitaliza = !digitalizaFilter || item.inseridoDigitaliza === digitalizaFilter;
      const matchBoleto =
        !boletoFilter ||
        (boletoFilter === "Sim" && item.boletoPago) ||
        (boletoFilter === "Não" && !item.boletoPago);

      return matchSearch && matchStatus && matchDigitaliza && matchBoleto;
    });
  }, [isencoes, searchTerm, statusFilter, digitalizaFilter, boletoFilter]);

  // Status Stats counters
  const stats = useMemo(() => {
    const total = isencoes.length;
    const pendente = isencoes.filter((i) => i.status === "Pendente").length;
    const solicitado = isencoes.filter((i) => i.status === "Solicitado").length;
    const deferido = isencoes.filter((i) => i.status === "Deferido").length;
    const convertido = isencoes.filter((i) => i.resultado === "Convertido").length;
    const boletoPago = isencoes.filter((i) => i.boletoPago).length;

    return { total, pendente, solicitado, deferido, convertido, boletoPago };
  }, [isencoes]);

  // EXPORT TO EXCEL
  const handleExportExcel = () => {
    if (filteredIsencoes.length === 0) {
      onToast("Não existem dados para exportar.", "error");
      return;
    }

    const dataToExport = filteredIsencoes.map((item) => ({
      Nome: item.nome,
      CPF: item.cpf,
      Telefone: item.telefone,
      Oportunidade: item.numeroOportunidade || "",
      "Curso Interesse": item.curso,
      "Curso Origem": item.cursoOrigem || "",
      "Universidade Origem": item.universidadeOrigem || "",
      "Forma de Ingresso": item.formaIngresso || "",
      Digitaliza: item.inseridoDigitaliza,
      Status: item.status,
      "Boleto Pago": item.boletoPago ? "Sim" : "Não",
      Resultado: item.resultado || "",
      Observacao: item.observacaoResultado || "",
      Unidade: item.unidade || "",
      CriadoPor: item.createdByNome || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Isencoes");

    XLSX.writeFile(
      workbook,
      `Isencoes_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    onToast("Excel exportado com sucesso!", "success");
  };

  // EXCEL TEMPLATE DOWNLOAD
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Nome: "João da Silva",
        CPF: "123.456.789-00",
        Telefone: "(11) 99999-9999",
        Oportunidade: "12345",
        "Curso Interesse": "Direito",
        "Curso Origem": "Administração",
        "Universidade Origem": "Estácio",
        Digitaliza: "Não",
        Status: "Pendente",
        "Boleto Pago": "Não",
        Unidade: "Sede",
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo Importação");

    XLSX.writeFile(workbook, `Modelo_Isencoes.xlsx`);
    onToast("Modelo baixado com sucesso!", "success");
  };

  // IMPORT FROM EXCEL
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawData || rawData.length === 0) {
          onToast(
            "O arquivo Excel correspondente está vazio ou em formato inválido.",
            "error",
          );
          return;
        }

        let importedCount = 0;
        setLoading(true);

        for (const row of rawData) {
          const nome = row["Nome"] || row["nome"];
          const cpf = row["CPF"] || row["cpf"];
          const telefone = row["Telefone"] || row["telefone"];
          const curso = row["Curso Interesse"] || row["curso"] || row["Curso"];
          
          if (!nome || !cpf || !telefone || !curso) continue;

          let statusRaw = row["Status"] || row["status"] || "Pendente";
          let status: "Pendente" | "Solicitado" | "Deferido" = "Pendente";
          if (["Pendente", "Solicitado", "Deferido"].includes(statusRaw)) {
             status = statusRaw as any;
          }

          let digitalizaRaw = row["Digitaliza"] || row["digitaliza"] || "Não";
          let digitaliza: "Sim" | "Não" = "Não";
          if (["Sim", "Não"].includes(digitalizaRaw)) {
             digitaliza = digitalizaRaw as any;
          }

          let boletoRaw = row["Boleto Pago"] || row["boleto pago"] || row["BoletoPago"] || "Não";
          let boletoPago = boletoRaw === "Sim";

          const unidadeRaw = row["Unidade"] || row["unidade"];

          const isencaoData = {
            nome: String(nome).trim(),
            cpf: String(cpf).trim(),
            telefone: String(telefone).trim(),
            numeroOportunidade: String(row["Oportunidade"] || row["oportunidade"] || "").trim(),
            curso: String(curso).trim(),
            cursoOrigem: String(row["Curso Origem"] || row["curso origem"] || "").trim(),
            universidadeOrigem: String(row["Universidade Origem"] || row["universidade origem"] || "").trim(),
            inseridoDigitaliza: digitaliza,
            status,
            boletoPago,
            unidade: profile.role === "Gestor Unidade" ? (profile.unidade || "") : (unidadeRaw ? String(unidadeRaw).trim() : (profile.unidade || "")),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdByNome: profile.name || profile.email || "Usuário Desconhecido",
          };

          await addDoc(collection(db, COLLECTIONS.ISENCOES), isencaoData);
          importedCount++;
          
          if (boletoPago) {
             try {
                const cleanCpf = isencaoData.cpf.replace(/\D/g, "");
                const existsInGap = gap.some(
                  (g) => (g.cpf || "").replace(/\D/g, "") === cleanCpf
                );
          
                if (!existsInGap) {
                  await addDoc(collection(db, COLLECTIONS.GAP), {
                    nome: isencaoData.nome,
                    cpf: isencaoData.cpf,
                    telefone: isencaoData.telefone,
                    produto: "Graduação",
                    numeroOportunidade: isencaoData.numeroOportunidade || "",
                    curso: isencaoData.curso,
                    metodologia: "Isenção",
                    formaIngresso: "Isenção",
                    matAcad: false,
                    documentos: {},
                    unidade: isencaoData.unidade,
                    createdAt: serverTimestamp(),
                  });
                }
             } catch (e) {
                console.error("Failed to copy imported isencao to gap", e);
             }
          }
        }

        if (importedCount > 0) {
          onToast(`${importedCount} isenções importadas com sucesso!`, "success");
        } else {
          onToast(
            "Nenhuma isenção válida encontrada. Verifique as colunas obrigatórias (Nome, CPF, Telefone, Curso Interesse).",
            "error",
          );
        }
      } catch (error) {
        console.error("Erro na importação:", error);
        onToast("Erro ao importar o arquivo Excel.", "error");
      } finally {
        setLoading(false);
        // Reset file input
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6" id="isencoes-tracking-container">
      {/* Header and top metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={28} />
            Acompanhamento de Isenções
          </h2>
          <p className="text-sm text-slate-500">
            Gerencie o status e o pagamento de isenções acadêmicas integradas ao GAP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
            title="Exportar para Excel"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          
          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Importar Excel"
            />
            <button
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
              title="Importar de Excel"
            >
              <Upload size={20} />
              <span className="hidden sm:inline">Importar</span>
            </button>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
            title="Baixar Modelo de Excel"
          >
            <FileText size={20} />
            <span className="hidden md:inline">Modelo</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            Nova Isenção
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
          <span className="text-2xl font-black text-slate-800 mt-2">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-xs font-bold text-amber-500 uppercase">Pendentes</span>
          <span className="text-2xl font-black text-amber-600 mt-2">{stats.pendente}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-blue-500">
          <span className="text-xs font-bold text-blue-500 uppercase">Solicitados</span>
          <span className="text-2xl font-black text-blue-600 mt-2">{stats.solicitado}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-xs font-bold text-emerald-500 uppercase">Deferidos</span>
          <span className="text-2xl font-black text-emerald-600 mt-2">{stats.deferido}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-purple-500">
          <span className="text-xs font-bold text-purple-500 uppercase">Boleto Pago</span>
          <span className="text-2xl font-black text-purple-600 mt-2">{stats.boletoPago}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-600 col-span-2 lg:col-span-1">
          <span className="text-xs font-bold text-emerald-600 uppercase">Convertidos</span>
          <span className="text-2xl font-black text-emerald-700 mt-2">{stats.convertido}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">Status: Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Solicitado">Solicitado</option>
              <option value="Deferido">Deferido</option>
            </select>
          </div>

          <div>
            <select
              value={digitalizaFilter}
              onChange={(e) => setDigitalizaFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">No Digitaliza: Todos</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>

          <div>
            <select
              value={boletoFilter}
              onChange={(e) => setBoletoFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">Boleto Pago: Todos</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Candidato</th>
                <th className="p-4">CPF / Telefone</th>
                <th className="p-4">Oportunidade</th>
                <th className="p-4">Curso Interesse (Estácio)</th>
                <th className="p-4">Origem (Curso/IES)</th>
                <th className="p-4">Forma de Ingresso</th>
                <th className="p-4 text-center">Digitaliza</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Boleto Pago</th>
                <th className="p-4 text-center">Resultado</th>
                <th className="p-4 text-center">Ações Rápidas</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredIsencoes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    Nenhuma isenção cadastrada ou compatível com os filtros.
                  </td>
                </tr>
              ) : (
                filteredIsencoes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.nome}</div>
                      {item.createdByNome && (
                        <div className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1 bg-slate-100 w-fit px-1.5 py-0.5 rounded">
                          <User size={10} /> {item.createdByNome}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs">{item.cpf}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.telefone}</div>
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-xs">
                      {item.numeroOportunidade || "—"}
                    </td>
                    <td className="p-4 text-slate-600 max-w-[200px] truncate">{item.curso}</td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs font-bold text-slate-700">{item.cursoOrigem || "—"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.universidadeOrigem || "—"}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs font-medium text-slate-700">{item.formaIngresso || "—"}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-1 rounded-full text-xs font-bold",
                          item.inseridoDigitaliza === "Sim"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        )}
                      >
                        {item.inseridoDigitaliza}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-1 rounded-full text-xs font-bold",
                          item.status === "Deferido" && "bg-emerald-100 text-emerald-800",
                          item.status === "Solicitado" && "bg-blue-100 text-blue-800",
                          item.status === "Pendente" && "bg-amber-100 text-amber-800"
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleBoleto(item)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all",
                          item.boletoPago
                            ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {item.boletoPago ? (
                          <>
                            <CheckCircle size={14} />
                            Pago
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            Pendente
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => handleToggleResultado(item, "Convertido")}
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all w-full",
                            item.resultado === "Convertido"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Convertido
                        </button>
                        <button
                          onClick={() => handleToggleResultado(item, "Sem interesse")}
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all w-full",
                            item.resultado === "Sem interesse"
                              ? "bg-rose-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Sem interesse
                        </button>
                      </div>
                      {item.resultado === "Sem interesse" && item.observacaoResultado && (
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate mx-auto" title={item.observacaoResultado}>
                          {item.observacaoResultado}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(item, "Pendente")}
                          title="Marcar como Pendente"
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                            item.status === "Pendente"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Pendente
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item, "Solicitado")}
                          title="Marcar como Solicitado"
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                            item.status === "Solicitado"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Solicitado
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item, "Deferido")}
                          title="Marcar como Deferido"
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                            item.status === "Deferido"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Deferido
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation and Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck size={22} className="text-blue-600" />
                {editingEntry ? "Editar Isenção" : "Cadastrar Isenção"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Nome do candidato"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: 000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: (00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nº da Oportunidade (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formOportunidade}
                    onChange={(e) => setFormOportunidade(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: 12345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Curso de Interesse na Estácio *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCurso}
                    onChange={(e) => setFormCurso(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Direito"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Curso de Origem (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formCursoOrigem}
                    onChange={(e) => setFormCursoOrigem(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Administração"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Universidade de Origem (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formUniversidadeOrigem}
                    onChange={(e) => setFormUniversidadeOrigem(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: IES de Origem"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Forma de Ingresso (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formFormaIngresso}
                    onChange={(e) => setFormFormaIngresso(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Transferência Externa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Inserido no Digitaliza?
                  </label>
                  <select
                    value={formDigitaliza}
                    onChange={(e) => setFormDigitaliza(e.target.value as "Sim" | "Não")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Status da Isenção
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Pendente" | "Solicitado" | "Deferido")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Solicitado">Solicitado</option>
                    <option value="Deferido">Deferido</option>
                  </select>
                </div>
              </div>

              {/* Boleto Pago toggle card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-700">Boleto Pago</h4>
                  <p className="text-xs text-slate-400 max-w-[280px]">
                    Se marcado, os dados do candidato serão enviados automaticamente ao GAP Acadêmico.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formBoletoPago}
                  onChange={(e) => setFormBoletoPago(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sem Interesse */}
      {resultadoModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Motivo - Sem interesse
              </h3>
              <button
                onClick={() => setResultadoModalState({ isOpen: false, isencaoId: null, observacao: "" })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Observação <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={resultadoModalState.observacao}
                  onChange={(e) => setResultadoModalState(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Por que o candidato não tem interesse?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-24"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setResultadoModalState({ isOpen: false, isencaoId: null, observacao: "" })}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSemInteresse}
                disabled={!resultadoModalState.observacao.trim()}
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
