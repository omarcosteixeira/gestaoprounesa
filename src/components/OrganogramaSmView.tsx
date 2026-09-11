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
  UserCheck,
  Info,
  ExternalLink
} from "lucide-react";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";

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
                  Organograma Sala de Matrícula
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Visualização hierárquica e distribuição da equipe SM
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
              <span>Excel</span>
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
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Unidade SM:
            </label>
            <select
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all h-10"
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
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                placeholder="Nome, cargo, matrícula..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all h-10"
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
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Filtrar por Status:
            </label>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600 h-10">
              <button
                onClick={() => setStatusFilter("TODOS")}
                className={cn(
                  "flex-1 h-full rounded-lg transition-all text-center cursor-pointer text-[10px]",
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
                  "flex-1 h-full rounded-lg transition-all text-center cursor-pointer text-[10px]",
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
                  "flex-1 h-full rounded-lg transition-all text-center cursor-pointer text-[10px]",
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

        {/* Current Unit Metadata Badge */}
        {currentUnitMeta && selectedUnidade !== "TODAS" && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <Building2 size={16} />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {currentUnitMeta.nome}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                  {currentUnitMeta.regional || "Regional Não Definida"}
                </span>
              </div>
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

            <div className="flex flex-wrap items-center gap-2">
              {currentUnitMeta.marca && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[9px] border border-blue-100">
                  {currentUnitMeta.marca}
                </span>
              )}
              {currentUnitMeta.nucleo && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-bold text-[9px] border border-purple-100">
                  NÚCLEO: {currentUnitMeta.nucleo}
                </span>
              )}
              {currentUnitMeta.cluster && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold text-[9px] border border-amber-100">
                  CLUSTER: {currentUnitMeta.cluster}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 py-2 px-1 border-t border-slate-50">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Legenda:</span>
           <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600">
             <div className="w-3 h-3 rounded-full bg-teal-500" /> Gestão
           </div>
           <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
             <div className="w-3 h-3 rounded-full bg-emerald-500" /> Líderes
           </div>
           <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
             <div className="w-3 h-3 rounded-full bg-amber-500" /> Administrativo
           </div>
           <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600">
             <div className="w-3 h-3 rounded-full bg-orange-500" /> Estagiários
           </div>
        </div>
      </div>

      {/* Main Organogram Hierarchy Content */}
      <div className="bg-white/50 rounded-3xl p-8 min-h-[600px] border border-slate-100/50 shadow-inner">
        {unitStaff.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4 text-slate-300">
            <Users size={64} strokeWidth={1} />
            <p className="text-sm font-medium">Nenhum colaborador encontrado para os filtros selecionados.</p>
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
              onSelect={setSelectedColab}
            />
          </div>
        )}
      </div>

      {/* Detail Modal / Backdrop for selected collaborator */}
      <AnimatePresence>
        {selectedColab && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white relative"
             >
               <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-700">
                 <button 
                   onClick={() => setSelectedColab(null)}
                   className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all z-10"
                 >
                   <X size={20} />
                 </button>
                 <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-3xl border-4 border-white shadow-xl bg-slate-200 overflow-hidden">
                   {selectedColab.photoUrl ? (
                     <img src={selectedColab.photoUrl} alt={selectedColab.nome} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                       <User size={40} />
                     </div>
                   )}
                 </div>
               </div>

               <div className="pt-16 pb-8 px-8 space-y-6">
                 <div>
                   <h3 className="text-xl font-black text-slate-900">{selectedColab.nome}</h3>
                   <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">
                     {selectedColab.funcao || selectedColab.cargo}
                   </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                     <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Matrícula</span>
                     <span className="text-xs font-black text-slate-700">{selectedColab.matricula || "—"}</span>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                     <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Unidade</span>
                     <span className="text-xs font-black text-slate-700">{selectedColab.unidade || "—"}</span>
                   </div>
                 </div>

                 <div className="space-y-3">
                   {selectedColab.email && (
                     <div className="flex items-center gap-3 text-slate-600">
                       <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                         <Mail size={14} />
                       </div>
                       <span className="text-xs font-bold">{selectedColab.email}</span>
                     </div>
                   )}
                   {(selectedColab.telefonePrincipal || selectedColab.telefone) && (
                     <div className="flex items-center gap-3 text-slate-600">
                       <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                         <Phone size={14} />
                       </div>
                       <span className="text-xs font-bold">{selectedColab.telefonePrincipal || selectedColab.telefone}</span>
                     </div>
                   )}
                 </div>

                 <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className={cn(
                           "w-2 h-2 rounded-full",
                           selectedColab.status === "Ativo" ? "bg-emerald-500" : "bg-amber-500"
                         )} />
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                           {selectedColab.status || "Ativo"}
                         </span>
                       </div>
                       <button className="flex items-center gap-1.5 text-xs font-black text-blue-600 hover:underline">
                         Abrir Pasta Completa <ExternalLink size={12} />
                       </button>
                    </div>
                 </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tree Builder Component
function TreeBuilder({ gestores, lideres, viceLideres, administrativos, estagiarios, jovensAprendizes, outros, unitName, onSelect }: any) {
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

  // Roots: Gestores. If none, dummy root.
  const roots = gestores.length > 0 ? gestores : [{ nome: "Gestão " + unitName, cargo: "Vago", id: "dummy" }];

  return (
    <ul className="org-list">
      {roots.map((root, rootIndex) => {
        const myLideres = gestores.length > 0 ? chunkArray(lideres, roots.length)[rootIndex] || [] : lideres;
        
        return (
          <li key={rootIndex} className="org-item">
            <NodeWrapper f={root} level="A" color="teal" onSelect={onSelect} />
            {myLideres.length > 0 ? (
              <ul className="org-sublist">
                {myLideres.map((lider, lIndex) => {
                  const myLevelC = chunkArray(levelC_all, lideres.length)[lIndex] || [];
                  return (
                    <li key={lIndex} className="org-item">
                      <NodeWrapper f={lider} level="B" color="emerald" onSelect={onSelect} />
                      {myLevelC.length > 0 && (
                        <ul className="org-sublist">
                          {myLevelC.map((c, cIndex) => {
                            const flatCIndex = lIndex * myLevelC.length + cIndex; 
                            const myLevelD = chunkArray(levelD_all, levelC_all.length)[flatCIndex] || [];
                            return (
                              <li key={cIndex} className="org-item">
                                <NodeWrapper f={c} level="C" color="amber" onSelect={onSelect} />
                                {myLevelD.length > 0 && (
                                  <ul className="org-sublist">
                                    {myLevelD.map((d, dIndex) => (
                                      <li key={dIndex} className="org-item">
                                        <NodeWrapper f={d} level="D" color="orange" onSelect={onSelect} />
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
              levelC_all.length > 0 && (
                <ul className="org-sublist">
                  {levelC_all.map((c, cIndex) => {
                     const myLevelD = chunkArray(levelD_all, levelC_all.length)[cIndex] || [];
                     return (
                       <li key={cIndex} className="org-item">
                         <NodeWrapper f={c} level="C" color="amber" onSelect={onSelect} />
                         {myLevelD.length > 0 && (
                           <ul className="org-sublist">
                             {myLevelD.map((d, dIndex) => (
                               <li key={dIndex} className="org-item">
                                 <NodeWrapper f={d} level="D" color="orange" onSelect={onSelect} />
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

function NodeWrapper({ f, level, color, onSelect }: { f: any, level: string, color: string, onSelect: any }) {
  const colorMap: any = {
    teal: "from-teal-600 to-teal-700 border-teal-200 bg-teal-50 text-teal-800",
    emerald: "from-emerald-500 to-emerald-600 border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "from-amber-500 to-amber-600 border-amber-200 bg-amber-50 text-amber-800",
    orange: "from-orange-500 to-orange-600 border-orange-200 bg-orange-50 text-orange-800",
  };

  const badgeColor: any = {
    teal: "bg-teal-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
  };

  const isSmall = level === "D";

  return (
    <div className={cn(
      "org-node flex flex-col items-center group cursor-pointer perspective-1000",
      isSmall ? "w-32 mb-6" : "w-60 mb-8"
    )} onClick={() => f.id !== "dummy" && onSelect(f)}>
       <motion.div 
         whileHover={{ y: -4, scale: 1.02 }}
         className={cn(
           "relative bg-white rounded-2xl shadow-sm border border-slate-200 w-full overflow-hidden transition-all group-hover:shadow-xl group-hover:border-blue-200",
           isSmall ? "p-3" : "p-4"
         )}
       >
         {/* Top Accent Bar */}
         <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", colorMap[color])} />
         
         <div className={cn("flex flex-col items-center", isSmall ? "space-y-2" : "space-y-3")}>
            {/* Avatar Container */}
            <div className={cn(
              "rounded-full border-2 border-white shadow-md bg-slate-100 overflow-hidden relative flex-shrink-0",
              isSmall ? "w-12 h-12" : "w-16 h-16"
            )}>
               {f.photoUrl ? (
                 <img src={f.photoUrl} alt={f.nome} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-sm uppercase">
                    {(f.nome || "?")[0]}
                 </div>
               )}
            </div>

            {/* Content */}
            <div className="text-center w-full min-w-0">
               <h4 className={cn(
                 "font-black text-slate-800 truncate leading-tight",
                 isSmall ? "text-[10px]" : "text-[11px]"
               )}>
                 {f.nome}
               </h4>
               <p className={cn(
                 "text-slate-400 font-bold uppercase tracking-tighter truncate mt-0.5",
                 isSmall ? "text-[8px]" : "text-[9px]"
               )}>
                 {f.funcao || f.cargo}
               </p>
            </div>

            {/* Status Badge (Small dots) */}
            <div className={cn(
              "absolute top-2 right-2 w-1.5 h-1.5 rounded-full",
              f.status === "Licença" ? "bg-amber-400" : "bg-emerald-400"
            )} />
         </div>
         
         {/* Level Badge */}
         <div className={cn(
           "absolute bottom-0 right-0 px-2 py-0.5 text-white text-[7px] font-black rounded-tl-lg",
           badgeColor[color]
         )}>
           NÍVEL {level}
         </div>
       </motion.div>
    </div>
  );
}
