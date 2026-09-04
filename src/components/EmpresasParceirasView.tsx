import React, { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  X,
  Users,
  ExternalLink,
  Clock,
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
  UserCheck,
  Send,
  Sparkles,
} from "lucide-react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { EmpresaParceira, UserProfile, Lead, CalendarioAcao, CursoDisponivel, BotConfig } from "../types";
import { getWhatsAppUrl } from "../lib/utils";
import * as XLSX from "xlsx";
import Mapa3D from "./Mapa3D";
import NovasOportunidadesView from "./NovasOportunidadesView";

interface EmpresasParceirasViewProps {
  data: EmpresaParceira[];
  leads: Lead[];
  acoes: CalendarioAcao[];
  onToast: (message: string, type?: "success" | "error") => void;
  cursos: CursoDisponivel[];
  users: UserProfile[];
  onSendWhatsApp?: (tel: string, msg: string) => Promise<void>;
  botConfig: BotConfig;
  uniqueUnidades: string[];
  profile: UserProfile;
  onGenerateAction?: (empresa: EmpresaParceira) => void;
}

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.replace(/^(\d{2})(\d+)/, "$1.$2");
  if (digits.length <= 8) return digits.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
  if (digits.length <= 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, "$1.$2.$3/$4-$5");
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

function getDaysInTratativa(empresa: EmpresaParceira): number {
  if (!empresa.createdAt) return 0;
  try {
    const createdDate = empresa.createdAt?.toDate ? empresa.createdAt.toDate() : new Date(empresa.createdAt);
    if (isNaN(createdDate.getTime())) return 0;
    const diffTime = Math.max(0, Date.now() - createdDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function EmpresasParceirasView({
  data,
  leads,
  acoes,
  onToast,
  users,
  botConfig,
  uniqueUnidades,
  profile,
  onGenerateAction,
}: EmpresasParceirasViewProps) {
  // Sub-abas: Lista de Empresas | Mapa das Empresas | Acompanhamento de Tratativas (Alertas) | Novas Oportunidades
  const [activeSubTab, setActiveSubTab] = useState<"lista" | "mapa" | "tratativas" | "oportunidades">("lista");

  // Filtros principais
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterClassificacao, setFilterClassificacao] = useState("Todas");
  const [filterUnidade, setFilterUnidade] = useState("Todas");
  const [filterSeguimento, setFilterSeguimento] = useState("Todos");
  const [filterFDV, setFilterFDV] = useState("Todos");

  // Modal de cadastro / edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaParceira | null>(null);

  // Seleção múltipla para ações em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dados do formulário
  const [formData, setFormData] = useState<Partial<EmpresaParceira>>({
    nome: "",
    cnpj: "",
    statusEmpresa: "Conveniada",
    classificacao: "",
    seguimento: "",
    responsavel: "",
    email: "",
    telefone: "",
    telefoneResponsavel: "",
    endereco: "",
    bairro: "",
    cidade: "",
    linkMaps: "",
    linkSales: "",
    consultorId: "",
    consultorNome: "",
    unidadesVinculadas: [],
  });

  // Lista unificada de unidades padrão
  const availableUnidades = useMemo(() => {
    const defaultUnits = ["ANGRA DOS REIS", "CAMPO GRANDE", "R9 TAQUARA", "SANTA CRUZ"];
    const merged = Array.from(new Set([...(uniqueUnidades || []), ...defaultUnits]));
    return merged.filter(Boolean).sort();
  }, [uniqueUnidades]);

  // Lista de consultores / FDVs
  const consultoresList = useMemo(() => {
    return users
      .filter((u) => u.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Segmentos únicos para filtro
  const uniqueSeguimentos = useMemo(() => {
    const set = new Set<string>();
    data.forEach((e) => {
      if (e.seguimento && e.seguimento.trim()) set.add(e.seguimento.trim());
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtragem dos dados
  const filteredEmpresas = useMemo(() => {
    return data.filter((e) => {
      // Busca geral: nome, CNPJ, responsável, endereço
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchNome = (e.nome || "").toLowerCase().includes(term);
        const matchCNPJ = (e.cnpj || "").replace(/\D/g, "").includes(term.replace(/\D/g, ""));
        const matchResp = (e.responsavel || "").toLowerCase().includes(term);
        const matchEnd = (e.endereco || "").toLowerCase().includes(term);
        const matchBairro = (e.bairro || "").toLowerCase().includes(term);
        const matchCidade = (e.cidade || "").toLowerCase().includes(term);
        if (!matchNome && !matchCNPJ && !matchResp && !matchEnd && !matchBairro && !matchCidade) {
          return false;
        }
      }

      // Status
      if (filterStatus !== "Todos") {
        if (filterStatus === "Conveniada" && e.statusEmpresa !== "Conveniada") return false;
        if (filterStatus === "Em tratativa" && e.statusEmpresa !== "Em tratativa") return false;
        if (filterStatus === "Cancelada" && e.statusEmpresa !== "Cancelada") return false;
        if (filterStatus === "Não visitada" && e.statusEmpresa !== "Não visitada") return false;
      }

      // Classificação
      if (filterClassificacao !== "Todas") {
        if (filterClassificacao === "Nenhuma" && (e.classificacao || "").trim() !== "") return false;
        if (filterClassificacao !== "Nenhuma" && e.classificacao !== filterClassificacao) return false;
      }

      // Unidade Vinculada
      if (filterUnidade !== "Todas") {
        if (!e.unidadesVinculadas || !e.unidadesVinculadas.includes(filterUnidade)) return false;
      }

      // Seguimento
      if (filterSeguimento !== "Todos") {
        if ((e.seguimento || "").trim().toLowerCase() !== filterSeguimento.toLowerCase()) return false;
      }

      // FDV / Consultor
      if (filterFDV !== "Todos") {
        if (e.consultorNome !== filterFDV && e.consultorId !== filterFDV) return false;
      }

      return true;
    });
  }, [data, searchTerm, filterStatus, filterClassificacao, filterUnidade, filterSeguimento, filterFDV]);

  // Contadores para os Cards de KPI
  const statusCounts = useMemo(() => {
    let conveniada = 0;
    let tratativa = 0;
    let cancelada = 0;
    let naoVisitada = 0;

    data.forEach((e) => {
      const s = e.statusEmpresa;
      if (s === "Conveniada") conveniada++;
      else if (s === "Em tratativa") tratativa++;
      else if (s === "Cancelada") cancelada++;
      else naoVisitada++;
    });

    return { conveniada, tratativa, cancelada, naoVisitada };
  }, [data]);

  const classificacaoCounts = useMemo(() => {
    let ouro = 0;
    let prata = 0;
    let bronze = 0;

    data.forEach((e) => {
      const c = (e.classificacao || "").toLowerCase();
      if (c === "ouro") ouro++;
      else if (c === "prata") prata++;
      else if (c === "bronze") bronze++;
    });

    return { ouro, prata, bronze };
  }, [data]);

  // Empresas em tratativa para a sub-aba de alertas
  const empresasTratativa = useMemo(() => {
    return data
      .filter((e) => e.statusEmpresa === "Em tratativa")
      .map((e) => ({
        ...e,
        diasTratativa: getDaysInTratativa(e),
      }))
      .sort((a, b) => b.diasTratativa - a.diasTratativa);
  }, [data]);

  // Abertura do modal para nova empresa
  const handleOpenNewModal = (initialPartial?: Partial<EmpresaParceira>) => {
    setEditingEmpresa(null);
    setFormData({
      nome: initialPartial?.nome || "",
      cnpj: initialPartial?.cnpj || "",
      statusEmpresa: initialPartial?.statusEmpresa || "Conveniada",
      classificacao: initialPartial?.classificacao || "",
      seguimento: initialPartial?.seguimento || "",
      responsavel: initialPartial?.responsavel || "",
      email: initialPartial?.email || "",
      telefone: initialPartial?.telefone || "",
      telefoneResponsavel: initialPartial?.telefoneResponsavel || "",
      endereco: initialPartial?.endereco || "",
      bairro: initialPartial?.bairro || "",
      cidade: initialPartial?.cidade || "",
      linkMaps: initialPartial?.linkMaps || "",
      linkSales: initialPartial?.linkSales || "",
      consultorId: profile.uid || "",
      consultorNome: profile.name || "",
      unidadesVinculadas: initialPartial?.unidadesVinculadas || [],
    });
    setIsModalOpen(true);
  };

  // Abertura do modal para editar empresa existente
  const handleOpenEditModal = (empresa: EmpresaParceira) => {
    setEditingEmpresa(empresa);
    setFormData({
      nome: empresa.nome || "",
      cnpj: empresa.cnpj || "",
      statusEmpresa: empresa.statusEmpresa || "Conveniada",
      classificacao: empresa.classificacao || "",
      seguimento: empresa.seguimento || "",
      responsavel: empresa.responsavel || "",
      email: empresa.email || "",
      telefone: empresa.telefone || "",
      telefoneResponsavel: empresa.telefoneResponsavel || "",
      endereco: empresa.endereco || "",
      bairro: empresa.bairro || "",
      cidade: empresa.cidade || "",
      linkMaps: empresa.linkMaps || "",
      linkSales: empresa.linkSales || "",
      consultorId: empresa.consultorId || "",
      consultorNome: empresa.consultorNome || "",
      unidadesVinculadas: empresa.unidadesVinculadas || [],
    });
    setIsModalOpen(true);
  };

  // Salvar formulário
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.nome.trim()) {
      onToast("Informe o nome da empresa.", "error");
      return;
    }

    try {
      const payload: any = {
        nome: formData.nome.trim(),
        cnpj: formData.cnpj || "",
        statusEmpresa: formData.statusEmpresa || "Conveniada",
        classificacao: formData.classificacao || "",
        seguimento: formData.seguimento || "",
        responsavel: formData.responsavel || "",
        email: formData.email || "",
        telefone: (formData.telefone || "").replace(/\D/g, ""),
        telefoneResponsavel: (formData.telefoneResponsavel || "").replace(/\D/g, ""),
        endereco: formData.endereco || "",
        bairro: formData.bairro || "",
        cidade: formData.cidade || "",
        linkMaps: formData.linkMaps || "",
        linkSales: formData.linkSales || "",
        consultorId: formData.consultorId || "",
        consultorNome: formData.consultorNome || "",
        unidadesVinculadas: formData.unidadesVinculadas || [],
      };

      if (editingEmpresa) {
        await updateDoc(doc(db, COLLECTIONS.EMPRESAS_PARCEIRAS, editingEmpresa.id), payload);
        onToast("Empresa parceira atualizada com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.EMPRESAS_PARCEIRAS), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Empresa parceira cadastrada com sucesso!");
      }
      setIsModalOpen(false);
      setEditingEmpresa(null);
    } catch (err: any) {
      console.error(err);
      onToast(err.message || "Erro ao salvar empresa", "error");
    }
  };

  // Excluir empresa
  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta empresa parceira?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.EMPRESAS_PARCEIRAS, id));
      onToast("Empresa parceira excluída com sucesso!");
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  // Atualização rápida de status (ex: nas tratativas)
  const handleQuickStatusChange = async (id: string, newStatus: EmpresaParceira["statusEmpresa"]) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.EMPRESAS_PARCEIRAS, id), {
        statusEmpresa: newStatus,
      });
      onToast(`Status atualizado para "${newStatus}"!`);
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  // Alternar unidade vinculada no checkbox
  const toggleUnidade = (unidade: string) => {
    const current = formData.unidadesVinculadas || [];
    if (current.includes(unidade)) {
      setFormData({
        ...formData,
        unidadesVinculadas: current.filter((u) => u !== unidade),
      });
    } else {
      setFormData({
        ...formData,
        unidadesVinculadas: [...current, unidade],
      });
    }
  };

  // Selecionar / Desmarcar todas as unidades
  const toggleAllUnidades = () => {
    const current = formData.unidadesVinculadas || [];
    if (current.length === availableUnidades.length) {
      setFormData({ ...formData, unidadesVinculadas: [] });
    } else {
      setFormData({ ...formData, unidadesVinculadas: [...availableUnidades] });
    }
  };

  // Exportação Excel
  const handleExportExcel = () => {
    const exportData = filteredEmpresas.map((e) => ({
      "Nome da Empresa": e.nome,
      CNPJ: e.cnpj || "",
      Status: e.statusEmpresa || "Conveniada",
      Classificação: e.classificacao || "",
      Seguimento: e.seguimento || "",
      Responsável: e.responsavel || "",
      "Telefone Principal": e.telefone || "",
      "Telefone Responsável": e.telefoneResponsavel || "",
      Email: e.email || "",
      Endereço: e.endereco || "",
      Bairro: e.bairro || "",
      Cidade: e.cidade || "",
      "Link Maps": e.linkMaps || "",
      "Link Sales": e.linkSales || "",
      "Consultor / FDV": e.consultorNome || "",
      "Unidades Vinculadas": (e.unidadesVinculadas || []).join(", "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EmpresasParceiras");
    XLSX.writeFile(workbook, "Empresas_Parceiras.xlsx");
  };

  // Toggle seleção de todas do filtro
  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredEmpresas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmpresas.map((e) => e.id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* BARRA SUPERIOR DE SUB-ABAS (NAVY BLUE THEME CONFORME PRINT) */}
      <div className="bg-[#07122a] border-b border-slate-700/60 -mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 pt-4 rounded-b-2xl shadow-lg">
        <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab("lista")}
            className={`flex items-center space-x-2 py-3 px-1 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeSubTab === "lista"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📑 Lista de Empresas</span>
          </button>

          <button
            onClick={() => setActiveSubTab("mapa")}
            className={`flex items-center space-x-2 py-3 px-1 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeSubTab === "mapa"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🗺️ Mapa das Empresas</span>
          </button>

          <button
            onClick={() => setActiveSubTab("tratativas")}
            className={`flex items-center space-x-2 py-3 px-1 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeSubTab === "tratativas"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>⏰ Acompanhamento de Tratativas (Alertas)</span>
            {empresasTratativa.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {empresasTratativa.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("oportunidades")}
            className={`flex items-center space-x-2 py-3 px-1 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeSubTab === "oportunidades"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🔍 Novas Oportunidades</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: LISTA DE EMPRESAS */}
      {/* ========================================================================= */}
      {activeSubTab === "lista" && (
        <div className="space-y-6">
          {/* BARRA DE PESQUISA E FILTROS (PRINT 1) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome da empresa ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* Linha de 5 Filtros */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  STATUS
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Conveniada">Conveniada</option>
                  <option value="Em tratativa">Em Tratativa</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Não visitada">Não Visitada</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  CLASSIFICAÇÃO
                </label>
                <select
                  value={filterClassificacao}
                  onChange={(e) => setFilterClassificacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todas">Todas</option>
                  <option value="Ouro">Ouro</option>
                  <option value="Prata">Prata</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Nenhuma">Nenhuma</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  UNIDADE VINCULADA
                </label>
                <select
                  value={filterUnidade}
                  onChange={(e) => setFilterUnidade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todas">Todas</option>
                  {availableUnidades.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  SEGUIMENTO
                </label>
                <select
                  value={filterSeguimento}
                  onChange={(e) => setFilterSeguimento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">Todos</option>
                  {uniqueSeguimentos.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  FDV
                </label>
                <select
                  value={filterFDV}
                  onChange={(e) => setFilterFDV(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">Todos</option>
                  {consultoresList.map((c) => (
                    <option key={c.uid} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CARDS DE KPI / STATUS / CLASSIFICAÇÃO (PRINT 1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Empresas */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Building2 size={28} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-0.5">
                  Total Empresas
                </span>
                <span className="text-3xl font-extrabold text-slate-800">
                  {filteredEmpresas.length}
                </span>
              </div>
            </div>

            {/* Card 2: POR STATUS */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                POR STATUS
              </span>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-600 font-bold">Conveniada</span>
                  <span className="font-extrabold text-slate-800 text-sm">{statusCounts.conveniada}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-500 font-bold">Em Tratativa</span>
                  <span className="font-extrabold text-slate-800 text-sm">{statusCounts.tratativa}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-500 font-bold">Cancelada</span>
                  <span className="font-extrabold text-slate-800 text-sm">{statusCounts.cancelada}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Não Visitada</span>
                  <span className="font-extrabold text-slate-800 text-sm">{statusCounts.naoVisitada}</span>
                </div>
              </div>
            </div>

            {/* Card 3: POR CLASSIFICAÇÃO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                POR CLASSIFICAÇÃO
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-2.5 text-center">
                  <span className="block text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                    OURO
                  </span>
                  <span className="text-2xl font-black text-amber-900 mt-1 block">
                    {classificacaoCounts.ouro}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center">
                  <span className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    PRATA
                  </span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">
                    {classificacaoCounts.prata}
                  </span>
                </div>
                <div className="bg-orange-50/80 border border-orange-200/80 rounded-2xl p-2.5 text-center">
                  <span className="block text-[10px] font-extrabold text-orange-800 uppercase tracking-wider">
                    BRONZE
                  </span>
                  <span className="text-2xl font-black text-orange-900 mt-1 block">
                    {classificacaoCounts.bronze}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA DE AÇÃO / CONTAGEM */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
            <div className="text-xs font-medium text-slate-500">
              Mostrando <span className="font-bold text-slate-700">{filteredEmpresas.length}</span> de{" "}
              <span className="font-bold text-slate-700">{data.length}</span> empresas
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSelectAllFiltered}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 mr-2"
              >
                {selectedIds.length === filteredEmpresas.length && filteredEmpresas.length > 0
                  ? "Desmarcar Todas"
                  : `Selecionar Todas do Filtro (${filteredEmpresas.length})`}
              </button>

              <button
                onClick={() => handleOpenNewModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all text-xs font-bold shadow-md shadow-blue-200"
              >
                <Plus size={16} />
                <span>Nova Empresa</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-slate-50 transition-all text-xs font-bold shadow-sm"
              >
                <Download size={16} />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* LISTA / GRID DE EMPRESAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmpresas.map((empresa) => {
              const statusColor =
                empresa.statusEmpresa === "Conveniada"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : empresa.statusEmpresa === "Em tratativa"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : empresa.statusEmpresa === "Cancelada"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-50 text-slate-700 border-slate-200";

              return (
                <div
                  key={empresa.id}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Top Badges & Actions */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span
                          className={`px-3 py-1 font-bold rounded-full text-xs border ${statusColor}`}
                        >
                          {empresa.statusEmpresa || "Conveniada"}
                        </span>
                        {empresa.classificacao && (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-full text-[10px] uppercase">
                            ⭐ {empresa.classificacao}
                          </span>
                        )}
                        {empresa.seguimento && (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 font-semibold rounded-full text-[10px]">
                            {empresa.seguimento}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditModal(empresa)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Empresa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(empresa.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Empresa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Nome & CNPJ */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {empresa.nome}
                      </h3>
                      {empresa.cnpj && (
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          CNPJ: {empresa.cnpj}
                        </p>
                      )}
                      {empresa.responsavel && (
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                          <span className="font-semibold">Responsável:</span> {empresa.responsavel}
                        </p>
                      )}
                    </div>

                    {/* Informações de Contato & Localização */}
                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      {empresa.telefone && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-emerald-500 shrink-0" />
                            <span>{formatPhoneInput(empresa.telefone)}</span>
                          </div>
                          <a
                            href={getWhatsAppUrl(
                              empresa.telefone,
                              `Olá ${empresa.responsavel || ""}, tudo bem? Falamos sobre a parceria da universidade!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-600 hover:underline"
                          >
                            WhatsApp
                          </a>
                        </div>
                      )}

                      {empresa.telefoneResponsavel && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Phone size={14} className="text-slate-400 shrink-0" />
                          <span>Resp: {formatPhoneInput(empresa.telefoneResponsavel)}</span>
                        </div>
                      )}

                      {empresa.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate">{empresa.email}</span>
                        </div>
                      )}

                      {(empresa.endereco || empresa.bairro || empresa.cidade) && (
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="truncate">
                            {[empresa.endereco, empresa.bairro, empresa.cidade]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}

                      {empresa.consultorNome && (
                        <div className="flex items-center gap-2 text-slate-500 pt-1">
                          <Users size={14} className="text-indigo-500 shrink-0" />
                          <span className="truncate">FDV: <span className="font-semibold text-slate-700">{empresa.consultorNome}</span></span>
                        </div>
                      )}
                    </div>

                    {/* Links Extras */}
                    {(empresa.linkMaps || empresa.linkSales) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {empresa.linkMaps && (
                          <a
                            href={empresa.linkMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            <ExternalLink size={12} />
                            <span>Ver no Maps</span>
                          </a>
                        )}
                        {empresa.linkSales && (
                          <a
                            href={empresa.linkSales}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            <ExternalLink size={12} />
                            <span>Sales</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Unidades Vinculadas */}
                    {empresa.unidadesVinculadas && empresa.unidadesVinculadas.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                        {empresa.unidadesVinculadas.map((u) => (
                          <span
                            key={u}
                            className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {empresa.telefone && (
                      <a
                        href={getWhatsAppUrl(
                          empresa.telefone,
                          `Olá ${empresa.responsavel || ""}, tudo bem? Falamos da universidade sobre nossa parceria!`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                        title="Enviar WhatsApp"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                    {onGenerateAction && (
                      <button
                        onClick={() => onGenerateAction(empresa)}
                        className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Calendar size={14} />
                        <span>Agendar Ação</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredEmpresas.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 italic bg-white rounded-3xl border border-slate-100">
                Nenhuma empresa parceira encontrada para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: MAPA DAS EMPRESAS (PRINT 4) */}
      {/* ========================================================================= */}
      {activeSubTab === "mapa" && (
        <div className="space-y-6">
          {/* BARRA DE PESQUISA E FILTROS COMPARTILHADA (PRINT 4) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome da empresa ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  STATUS
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Conveniada">Conveniada</option>
                  <option value="Em tratativa">Em Tratativa</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Não visitada">Não Visitada</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  CLASSIFICAÇÃO
                </label>
                <select
                  value={filterClassificacao}
                  onChange={(e) => setFilterClassificacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todas">Todas</option>
                  <option value="Ouro">Ouro</option>
                  <option value="Prata">Prata</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Nenhuma">Nenhuma</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  UNIDADE VINCULADA
                </label>
                <select
                  value={filterUnidade}
                  onChange={(e) => setFilterUnidade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todas">Todas</option>
                  {availableUnidades.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  SEGUIMENTO
                </label>
                <select
                  value={filterSeguimento}
                  onChange={(e) => setFilterSeguimento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">Todos</option>
                  {uniqueSeguimentos.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  FDV
                </label>
                <select
                  value={filterFDV}
                  onChange={(e) => setFilterFDV(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">Todos</option>
                  {consultoresList.map((c) => (
                    <option key={c.uid} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* COMPONENTE INTERATIVO MAPA 3D / RJ */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <Mapa3D
              empresas={filteredEmpresas}
              leads={leads}
              acoes={acoes}
              selectedId={null}
              onSelect={(id) => {
                const found = data.find((e) => e.id === id);
                if (found) handleOpenEditModal(found);
              }}
              onGenerateAction={(empresa) => {
                if (onGenerateAction) onGenerateAction(empresa);
              }}
              formatPhone={(tel) => formatPhoneInput(tel || "")}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 3: ACOMPANHAMENTO DE TRATATIVAS (ALERTAS) (PRINT 5) */}
      {/* ========================================================================= */}
      {activeSubTab === "tratativas" && (
        <div className="space-y-6">
          {/* OS 3 CARDS DE ALERTA NO TOPO (PRINT 5) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Lembrete de Retorno */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 shadow-sm flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-100/90 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                <Clock size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-900 text-sm">
                  Lembrete de Retorno
                </h4>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  Ativado após <strong className="font-extrabold text-amber-950">3 dias</strong> do cadastro. Requer contato inicial para retorno sobre o fechamento da ação.
                </p>
              </div>
            </div>

            {/* Card 2: Alerta de Atenção */}
            <div className="bg-orange-50/70 border border-orange-200/80 rounded-3xl p-5 shadow-sm flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-orange-100/90 border border-orange-300 flex items-center justify-center text-orange-700 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-orange-900 text-sm">
                  Alerta de Atenção
                </h4>
                <p className="text-xs text-orange-800/90 leading-relaxed">
                  Ativado após <strong className="font-extrabold text-orange-950">7 dias</strong> do cadastro. Atenção necessária para a negociação em andamento.
                </p>
              </div>
            </div>

            {/* Card 3: Retorno de Emergência */}
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-3xl p-5 shadow-sm flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100/90 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <AlertOctagon size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-rose-900 text-sm">
                  Retorno de Emergência
                </h4>
                <p className="text-xs text-rose-800/90 leading-relaxed">
                  Ativado após <strong className="font-extrabold text-rose-950">15 dias ou mais</strong>. Tratativa crítica necessitando retorno imediato de emergência.
                </p>
              </div>
            </div>
          </div>

          {/* RELATÓRIO DE TRATATIVAS (PRINT 5) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">
                Relatório de Acompanhamento de Tratativas
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Total de Tratativas Ativas: <strong className="text-slate-800">{empresasTratativa.length}</strong>
              </span>
            </div>

            {empresasTratativa.length === 0 ? (
              <div className="py-16 text-center text-slate-400 italic">
                Nenhuma empresa com status "Em tratativa" cadastrada.
              </div>
            ) : (
              <div className="space-y-3">
                {empresasTratativa.map((empresa) => {
                  const dias = empresa.diasTratativa;
                  let badgeAlert = (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-xs">
                      {dias} {dias === 1 ? "dia" : "dias"} (Recente)
                    </span>
                  );

                  if (dias >= 15) {
                    badgeAlert = (
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full font-extrabold text-xs flex items-center gap-1">
                        <AlertOctagon size={13} />
                        <span>Emergência ({dias} dias)</span>
                      </span>
                    );
                  } else if (dias >= 7) {
                    badgeAlert = (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-full font-extrabold text-xs flex items-center gap-1">
                        <AlertCircle size={13} />
                        <span>Atenção ({dias} dias)</span>
                      </span>
                    );
                  } else if (dias >= 3) {
                    badgeAlert = (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-extrabold text-xs flex items-center gap-1">
                        <Clock size={13} />
                        <span>Lembrete ({dias} dias)</span>
                      </span>
                    );
                  }

                  return (
                    <div
                      key={empresa.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-base">{empresa.nome}</h4>
                          {badgeAlert}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {empresa.responsavel && (
                            <span>Contato: <strong className="text-slate-700">{empresa.responsavel}</strong></span>
                          )}
                          {empresa.telefone && (
                            <span>Tel: <strong className="text-slate-700">{formatPhoneInput(empresa.telefone)}</strong></span>
                          )}
                          {empresa.consultorNome && (
                            <span>FDV: <strong className="text-slate-700">{empresa.consultorNome}</strong></span>
                          )}
                          {(empresa.bairro || empresa.cidade) && (
                            <span>Local: <strong className="text-slate-700">{[empresa.bairro, empresa.cidade].filter(Boolean).join(" - ")}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {empresa.telefone && (
                          <a
                            href={getWhatsAppUrl(
                              empresa.telefone,
                              `Olá ${empresa.responsavel || ""}, tudo bem? Gostaria de saber o retorno sobre a proposta de parceria da universidade. Estamos à disposição!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <Phone size={13} />
                            <span>Cobrar WhatsApp</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleQuickStatusChange(empresa.id, "Conveniada")}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          title="Efetivar como conveniada"
                        >
                          Efetivar Convênio
                        </button>

                        <button
                          onClick={() => handleQuickStatusChange(empresa.id, "Cancelada")}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          title="Marcar como cancelada"
                        >
                          Cancelar
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(empresa)}
                          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-2 rounded-xl transition-all"
                          title="Editar Detalhes"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 4: NOVAS OPORTUNIDADES (PRINT 6) */}
      {/* ========================================================================= */}
      {activeSubTab === "oportunidades" && (
        <div className="space-y-6">
          <NovasOportunidadesView
            data={data}
            botConfig={botConfig}
            onToast={onToast}
            onAdicionarOportunidade={(empresaNova) => {
              handleOpenNewModal(empresaNova);
            }}
          />

          {/* RODAPÉ CONFORME PRINT 6 */}
          <div className="text-center py-6 text-xs text-slate-400 border-t border-slate-200/80 mt-8">
            Sistema Criado por <span className="text-slate-600 font-semibold">Agencia Argo's</span> -{" "}
            <span className="text-blue-600 font-bold">Telefone: (24) 99277-7019</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE EMPRESA PARCEIRA (PRINTS 2 & 3) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="text-blue-600" size={22} />
                <span>{editingEmpresa ? "Editar Empresa Parceira" : "Nova Empresa Parceira"}</span>
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEmpresa(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* LINHA 1: Nome da Empresa | CNPJ (PRINT 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nome da Empresa
                  </label>
                  <input
                    required
                    value={formData.nome || ""}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Ex: Empresa Exemplo Ltda"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    CNPJ
                  </label>
                  <input
                    value={formData.cnpj || ""}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              {/* CARD DE STATUS, CLASSIFICAÇÃO, SEGUIMENTO (PRINT 2) */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status
                    </label>
                    <select
                      value={formData.statusEmpresa || ""}
                      onChange={(e) => setFormData({ ...formData, statusEmpresa: e.target.value as any })}
                      className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Selecione...</option>
                      <option value="Conveniada">Conveniada</option>
                      <option value="Em tratativa">Em Tratativa</option>
                      <option value="Cancelada">Cancelada</option>
                      <option value="Não visitada">Não Visitada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Classificação
                    </label>
                    <select
                      value={formData.classificacao || ""}
                      onChange={(e) => setFormData({ ...formData, classificacao: e.target.value as any })}
                      className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Nenhuma</option>
                      <option value="Ouro">Ouro</option>
                      <option value="Prata">Prata</option>
                      <option value="Bronze">Bronze</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Seguimento
                    </label>
                    <input
                      value={formData.seguimento || ""}
                      onChange={(e) => setFormData({ ...formData, seguimento: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Ex: Educação, Varej"
                    />
                  </div>
                </div>
              </div>

              {/* LINHA 3: Responsável pela Parceria | Email (PRINT 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Responsável pela Parceria
                  </label>
                  <input
                    value={formData.responsavel || ""}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Nome do RH ou Gestor"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              {/* LINHA 4: Telefone Principal (Empresa) | Telefone do Responsável (PRINT 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telefone Principal (Empresa)
                  </label>
                  <input
                    value={formData.telefone ? formatPhoneInput(formData.telefone) : ""}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 font-mono"
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telefone do Responsável
                  </label>
                  <input
                    value={formData.telefoneResponsavel ? formatPhoneInput(formData.telefoneResponsavel) : ""}
                    onChange={(e) => setFormData({ ...formData, telefoneResponsavel: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 font-mono"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* LINHA 5: Endereço | Bairro | Cidade (PRINT 2 & 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Endereço
                  </label>
                  <input
                    value={formData.endereco || ""}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Rua, número"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bairro
                  </label>
                  <input
                    value={formData.bairro || ""}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Cidade
                  </label>
                  <input
                    value={formData.cidade || ""}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Cidade"
                  />
                </div>
              </div>

              {/* LINHA 6: Link no Maps | Link do Sales de Vínculo (PRINT 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Link no Maps
                  </label>
                  <input
                    value={formData.linkMaps || ""}
                    onChange={(e) => setFormData({ ...formData, linkMaps: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono text-xs"
                    placeholder="https://goo.gl/maps/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Link do Sales de Vínculo
                  </label>
                  <input
                    value={formData.linkSales || ""}
                    onChange={(e) => setFormData({ ...formData, linkSales: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono text-xs"
                    placeholder="https://sales..."
                  />
                </div>
              </div>

              {/* LINHA 7: Vincular a Consultor Comercial / FDV (PRINT 3) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vincular a Consultor Comercial / FDV
                </label>
                <div className="relative">
                  <select
                    value={formData.consultorId || ""}
                    onChange={(e) => {
                      const selectedUid = e.target.value;
                      const selectedUser = consultoresList.find((u) => u.uid === selectedUid);
                      setFormData({
                        ...formData,
                        consultorId: selectedUid,
                        consultorNome: selectedUser ? selectedUser.name : "",
                      });
                    }}
                    className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="">Nenhum consultor selecionado (Sem vínculo)</option>
                    {consultoresList.map((c) => (
                      <option key={c.uid} value={c.uid}>
                        {c.name} {c.role ? `(${c.role})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400">
                  Selecione um comercial/FDV cadastrado no sistema para vincular a esta empresa parceira.
                </p>
              </div>

              {/* LINHA 8: Unidades Vinculadas (PRINT 3) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unidades Vinculadas
                </label>
                <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 max-h-48 overflow-y-auto">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={
                        availableUnidades.length > 0 &&
                        (formData.unidadesVinculadas || []).length === availableUnidades.length
                      }
                      onChange={toggleAllUnidades}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-blue-600">
                      Selecionar Todas ({availableUnidades.length})
                    </span>
                  </label>

                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    {availableUnidades.map((unidade) => {
                      const isChecked = (formData.unidadesVinculadas || []).includes(unidade);
                      return (
                        <label
                          key={unidade}
                          className="flex items-center space-x-2.5 cursor-pointer select-none hover:bg-slate-50 p-1 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleUnidade(unidade)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {unidade}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEmpresa(null);
                  }}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-200 transition-all"
                >
                  {editingEmpresa ? "Salvar Alterações" : "Cadastrar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
