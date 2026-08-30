import React, { useState, useMemo, useEffect } from "react";
import { FuncionarioSM, UnidadeRegional } from "../types";
import {
  Crown,
  User,
  Shield,
  GraduationCap,
  Award,
  Building2,
  Phone,
  Mail,
  FileText,
  Search,
  Download,
  Printer,
  Eye,
  X,
  CreditCard,
  Briefcase,
  Store,
  Shirt,
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  Tag,
  Filter,
  Users,
  Compass,
  Layers,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";

interface Props {
  funcionarios: FuncionarioSM[];
  unidades: UnidadeRegional[];
}

export function OrganogramaSmView({ funcionarios, unidades }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "Ativo" | "Licença">("TODOS");
  const [selectedColab, setSelectedColab] = useState<FuncionarioSM | null>(null);

  // Compute all available unique units from both "unidades" and "funcionarios"
  const availableUnidades = useMemo(() => {
    const map = new Map<
      string,
      {
        nome: string;
        marca?: string;
        regional?: string;
        nucleo?: string;
        cluster?: string;
        codigo?: string;
        endereco?: string;
      }
    >();

    unidades.forEach((u) => {
      if (u.nome && u.nome.trim()) {
        map.set(u.nome.trim().toLowerCase(), {
          nome: u.nome.trim(),
          marca: u.marca,
          regional: u.regional,
          nucleo: u.nucleo,
          cluster: u.cluster,
          codigo: u.codigo,
          endereco: u.endereco,
        });
      }
    });

    funcionarios.forEach((f) => {
      if (f.unidade && f.unidade.trim()) {
        const key = f.unidade.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            nome: f.unidade.trim(),
            marca: f.marca,
            regional: f.regional,
            nucleo: f.nucleo,
            cluster: f.cluster,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [unidades, funcionarios]);

  const [selectedUnidade, setSelectedUnidade] = useState<string>(() => {
    return availableUnidades[0]?.nome || "";
  });

  // Ensure selected unit is valid
  useEffect(() => {
    if (availableUnidades.length > 0) {
      const exists = availableUnidades.some(
        (u) => u.nome.toLowerCase() === selectedUnidade.toLowerCase()
      );
      if (!selectedUnidade || !exists) {
        setSelectedUnidade(availableUnidades[0].nome);
      }
    }
  }, [availableUnidades, selectedUnidade]);

  // Selected Unit Metadata
  const currentUnitMeta = useMemo(() => {
    if (!selectedUnidade || selectedUnidade === "TODAS") return null;
    const found = availableUnidades.find(
      (u) => u.nome.toLowerCase() === selectedUnidade.toLowerCase()
    );
    if (found) return found;

    // Fallback from employees
    const firstColab = funcionarios.find(
      (f) => (f.unidade || "").trim().toLowerCase() === selectedUnidade.toLowerCase()
    );
    return {
      nome: selectedUnidade,
      marca: firstColab?.marca || "Estácio",
      regional: firstColab?.regional || "Regional RJ",
      nucleo: firstColab?.nucleo || "",
      cluster: firstColab?.cluster || "",
      codigo: "",
      endereco: "",
    };
  }, [selectedUnidade, availableUnidades, funcionarios]);

  // Filter staff by unit, search query, and status
  const unitStaff = useMemo(() => {
    return funcionarios.filter((f) => {
      // Unit filter
      if (selectedUnidade !== "TODAS") {
        const fUnit = (f.unidade || "").trim().toLowerCase();
        const selUnit = selectedUnidade.trim().toLowerCase();
        if (fUnit !== selUnit) return false;
      }

      // Status filter
      if (statusFilter !== "TODOS") {
        const fStatus = f.status || "Ativo";
        if (fStatus !== statusFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNome = (f.nome || "").toLowerCase().includes(query);
        const matchCargo = ((f.funcao || f.cargo) || "").toLowerCase().includes(query);
        const matchMatricula = (f.matricula || "").toLowerCase().includes(query);
        const matchCpf = (f.cpf || "").toLowerCase().includes(query);
        const matchEmail = (f.email || "").toLowerCase().includes(query);
        const matchTel = (f.telefonePrincipal || f.telefone || "").toLowerCase().includes(query);
        const matchPdv = (f.pdvSalesforce || "").toLowerCase().includes(query);
        const matchUnidade = (f.unidade || "").toLowerCase().includes(query);

        if (
          !matchNome &&
          !matchCargo &&
          !matchMatricula &&
          !matchCpf &&
          !matchEmail &&
          !matchTel &&
          !matchPdv &&
          !matchUnidade
        ) {
          return false;
        }
      }

      return true;
    });
  }, [funcionarios, selectedUnidade, statusFilter, searchTerm]);

  // Helper for hierarchical role classification
  const classifyRole = (f: FuncionarioSM) => {
    const rawRole = (f.funcao || f.cargo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    if (rawRole.includes("gestor") || rawRole.includes("gerente") || rawRole.includes("coordenad")) {
      return "gestor";
    }
    if (rawRole === "02" || rawRole.includes("sub-lider") || rawRole.includes("sublider") || rawRole.includes("vice") || rawRole.includes("sub lider") || rawRole.includes("02 sm")) {
      return "viceLider";
    }
    if (rawRole.includes("lider")) {
      return "lider";
    }
    if (rawRole.includes("estagi")) {
      return "estagiario";
    }
    if (rawRole.includes("aprendiz") || rawRole.includes("jovem")) {
      return "jovemAprendiz";
    }
    if (
      rawRole.includes("atendente") ||
      rawRole.includes("administrativo") ||
      rawRole.includes("consultor") ||
      rawRole.includes("assistente") ||
      rawRole.includes("agente") ||
      rawRole.includes("operador") ||
      rawRole.includes("sm")
    ) {
      return "administrativo";
    }
    return "outros";
  };

  // Group staff into hierarchical tiers
  const gestores = useMemo(() => unitStaff.filter((f) => classifyRole(f) === "gestor"), [unitStaff]);
  const lideres = useMemo(() => unitStaff.filter((f) => classifyRole(f) === "lider"), [unitStaff]);
  const viceLideres = useMemo(() => unitStaff.filter((f) => classifyRole(f) === "viceLider"), [unitStaff]);
  const administrativos = useMemo(() => unitStaff.filter((f) => classifyRole(f) === "administrativo"), [unitStaff]);
  const estagiarios = useMemo(() => unitStaff.filter((f) => classifyRole(f) === "estagiario"), [unitStaff]);
  const jovensAprendizes = useMemo(() => unitStaff.filter((f) => classifyRole(f) === "jovemAprendiz"), [unitStaff]);
  const outros = useMemo(() => unitStaff.filter((f) => classifyRole(f) === "outros"), [unitStaff]);

  // Export Organogram Data to Excel
  const handleExportExcel = () => {
    const dataToExport = unitStaff.map((f, idx) => ({
      "Nº": idx + 1,
      Unidade: f.unidade || "",
      Marca: f.marca || currentUnitMeta?.marca || "",
      Regional: f.regional || currentUnitMeta?.regional || "",
      Núcleo: f.nucleo || currentUnitMeta?.nucleo || "",
      CLUSTER: f.cluster || currentUnitMeta?.cluster || "",
      "Função / Cargo": f.funcao || f.cargo || "",
      Nome: f.nome || "",
      Status: f.status || "Ativo",
      Matrícula: f.matricula || "",
      CPF: f.cpf || "",
      "E-mail": f.email || "",
      "Telefone Principal": f.telefonePrincipal || f.telefone || "",
      "Telefone Atendimento": f.telefoneAtendimento || "",
      "PDV SalesForce": f.pdvSalesforce || "",
      "Tamanho Blusa": f.tamanhoBlusa || "",
      "Data Nascimento": f.dataNascimento || "",
      "Admissão SM": f.admissaoSm || "",
      "Admissão RH": f.admissaoRh || "",
      Desligamento: f.desligamento || "",
      "Última Alteração": f.dataAlteracao || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    const sheetName = selectedUnidade === "TODAS" ? "Organograma Regional" : `SM ${selectedUnidade}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `organograma_sm_${selectedUnidade.toLowerCase().replace(/\s+/g, "_")}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Unit Selector Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="p-2.5 bg-blue-50 rounded-2xl border border-blue-200/60 shadow-sm">
                <Building2 size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Organograma da Sala de Matrícula
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Estrutura hierárquica e dados cadastrais completos da equipe SM por unidade
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              disabled={unitStaff.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Exportar dados da equipe desta unidade em Excel"
            >
              <Download size={15} />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Imprimir Organograma"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Filters Bar: Unit Selector, Search and Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-4 border-t border-slate-100">
          {/* Unit Selector */}
          <div className="lg:col-span-4 flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Selecionar Unidade:
            </label>
            <select
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
              <option value="TODAS">🏢 Todas as Unidades ({availableUnidades.length})</option>
              {availableUnidades.map((u) => (
                <option key={u.nome} value={u.nome}>
                  {u.nome} {u.cluster ? `(${u.cluster})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="lg:col-span-5 flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Buscar Colaborador:
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, cargo, matrícula, e-mail, telefone..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3 flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Status:
            </label>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
              <button
                onClick={() => setStatusFilter("TODOS")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer text-[11px]",
                  statusFilter === "TODOS"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "hover:text-slate-900 text-slate-500"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter("Ativo")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer text-[11px]",
                  statusFilter === "Ativo"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "hover:text-slate-900 text-slate-500"
                )}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter("Licença")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer text-[11px]",
                  statusFilter === "Licença"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "hover:text-slate-900 text-slate-500"
                )}
              >
                Licença
              </button>
            </div>
          </div>
        </div>

        {/* Current Unit Badge & Metadata */}
        {currentUnitMeta && selectedUnidade !== "TODAS" && (
          <div className="bg-gradient-to-r from-blue-50/60 via-slate-50 to-indigo-50/40 p-4 rounded-2xl border border-blue-100/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-blue-900 text-sm flex items-center gap-1.5">
                <Building2 size={16} className="text-blue-600" />
                {currentUnitMeta.nome}
              </span>
              {currentUnitMeta.marca && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[10px]">
                  {currentUnitMeta.marca}
                </span>
              )}
              {currentUnitMeta.regional && (
                <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md font-semibold text-[10px]">
                  {currentUnitMeta.regional}
                </span>
              )}
              {currentUnitMeta.nucleo && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-semibold text-[10px]">
                  Núcleo: {currentUnitMeta.nucleo}
                </span>
              )}
              {currentUnitMeta.cluster && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-semibold text-[10px]">
                  CLUSTER: {currentUnitMeta.cluster}
                </span>
              )}
              {currentUnitMeta.codigo && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono text-[10px]">
                  Cód: {currentUnitMeta.codigo}
                </span>
              )}
            </div>

            {currentUnitMeta.endereco && (
              <div className="text-slate-500 flex items-center gap-1 text-[11px] max-w-lg truncate">
                <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{currentUnitMeta.endereco}</span>
              </div>
            )}
          </div>
        )}

        {/* Team Composition KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users size={12} className="text-blue-500" /> Total SM
            </span>
            <span className="text-xl font-black text-slate-900 mt-1">
              {unitStaff.length}
            </span>
          </div>

          <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/60 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Crown size={12} className="text-amber-500" /> Gestores
            </span>
            <span className="text-xl font-black text-amber-900 mt-1">
              {gestores.length}
            </span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/70 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Award size={12} className="text-amber-600" /> Líderes SM
            </span>
            <span className="text-xl font-black text-amber-950 mt-1">
              {lideres.length}
            </span>
          </div>

          <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/60 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
              <Shield size={12} className="text-blue-500" /> Sub-Líderes 02
            </span>
            <span className="text-xl font-black text-blue-900 mt-1">
              {viceLideres.length}
            </span>
          </div>

          <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100/60 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
              <User size={12} className="text-purple-500" /> Atendentes SM
            </span>
            <span className="text-xl font-black text-purple-900 mt-1">
              {administrativos.length}
            </span>
          </div>

          <div className="bg-sky-50/50 p-3 rounded-2xl border border-sky-100/60 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap size={12} className="text-sky-500" /> Estagiários
            </span>
            <span className="text-xl font-black text-sky-900 mt-1">
              {estagiarios.length}
            </span>
          </div>

          <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/60 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-500" /> Aprendizes
            </span>
            <span className="text-xl font-black text-emerald-900 mt-1">
              {jovensAprendizes.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Organogram Hierarchy Content */}
      {availableUnidades.length === 0 && funcionarios.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3 shadow-sm">
          <Building2 size={48} className="mx-auto text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">Nenhum colaborador ou unidade cadastrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cadastre as unidades e importe os colaboradores no <strong>Cadastro SM Regional</strong> em Administração para carregar a estrutura aqui.
          </p>
        </div>
      ) : unitStaff.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3 shadow-sm">
          <UserCheck size={44} className="mx-auto text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">
            Nenhum colaborador encontrado para os filtros selecionados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não há colaboradores cadastrados para a unidade{" "}
            <strong className="text-slate-800">{selectedUnidade}</strong> com os filtros aplicados.
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8 bg-slate-50/60 p-6 sm:p-8 rounded-3xl border border-slate-200/70">
          {/* Level 0: Gestor SM / Gestor Regional (Se houver) */}
          {gestores.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider px-1">
                <Crown size={18} className="text-amber-500" />
                1. Gestão SM / Gestor
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                  {gestores.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gestores.map((f) => (
                  <StaffCard
                    key={f.id}
                    funcionario={f}
                    tier="gestor"
                    onClick={() => setSelectedColab(f)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Level 1: Líder SM */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-wider px-1">
              <Crown size={18} className="text-amber-500" />
              {gestores.length > 0 ? "2. Líder da Sala de Matrícula" : "1. Líder da Sala de Matrícula"}
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                {lideres.length}
              </span>
            </div>

            {lideres.length === 0 ? (
              <div className="p-4 bg-amber-50/40 border border-amber-200/50 rounded-2xl text-xs text-amber-800/80 font-medium">
                Nenhum Líder cadastrado para esta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lideres.map((f) => (
                  <StaffCard
                    key={f.id}
                    funcionario={f}
                    tier="lider"
                    onClick={() => setSelectedColab(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Level 2: Sub-Líder / 02 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-blue-700 uppercase tracking-wider px-1">
              <Shield size={18} className="text-blue-500" />
              {gestores.length > 0 ? "3. Sub-Líder / 02" : "2. Sub-Líder / 02"}
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                {viceLideres.length}
              </span>
            </div>

            {viceLideres.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-400 font-medium">
                Nenhum 02 cadastrado para esta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viceLideres.map((f) => (
                  <StaffCard
                    key={f.id}
                    funcionario={f}
                    tier="viceLider"
                    onClick={() => setSelectedColab(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Level 3: Atendentes SM / Administrativos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-purple-700 uppercase tracking-wider px-1">
              <User size={18} className="text-purple-500" />
              {gestores.length > 0 ? "4. Atendentes SM / Administrativos" : "3. Atendentes SM / Administrativos"}
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                {administrativos.length}
              </span>
            </div>

            {administrativos.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-400 font-medium">
                Nenhum Atendente SM cadastrado nesta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {administrativos.map((f) => (
                  <StaffCard
                    key={f.id}
                    funcionario={f}
                    tier="administrativo"
                    onClick={() => setSelectedColab(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Level 4: Estagiários */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-sky-700 uppercase tracking-wider px-1">
              <GraduationCap size={18} className="text-sky-500" />
              {gestores.length > 0 ? "5. Estagiários SM" : "4. Estagiários SM"}
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full">
                {estagiarios.length}
              </span>
            </div>

            {estagiarios.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-400 font-medium">
                Nenhum Estagiário cadastrado nesta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {estagiarios.map((f) => (
                  <StaffCard
                    key={f.id}
                    funcionario={f}
                    tier="estagiario"
                    onClick={() => setSelectedColab(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Level 5: Jovem Aprendiz */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-700 uppercase tracking-wider px-1">
              <Award size={18} className="text-emerald-500" />
              {gestores.length > 0 ? "6. Jovem Aprendiz" : "5. Jovem Aprendiz"}
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                {jovensAprendizes.length}
              </span>
            </div>

            {jovensAprendizes.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-400 font-medium">
                Nenhum Jovem Aprendiz cadastrado nesta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jovensAprendizes.map((f) => (
                  <StaffCard
                    key={f.id}
                    funcionario={f}
                    tier="jovemAprendiz"
                    onClick={() => setSelectedColab(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Outros / Cargos Adicionais */}
          {outros.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider px-1">
                <Briefcase size={18} className="text-slate-500" />
                Demais Integrantes
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full">
                  {outros.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outros.map((f) => (
                  <StaffCard
                    key={f.id}
                    funcionario={f}
                    tier="outros"
                    onClick={() => setSelectedColab(f)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collaborator Full Details Modal */}
      {selectedColab && (
        <ColaboradorDetailModal
          colab={selectedColab}
          onClose={() => setSelectedColab(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// Individual Collaborator Card Component
// ----------------------------------------------------
interface StaffCardProps {
  funcionario: FuncionarioSM;
  tier: "gestor" | "lider" | "viceLider" | "administrativo" | "estagiario" | "jovemAprendiz" | "outros";
  onClick: () => void;
}

function StaffCard({ funcionario: f, tier, onClick }: StaffCardProps) {
  const isGestor = tier === "gestor";
  const isLider = tier === "lider";
  const isViceLider = tier === "viceLider";
  const isAtendente = tier === "administrativo";
  const isEstagiario = tier === "estagiario";
  const isAprendiz = tier === "jovemAprendiz";

  // Tier-based theme styles
  let cardClass = "bg-white border-slate-200 hover:border-slate-300";
  let avatarBg = "bg-slate-100 text-slate-700";
  let badgeClass = "bg-slate-100 text-slate-700";
  let titleColor = "text-slate-900";

  if (isGestor) {
    cardClass = "bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-400 shadow-md";
    avatarBg = "bg-white/20 text-white";
    badgeClass = "bg-amber-900/40 text-amber-100";
    titleColor = "text-white";
  } else if (isLider) {
    cardClass = "bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-400 shadow-md";
    avatarBg = "bg-white/20 text-white";
    badgeClass = "bg-amber-900/40 text-amber-100";
    titleColor = "text-white";
  } else if (isViceLider) {
    cardClass = "bg-white border-blue-200 hover:border-blue-300 shadow-sm";
    avatarBg = "bg-blue-50 text-blue-600";
    badgeClass = "bg-blue-100 text-blue-800";
    titleColor = "text-slate-900";
  } else if (isAtendente) {
    cardClass = "bg-white border-purple-200 hover:border-purple-300 shadow-sm";
    avatarBg = "bg-purple-50 text-purple-600";
    badgeClass = "bg-purple-100 text-purple-800";
    titleColor = "text-slate-900";
  } else if (isEstagiario) {
    cardClass = "bg-white border-sky-200 hover:border-sky-300 shadow-sm";
    avatarBg = "bg-sky-50 text-sky-600";
    badgeClass = "bg-sky-100 text-sky-800";
    titleColor = "text-slate-900";
  } else if (isAprendiz) {
    cardClass = "bg-white border-emerald-200 hover:border-emerald-300 shadow-sm";
    avatarBg = "bg-emerald-50 text-emerald-600";
    badgeClass = "bg-emerald-100 text-emerald-800";
    titleColor = "text-slate-900";
  }

  const isLightText = isGestor || isLider;
  const initial = (f.nome || "C").charAt(0).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md relative overflow-hidden",
        cardClass
      )}
    >
      <div>
        {/* Top Header inside Card */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full",
                  badgeClass
                )}
              >
                {isGestor && <Crown size={11} />}
                {isLider && <Crown size={11} />}
                {isViceLider && <Shield size={11} />}
                {isAtendente && <User size={11} />}
                {isEstagiario && <GraduationCap size={11} />}
                {isAprendiz && <Sparkles size={11} />}
                {f.funcao || f.cargo || "Colaborador"}
              </span>

              {f.status === "Licença" && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black rounded uppercase">
                  Licença
                </span>
              )}
            </div>

            <h4
              className={cn(
                "text-base font-bold leading-tight group-hover:underline underline-offset-2",
                titleColor
              )}
            >
              {f.nome}
            </h4>

            {f.matricula && (
              <p
                className={cn(
                  "text-[11px] font-mono font-medium flex items-center gap-1",
                  isLightText ? "text-amber-100" : "text-slate-400"
                )}
              >
                <CreditCard size={11} /> Matrícula: {f.matricula}
              </p>
            )}
          </div>

          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 shadow-sm",
              avatarBg
            )}
          >
            {initial}
          </div>
        </div>

        {/* Badges / Quick info pills */}
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
          {f.unidade && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold",
                isLightText ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              {f.unidade}
            </span>
          )}
          {f.pdvSalesforce && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-md font-bold flex items-center gap-1",
                isLightText ? "bg-white/15 text-white" : "bg-indigo-50 text-indigo-700"
              )}
            >
              <Store size={10} /> PDV: {f.pdvSalesforce}
            </span>
          )}
          {f.tamanhoBlusa && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-md font-medium flex items-center gap-1",
                isLightText ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              <Shirt size={10} /> {f.tamanhoBlusa}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Contact & Dates details */}
      <div
        className={cn(
          "mt-4 pt-3 border-t text-xs space-y-1 font-medium",
          isLightText
            ? "border-white/20 text-amber-100"
            : "border-slate-100 text-slate-600"
        )}
      >
        {f.cpf && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <FileText size={12} className="opacity-70 flex-shrink-0" />
            <span className="font-mono">CPF: {f.cpf}</span>
          </div>
        )}

        {(f.telefonePrincipal || f.telefone) && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <Phone size={12} className="opacity-70 flex-shrink-0" />
            <span>{f.telefonePrincipal || f.telefone}</span>
          </div>
        )}

        {f.email && (
          <div className="flex items-center gap-1.5 text-[11px] truncate">
            <Mail size={12} className="opacity-70 flex-shrink-0" />
            <span className="truncate">{f.email}</span>
          </div>
        )}

        {f.admissaoSm && (
          <div className="flex items-center gap-1.5 text-[10px] opacity-80 pt-0.5">
            <Clock size={11} className="flex-shrink-0" />
            <span>Admissão SM: {f.admissaoSm}</span>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <span
            className={cn(
              "text-[10px] font-bold flex items-center gap-0.5",
              isLightText ? "text-white" : "text-blue-600"
            )}
          >
            Ficha Completa <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Complete Collaborator Detail Modal
// ----------------------------------------------------
function ColaboradorDetailModal({
  colab: f,
  onClose,
}: {
  colab: FuncionarioSM;
  onClose: () => void;
}) {
  const initial = (f.nome || "C").charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 text-white font-black text-2xl flex items-center justify-center shadow-inner">
              {initial}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-extrabold uppercase rounded-full">
                  {f.funcao || f.cargo || "Colaborador SM"}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-black rounded-full uppercase",
                    f.status === "Ativo"
                      ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30"
                      : "bg-amber-500/30 text-amber-200 border border-amber-400/30"
                  )}
                >
                  {f.status || "Ativo"}
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-1 leading-tight">
                {f.nome}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {f.unidade} {f.cluster ? `• ${f.cluster}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section: Dados Corporativos & Pessoais */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Briefcase size={14} className="text-blue-600" />
              Identificação e Documentos
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Matrícula</span>
                <span className="text-xs font-black text-slate-800 font-mono">
                  {f.matricula || "Não informada"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">CPF</span>
                <span className="text-xs font-black text-slate-800 font-mono">
                  {f.cpf || "Não informado"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Data de Nascimento</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.dataNascimento || "Não informada"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">PDV Salesforce</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.pdvSalesforce || "Não informado"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Tamanho da Blusa</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.tamanhoBlusa || "M"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Status Atual</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.status || "Ativo"}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Contatos */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Phone size={14} className="text-emerald-600" />
              Contatos e Canais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Telefone Principal</span>
                  <span className="text-xs font-bold text-slate-800">
                    {f.telefonePrincipal || f.telefone || "Não informado"}
                  </span>
                </div>
                {(f.telefonePrincipal || f.telefone) && (
                  <a
                    href={`tel:${f.telefonePrincipal || f.telefone}`}
                    className="p-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors"
                    title="Ligar"
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Telefone Atendimento</span>
                  <span className="text-xs font-bold text-slate-800">
                    {f.telefoneAtendimento || "Não informado"}
                  </span>
                </div>
                {f.telefoneAtendimento && (
                  <a
                    href={`tel:${f.telefoneAtendimento}`}
                    className="p-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Ligar"
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2 flex items-center justify-between">
                <div className="truncate">
                  <span className="text-[10px] font-bold text-slate-400 block">E-mail Corporativo</span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {f.email || "Não informado"}
                  </span>
                </div>
                {f.email && (
                  <a
                    href={`mailto:${f.email}`}
                    className="p-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors flex-shrink-0"
                    title="Enviar e-mail"
                  >
                    <Mail size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Section: Estrutura da Unidade */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-purple-600" />
              Estrutura Organizacional
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Unidade</span>
                <span className="text-xs font-black text-slate-800">
                  {f.unidade || "Não vinculada"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Marca</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.marca || "Estácio"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Regional</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.regional || "Regional RJ"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">CLUSTER</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.cluster || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Histórico de Datas */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-600" />
              Datas e Histórico
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Admissão SM</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.admissaoSm || "-"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Admissão RH</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.admissaoRh || "-"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Desligamento</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.desligamento || "-"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block">Última Alteração</span>
                <span className="text-xs font-bold text-slate-800">
                  {f.dataAlteracao || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
