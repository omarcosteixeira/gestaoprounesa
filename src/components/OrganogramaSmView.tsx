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
        </div>
      ) : unitStaff.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3 shadow-sm">
          <UserCheck size={44} className="mx-auto text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">
            Nenhum colaborador encontrado
          </h3>
        </div>
      ) : (
        <div className="org-tree overflow-x-auto pb-12 w-full flex justify-center">
          <TreeBuilder 
            gestores={gestores} 
            lideres={lideres} 
            viceLideres={viceLideres} 
            administrativos={administrativos} 
            estagiarios={estagiarios} 
            jovensAprendizes={jovensAprendizes} 
            outros={outros}
            unitName={selectedUnidade}
          />
        </div>
      )}
    </div>
  );
}

// Tree Builder Component
function TreeBuilder({ gestores, lideres, viceLideres, administrativos, estagiarios, jovensAprendizes, outros, unitName }: any) {
  const levelC_all = [...viceLideres, ...administrativos, ...outros];
  const levelD_all = [...estagiarios, ...jovensAprendizes];

  // Helper to chunk array
  const chunkArray = (arr, numChunks) => {
    if (numChunks <= 0) return [arr];
    const result = Array.from({ length: numChunks }, () => []);
    arr.forEach((item, index) => {
      result[index % numChunks].push(item);
    });
    return result;
  };

  // Build the tree nodes recursively or statically
  // Since we only have 4 levels, let's build it statically

  // Roots: Gestores. If none, dummy root.
  const roots = gestores.length > 0 ? gestores : [{ nome: "Gestão " + unitName, cargo: "Vago", id: "dummy" }];

  return (
    <ul>
      {roots.map((root, rootIndex) => {
        // Divide lideres among roots
        const myLideres = gestores.length > 0 ? chunkArray(lideres, roots.length)[rootIndex] || [] : lideres;
        
        return (
          <li key={rootIndex}>
            <LevelANode f={root} />
            {myLideres.length > 0 ? (
              <ul>
                {myLideres.map((lider, lIndex) => {
                  const myLevelC = chunkArray(levelC_all, lideres.length)[lIndex] || [];
                  return (
                    <li key={lIndex}>
                      <LevelBNode f={lider} />
                      {myLevelC.length > 0 && (
                        <ul>
                          {myLevelC.map((c, cIndex) => {
                            // divide D among ALL C
                            const flatCIndex = lIndex * myLevelC.length + cIndex; 
                            // simpler: chunk D among C in this specific branch? No, just globally chunk D over all C.
                            // but this is local to branch. Let's just chunk D over myLevelC
                            const myLevelD = chunkArray(levelD_all, levelC_all.length)[flatCIndex] || [];
                            return (
                              <li key={cIndex}>
                                <LevelCNode f={c} />
                                {myLevelD.length > 0 && (
                                  <ul>
                                    {myLevelD.map((d, dIndex) => (
                                      <li key={dIndex}>
                                        <LevelDNode f={d} />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              // If no lideres, connect level C directly
              levelC_all.length > 0 && (
                <ul>
                  {levelC_all.map((c, cIndex) => {
                     const myLevelD = chunkArray(levelD_all, levelC_all.length)[cIndex] || [];
                     return (
                       <li key={cIndex}>
                         <LevelCNode f={c} />
                         {myLevelD.length > 0 && (
                           <ul>
                             {myLevelD.map((d, dIndex) => (
                               <li key={dIndex}>
                                 <LevelDNode f={d} />
                               </li>
                             ))}
                           </ul>
                         )}
                       </li>
                     );
                  })}
                </ul>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}

const AvatarPlaceholder = ({ name }: { name?: string }) => (
  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl uppercase">
    {(name || "U")[0]}
  </div>
);

function LevelANode({ f }: { f: any }) {
  return (
    <div className="flex flex-col items-center relative z-10 w-64 mb-4 mx-4 mt-8">
      <div className="w-20 h-20 rounded-full border-[6px] border-white shadow-sm z-30 bg-slate-200 overflow-hidden absolute -top-10">
         <AvatarPlaceholder name={f.nome} />
      </div>
      <div className="bg-white rounded-[2rem] shadow-lg relative w-full pt-10 pb-4 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-8 bg-teal-600 rounded-l-[2rem]"></div>
        <div className="absolute top-0 right-6 bg-teal-600 text-white text-[9px] font-bold px-3 py-1 rounded-b-xl z-20 shadow-sm">LEVEL A</div>
        <div className="relative z-10 pl-2">
          <div className="text-teal-600 font-extrabold text-[12px] uppercase leading-tight truncate">{f.nome}</div>
          <div className="text-slate-400 text-[9px] mt-0.5 font-medium line-clamp-2 leading-snug">{f.funcao || f.cargo || "Gestor"}</div>
        </div>
      </div>
    </div>
  );
}

function LevelBNode({ f }: { f: any }) {
  return (
    <div className="flex items-center relative z-10 w-64 mb-4 mx-4 bg-white rounded-[2rem] shadow-md pr-4 py-2 mt-4 overflow-hidden">
      <div className="absolute top-0 right-6 bg-emerald-500 text-white text-[9px] font-bold px-3 py-1 rounded-b-xl z-20 shadow-sm">LEVEL B</div>
      <div className="absolute top-0 bottom-0 left-0 w-12 bg-emerald-500 rounded-l-[2rem]"></div>
      
      <div className="w-14 h-14 rounded-full border-[4px] border-white shadow-sm bg-slate-200 overflow-hidden relative z-10 -ml-1">
         <AvatarPlaceholder name={f.nome} />
      </div>

      <div className="ml-3 text-left w-full pt-3 relative z-10">
        <div className="text-emerald-600 font-extrabold text-[11px] uppercase leading-tight truncate">{f.nome}</div>
        <div className="text-slate-400 text-[9px] leading-tight line-clamp-2 mt-0.5 font-medium">{f.funcao || f.cargo}</div>
      </div>
    </div>
  );
}

function LevelCNode({ f }: { f: any }) {
  return (
    <div className="flex items-center relative z-10 w-56 mb-4 mx-4 bg-white rounded-[2rem] shadow-md pr-4 py-2 mt-4 overflow-hidden">
      <div className="absolute top-0 right-4 bg-amber-500 text-white text-[9px] font-bold px-3 py-1 rounded-b-xl z-20 shadow-sm">LEVEL C</div>
      <div className="absolute top-0 bottom-0 left-0 w-10 bg-amber-500 rounded-l-[2rem]"></div>
      
      <div className="w-12 h-12 rounded-full border-[4px] border-white shadow-sm bg-slate-200 overflow-hidden relative z-10 ml-0">
         <AvatarPlaceholder name={f.nome} />
      </div>

      <div className="ml-2 text-left w-full pt-3 relative z-10">
        <div className="text-amber-500 font-extrabold text-[10px] uppercase leading-tight truncate">{f.nome}</div>
        <div className="text-slate-400 text-[8px] leading-tight line-clamp-2 mt-0.5 font-medium">{f.funcao || f.cargo}</div>
      </div>
    </div>
  );
}

function LevelDNode({ f }: { f: any }) {
  return (
    <div className="flex flex-col items-center relative z-10 w-32 mb-4 mx-2 mt-2">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute top-0 bottom-0 left-0 right-1/2 bg-orange-500 rounded-l-full"></div>
        <div className="absolute bottom-0 right-0 left-1/2 top-1/2 bg-orange-500 rounded-br-full"></div>
        <div className="w-14 h-14 rounded-full border-[3px] border-white shadow-sm bg-slate-200 overflow-hidden relative z-10">
          <AvatarPlaceholder name={f.nome} />
        </div>
      </div>
      <div className="text-center mt-3 relative z-10 w-full bg-slate-50/50 rounded-xl p-1 backdrop-blur-sm">
        <div className="text-slate-600 font-extrabold text-[10px] uppercase leading-tight truncate">{f.nome}</div>
        <div className="text-slate-500 text-[8px] line-clamp-2 font-medium leading-snug">{f.funcao || f.cargo}</div>
      </div>
    </div>
  );
}
