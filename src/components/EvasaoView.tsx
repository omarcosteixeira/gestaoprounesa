import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../firebase";
import { EvasaoRecord, UserProfile } from "../types";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  PieChart,
  BarChart3,
  Filter,
  Download,
  Upload,
  TrendingUp
} from "lucide-react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from "recharts";
import { exportToExcel, importFromExcel } from "./CursosDisponiveisView";

interface EvasaoViewProps {
  profile: UserProfile | null;
  onToast: (message: string, type?: "success" | "error") => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function EvasaoView({ profile, onToast }: EvasaoViewProps) {
  const [data, setData] = useState<EvasaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalidadeFilter, setModalidadeFilter] = useState("Todas");
  const [periodoFilter, setPeriodoFilter] = useState("Todos");
  const [tipoSolicitacaoFilter, setTipoSolicitacaoFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [resultadoFilter, setResultadoFilter] = useState("Todos");
  const [dataInicioFilter, setDataInicioFilter] = useState("");
  const [dataFimFilter, setDataFimFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EvasaoRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<EvasaoRecord>>({
    atendimento: "",
    tipoAtendimento: "",
    horario: "",
    unidade: profile?.unidade || "",
    modalidade: "",
    matricula: "",
    curso: "",
    safra: "",
    nome: "",
    contato: "",
    status: "",
    pendencia: "",
      multa: "",
      instituicaoDestino: "",
    resultado: "",
    trancamentoCancelamento: "",
    periodo: "",
    tipoSolicitacao: "",
    observacao: "",
    parcelaLeve: "",
    mensalidades: "",
    parcelamento: "",
  });

  useEffect(() => {
    if (!profile) return;

    const isPrincipalServer = ((localStorage.getItem("servidor_selected") as string) || "principal") === "principal";
    const isRestricted = 
      (!isPrincipalServer || profile?.role !== "SSA") &&
      profile?.role !== "Admin Master" && 
      profile?.role !== "Gestor Comercial" && 
      profile?.role !== "Gerente Comercial (Comercial)" &&
      !["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"].includes(profile?.email || "");

    let q = query(
      collection(db, COLLECTIONS.EVASAO)
    );

    if (isRestricted) {
      q = query(q, where("unidade", "==", profile?.unidade || "Matriz"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EvasaoRecord));
      setData(docs);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar evasões:", error);
      onToast("Erro ao carregar os dados", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const uniquePeriodos = useMemo(() => {
    const periodos = data
      .map(item => item.periodo)
      .filter((p): p is string => !!p);
    return Array.from(new Set(periodos)).sort();
  }, [data]);

  const uniqueStatus = useMemo(() => {
    const statuses = data
      .map(item => item.status)
      .filter((s): s is string => !!s);
    return Array.from(new Set(statuses)).sort();
  }, [data]);

  const uniqueResultados = useMemo(() => {
    const resultados = data
      .map(item => item.resultado)
      .filter((r): r is string => !!r);
    return Array.from(new Set(resultados)).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let filtered = data;
    
    // Gestor Unidade filtering
    if (profile?.role === "Gestor Unidade" && profile?.unidade) {
      filtered = filtered.filter(item => item.unidade === profile.unidade);
    }

    if (modalidadeFilter !== "Todas") {
      filtered = filtered.filter(item => item.modalidade === modalidadeFilter);
    }

    if (periodoFilter !== "Todos") {
      filtered = filtered.filter(item => item.periodo === periodoFilter);
    }

    if (tipoSolicitacaoFilter !== "Todos") {
      filtered = filtered.filter(item => item.tipoSolicitacao === tipoSolicitacaoFilter);
    }

    if (statusFilter !== "Todos") {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (resultadoFilter !== "Todos") {
      filtered = filtered.filter(item => item.resultado === resultadoFilter);
    }

    if (dataInicioFilter) {
      filtered = filtered.filter(item => {
        if (!item.atendimento) return false;
        return item.atendimento >= dataInicioFilter;
      });
    }

    if (dataFimFilter) {
      filtered = filtered.filter(item => {
        if (!item.atendimento) return false;
        return item.atendimento <= dataFimFilter;
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.nome.toLowerCase().includes(lower) ||
        item.matricula.toLowerCase().includes(lower) ||
        item.curso.toLowerCase().includes(lower) ||
        (item.periodo && item.periodo.toLowerCase().includes(lower)) ||
        (item.tipoSolicitacao && item.tipoSolicitacao.toLowerCase().includes(lower))
      );
    }

    return filtered.sort((a, b) => {
      // Primary sort: atendimento date (YYYY-MM-DD) + time (HH:mm)
      const atendA = (a.atendimento || "") + " " + (a.horario || "");
      const atendB = (b.atendimento || "") + " " + (b.horario || "");
      if (atendA !== atendB) {
        return atendA.localeCompare(atendB);
      }

      // Secondary sort: createdAt
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [data, profile, modalidadeFilter, periodoFilter, tipoSolicitacaoFilter, statusFilter, resultadoFilter, searchTerm, dataInicioFilter, dataFimFilter]);

  // Top 5 Cursos
  const topCursos = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      if (!d.curso) return;
      counts[d.curso] = (counts[d.curso] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // Top 5 Motivos (Trancamento/Cancelamento)
  const topMotivos = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      if (!d.trancamentoCancelamento) return;
      counts[d.trancamentoCancelamento] = (counts[d.trancamentoCancelamento] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // Evasão por Safra
  const evasaoPorSafra = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const safra = d.safra || "Não informada";
      counts[safra] = (counts[safra] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Evasão por Modalidade
  const evasaoPorModalidade = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const modalidade = d.modalidade || "Não informada";
      counts[modalidade] = (counts[modalidade] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Tendência Mensal
  const trendMensal = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      if (!d.atendimento) return;
      // d.atendimento is usually YYYY-MM-DD
      const parts = d.atendimento.split('-');
      if (parts.length >= 2) {
        const key = `${parts[1]}/${parts[0]}`; // MM/YYYY
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    // sort keys by year then month
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const [m1, y1] = a.name.split('/');
        const [m2, y2] = b.name.split('/');
        if (y1 !== y2) return parseInt(y1) - parseInt(y2);
        return parseInt(m1) - parseInt(m2);
      });
  }, [filteredData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMat = (formData.matricula || "").trim().toLowerCase();
    const cleanNome = (formData.nome || "").trim().toLowerCase();
    const cleanAtend = (formData.atendimento || "").trim();

    const isDuplicate = data.some((item) => {
      if (editingEntry && item.id === editingEntry.id) return false;
      const matchMat = cleanMat && (item.matricula || "").trim().toLowerCase() === cleanMat;
      const matchNome = cleanNome && (item.nome || "").trim().toLowerCase() === cleanNome;
      const matchAtend = cleanAtend && (item.atendimento || "").trim() === cleanAtend;
      return (matchMat || matchNome) && matchAtend;
    });

    if (isDuplicate) {
      onToast("Já existe um registro de evasão cadastrado para este Aluno/Matrícula nesta Data de Atendimento!", "error");
      return;
    }

    try {
      if (editingEntry) {
        await updateDoc(doc(db, COLLECTIONS.EVASAO, editingEntry.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        onToast("Registro atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, COLLECTIONS.EVASAO), {
          ...formData,
          createdAt: serverTimestamp()
        });
        onToast("Registro criado com sucesso!", "success");
      }
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      onToast("Erro ao salvar registro", "error");
    }
  };

  const handleEdit = (entry: EvasaoRecord) => {
    setEditingEntry(entry);
    setFormData(entry);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este registro?")) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.EVASAO, id));
        onToast("Registro excluído com sucesso", "success");
      } catch (error) {
        console.error("Erro ao excluir:", error);
        onToast("Erro ao excluir", "error");
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setFormData({
      atendimento: "",
      tipoAtendimento: "",
      horario: "",
      unidade: profile?.unidade || "",
      modalidade: "",
      matricula: "",
      curso: "",
      safra: "",
      nome: "",
      contato: "",
      status: "",
      pendencia: "",
      multa: "",
      instituicaoDestino: "",
      resultado: "",
      trancamentoCancelamento: "",
      periodo: "",
      tipoSolicitacao: "",
      observacao: "",
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      onToast("Não há dados para exportar", "error");
      return;
    }
    const exportData = filteredData.map(item => ({
      "Atendimento": item.atendimento || "",
      "Tipo de Atendimento": item.tipoAtendimento || "",
      "Horário": item.horario || "",
      "Unidade": item.unidade || "",
      "Modalidade": item.modalidade || "",
      "Matrícula": item.matricula || "",
      "Curso": item.curso || "",
      "Safra": item.safra || "",
      "Nome": item.nome || "",
      "Contato": item.contato || "",
      "Status": item.status || "",
      "Pendência": item.pendencia || "",
      "Multa": item.multa || "",
      "Instituição Destino": item.instituicaoDestino || "",
      "Resultado": item.resultado || "",
      "Trancamento/Cancelamento": item.trancamentoCancelamento || "",
      "Período": item.periodo || "",
      "Tipo de Solicitação": item.tipoSolicitacao || "",
      "Observação": item.observacao || "",
      "Parcela Leve": item.parcelaLeve || "",
      "Mensalidades": item.mensalidades || "",
      "Parcelamento": item.parcelamento || ""

    }));
    exportToExcel(exportData, `Evasao_${new Date().getTime()}`);
    onToast("Excel exportado com sucesso!", "success");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importFromExcel(file, async (importedData) => {
      try {
        let count = 0;
        let skippedCount = 0;
        const insertedKeys = new Set<string>();

        for (const row of importedData) {
          if (!row["Nome"] && !row["Matrícula"]) continue;
          
          const mat = String(row["Matrícula"] || row["matricula"] || "").trim();
          const nome = String(row["Nome"] || row["nome"] || "").trim();
          const atend = String(row["Atendimento"] || row["atendimento"] || "").trim();

          const key = `${mat.toLowerCase()}|${nome.toLowerCase()}|${atend}`;
          const isDup =
            data.some((item) => {
              const matchMat = mat && (item.matricula || "").trim().toLowerCase() === mat.toLowerCase();
              const matchNome = nome && (item.nome || "").trim().toLowerCase() === nome.toLowerCase();
              const matchAtend = atend && (item.atendimento || "").trim() === atend;
              return (matchMat || matchNome) && matchAtend;
            }) || insertedKeys.has(key);

          if (isDup) {
            skippedCount++;
            continue;
          }

          await addDoc(collection(db, COLLECTIONS.EVASAO), {
            atendimento: atend,
            tipoAtendimento: String(row["Tipo de Atendimento"] || ""),
            horario: String(row["Horário"] || ""),
            unidade: String(row["Unidade"] || profile?.unidade || ""),
            modalidade: String(row["Modalidade"] || ""),
            matricula: mat,
            curso: String(row["Curso"] || ""),
            safra: String(row["Safra"] || ""),
            nome: nome,
            contato: String(row["Contato"] || ""),
            status: String(row["Status"] || ""),
            pendencia: String(row["Pendência"] || ""),
            multa: String(row["Multa"] || ""),
            instituicaoDestino: String(row["Instituição Destino"] || row["Instituição destino"] || ""),
            resultado: String(row["Resultado"] || ""),
            trancamentoCancelamento: String(row["Trancamento/Cancelamento"] || ""),
            periodo: String(row["Período"] || row["Periodo"] || ""),
            tipoSolicitacao: String(row["Tipo de Solicitação"] || row["Tipo de solicitação"] || ""),
            observacao: String(row["Observação"] || ""),
            parcelaLeve: String(row["Parcela Leve"] || row["parcelaLeve"] || ""),
            mensalidades: String(row["Mensalidades"] || row["mensalidades"] || ""),
            parcelamento: String(row["Parcelamento"] || row["parcelamento"] || ""),

            createdAt: serverTimestamp(),
          });
          insertedKeys.add(key);
          count++;
        }
        onToast(
          `${count} registros importados com sucesso!${skippedCount > 0 ? ` (${skippedCount} duplicatas ignoradas)` : ""}`,
          count > 0 ? "success" : "error"
        );
      } catch (error) {
        console.error("Erro na importação:", error);
        onToast("Erro ao importar dados.", "error");
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando dados...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Evasão</h1>
          <p className="text-slate-500">Gestão de trancamentos e cancelamentos de matrículas.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200"
            title="Importar Excel"
          >
            <Upload size={20} />
            <span className="hidden md:inline font-bold">Importar</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200"
            title="Exportar para Excel"
          >
            <Download size={20} />
            <span className="hidden md:inline font-bold">Exportar</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-bold flex-1 md:flex-none"
          >
            <Plus size={20} />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>


      <div className="space-y-6">
        {/* Tendência Mensal */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Tendência Mensal de Evasão
          </h3>
          {trendMensal.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendMensal} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} name="Evasões" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Nenhum dado disponível.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Cursos Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-emerald-500" />
              Top 5 Cursos com Evasão
            </h3>
            {topCursos.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCursos} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <ReTooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                      {topCursos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                Nenhum dado disponível.
              </div>
            )}
          </div>

          {/* Top Motivos Chart (Pie) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-purple-500" />
              Distribuição dos Motivos
            </h3>
            {topMotivos.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={topMotivos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {topMotivos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                Nenhum dado disponível.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Evasão por Safra */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-indigo-500" />
              Evasão por Safra
            </h3>
            {evasaoPorSafra.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={evasaoPorSafra}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {evasaoPorSafra.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                Nenhum dado disponível.
              </div>
            )}
          </div>

          {/* Evasão por Modalidade */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-orange-500" />
              Evasão por Modalidade
            </h3>
            {evasaoPorModalidade.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={evasaoPorModalidade}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {evasaoPorModalidade.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                Nenhum dado disponível.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, matrícula ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Filter size={20} className="text-slate-400" />
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">De:</span>
              <input
                type="date"
                value={dataInicioFilter}
                onChange={(e) => setDataInicioFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
              <span className="text-sm font-medium text-slate-500">Até:</span>
              <input
                type="date"
                value={dataFimFilter}
                onChange={(e) => setDataFimFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>

            {/* Modalidade Filter */}
            <select
              value={modalidadeFilter}
              onChange={(e) => setModalidadeFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todas">Todas Modalidades</option>
              <option value="Presencial">Presencial</option>
              <option value="DIGITAL">DIGITAL</option>
              <option value="Semipresencial">Semipresencial</option>
            </select>

            {/* Período Filter */}
            <select
              value={periodoFilter}
              onChange={(e) => setPeriodoFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todos">Todos Períodos</option>
              {uniquePeriodos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Tipo de Solicitação Filter */}
            <select
              value={tipoSolicitacaoFilter}
              onChange={(e) => setTipoSolicitacaoFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todos">Todos Tipos</option>
              <option value="Trancamento">Trancamento</option>
              <option value="Cancelamento">Cancelamento</option>
              <option value="Transferência externa">Transferência externa</option>
            </select>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todos">Todos Status</option>
              {uniqueStatus.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {/* Resultado Filter */}
            <select
              value={resultadoFilter}
              onChange={(e) => setResultadoFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todos">Todos Resultados</option>
              {uniqueResultados.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-bold">Data Atend.</th>
                <th className="p-4 font-bold">Unidade</th>
                <th className="p-4 font-bold">Aluno</th>
                <th className="p-4 font-bold">Curso / Modalidade</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Motivo (Tranc./Canc.)</th>
                <th className="p-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{item.atendimento}</div>
                    <div className="text-xs text-slate-500">
                      {item.tipoAtendimento && <span>{item.tipoAtendimento}</span>}
                      {item.tipoAtendimento && item.horario && <span> - </span>}
                      {item.horario && <span>{item.horario}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-slate-700">{item.unidade}</td>
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{item.nome}</div>
                    <div className="text-xs text-slate-500">Mat: {item.matricula}</div>
                    <div className="text-xs text-slate-500">{item.contato}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-800">{item.curso}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {item.modalidade}
                      </span>
                      {item.safra && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          {item.safra}
                        </span>
                      )}
                      {item.periodo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          {item.periodo}
                        </span>
                      )}
                      {item.tipoSolicitacao && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {item.tipoSolicitacao}
                        </span>
                      )}
                      {item.instituicaoDestino && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800" title={item.instituicaoDestino}>
                          Destino: {item.instituicaoDestino}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status.toLowerCase().includes('conclu') ? 'bg-green-100 text-green-800' :
                      item.status.toLowerCase().includes('pend') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {item.status || "N/A"}
                    </span>
                    {item.pendencia && (
                      <div className="text-xs text-rose-600 mt-1 font-medium line-clamp-1" title={item.pendencia}>
                        Pend: {item.pendencia}
                      </div>
                    )}
                    {item.multa && (
                      <div className="text-xs text-amber-600 mt-1 font-medium line-clamp-1" title={item.multa}>
                        Multa: {item.multa}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-slate-800 line-clamp-2" title={item.trancamentoCancelamento}>
                      {item.trancamentoCancelamento}
                    </div>
                    {item.observacao && (
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2" title={item.observacao}>
                        Obs: {item.observacao}
                      </div>
                    )}
                    {item.parcelaLeve && (
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        PL: {item.parcelaLeve}
                      </div>
                    )}
                    {item.mensalidades && (
                      <div className="text-xs text-indigo-600 mt-1 font-medium">
                        Mensalidades: {item.mensalidades}
                      </div>
                    )}
                    {item.parcelamento && (
                      <div className="text-xs text-purple-600 mt-1 font-medium">
                        Parcelamento: {item.parcelamento}
                      </div>
                    )}
                    {item.resultado && (
                      <div className="text-xs text-emerald-600 mt-1 font-bold">
                        Res: {item.resultado}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum registro de evasão encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingEntry ? "Editar Registro" : "Novo Registro de Evasão"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="evasaoForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo Atendimento</label>
                    <select
                      required
                      value={formData.tipoAtendimento || ""}
                      onChange={e => setFormData({...formData, tipoAtendimento: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Remoto">Remoto</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Horário</label>
                    <input
                      type="time"
                      value={formData.horario || ""}
                      onChange={e => setFormData({...formData, horario: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Data Atendimento</label>
                    <input
                      type="date"
                      required
                      value={formData.atendimento || ""}
                      onChange={e => setFormData({...formData, atendimento: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Unidade</label>
                    <input
                      type="text"
                      required
                      value={formData.unidade || ""}
                      onChange={e => setFormData({...formData, unidade: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly={profile?.role === "Gestor Unidade"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Modalidade</label>
                    <select
                      required
                      value={formData.modalidade || ""}
                      onChange={e => setFormData({...formData, modalidade: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Presencial">Presencial</option>
                      <option value="DIGITAL">DIGITAL</option>
                      <option value="Semipresencial">Semipresencial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Matrícula</label>
                    <input
                      type="text"
                      required
                      value={formData.matricula || ""}
                      onChange={e => setFormData({...formData, matricula: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Curso</label>
                    <input
                      type="text"
                      required
                      value={formData.curso || ""}
                      onChange={e => setFormData({...formData, curso: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Safra</label>
                    <select
                      required
                      value={formData.safra || ""}
                      onChange={e => setFormData({...formData, safra: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Calouro">Calouro</option>
                      <option value="Calouro 1R">Calouro 1R</option>
                      <option value="Calouro 2R">Calouro 2R</option>
                      <option value="Veterano">Veterano</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Período</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1º, 2026.1"
                      value={formData.periodo || ""}
                      onChange={e => setFormData({...formData, periodo: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Solicitação</label>
                    <select
                      required
                      value={formData.tipoSolicitacao || ""}
                      onChange={e => setFormData({...formData, tipoSolicitacao: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Trancamento">Trancamento</option>
                      <option value="Cancelamento">Cancelamento</option>
                      <option value="Transferência externa">Transferência externa</option>
                    </select>
                  </div>
                  {formData.tipoSolicitacao === 'Transferência externa' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Instituição Destino</label>
                      <input
                        type="text"
                        value={formData.instituicaoDestino || ""}
                        onChange={e => setFormData({...formData, instituicaoDestino: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Aluno</label>
                    <input
                      type="text"
                      required
                      value={formData.nome || ""}
                      onChange={e => setFormData({...formData, nome: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Contato</label>
                    <input
                      type="text"
                      required
                      value={formData.contato || ""}
                      onChange={e => setFormData({...formData, contato: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                    <select
                      required
                      value={formData.status || ""}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Aguardando renovação">Aguardando renovação</option>
                      <option value="Matriculado">Matriculado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pendência</label>
                    <select
                      value={formData.pendencia || ""}
                      onChange={e => setFormData({...formData, pendencia: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Multa</label>
                    <select
                      value={formData.multa || ""}
                      onChange={e => setFormData({...formData, multa: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Resultado</label>
                    <select
                      value={formData.resultado || ""}
                      onChange={e => setFormData({...formData, resultado: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Faltou">Faltou</option>
                      <option value="Cancelado pelo aluno">Cancelado pelo aluno</option>
                      <option value="Evadido">Evadido</option>
                      <option value="Revertido">Revertido</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Motivo (Trancamento/Cancelamento)</label>
                    <input
                      type="text"
                      required
                      value={formData.trancamentoCancelamento || ""}
                      onChange={e => setFormData({...formData, trancamentoCancelamento: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Parcela Leve</label>
                    <select
                      value={formData.parcelaLeve || ""}
                      onChange={e => setFormData({...formData, parcelaLeve: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {[0,1,2,3].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Mensalidades</label>
                    <select
                      value={formData.mensalidades || ""}
                      onChange={e => setFormData({...formData, mensalidades: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {[0,1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Parcelamento</label>
                    <select
                      value={formData.parcelamento || ""}
                      onChange={e => setFormData({...formData, parcelamento: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {[0,1,2,3,4,5,6,7,8,9].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Observação (Opcional)</label>
                    <textarea
                      value={formData.observacao || ""}
                      onChange={e => setFormData({...formData, observacao: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="evasaoForm"
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
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
