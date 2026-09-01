import React, { useState, useMemo, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, COLLECTIONS, handleFirestoreError, OperationType } from "../firebase";
import {
  ControleConcorrencia,
  SWOTItem,
  CursoConcorrente,
  PlanoAtaque,
  EvidenciaClienteOculto,
  AnexoClienteOculto,
  HistoricoPreco,
  UnidadeRegional,
  CursoDisponivel,
  PrecoInstituicao,
} from "../types";
import {
  Target,
  Search,
  Plus,
  Trash2,
  Edit2,
  Building2,
  MapPin,
  Phone,
  Globe,
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  TrendingUp,
  TrendingDown,
  Eye,
  ShieldAlert,
  HelpCircle,
  BarChart3,
  Layers,
  ChevronRight,
  UserCheck,
  X,
} from "lucide-react";

interface ControleConcorrenciaViewProps {
  data: ControleConcorrencia[];
  unidadesRegional?: UnidadeRegional[];
  cursosDisponiveis?: CursoDisponivel[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function ControleConcorrenciaView({
  data,
  unidadesRegional = [],
  cursosDisponiveis = [],
  onToast,
}: ControleConcorrenciaViewProps) {
  // Navigation views: "concorrentes" | "comparativo" | "cliente_oculto"
  const [activeMainTab, setActiveMainTab] = useState<"concorrentes" | "comparativo" | "cliente_oculto">("concorrentes");
  const [selectedConcorrenteId, setSelectedConcorrenteId] = useState<string | null>(null);

  // Filters for Competitor Cards List
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCidade, setFilterCidade] = useState("");
  const [filterModalidade, setFilterModalidade] = useState("");

  // Competitor Modal Form
  const [isAddingConcorrente, setIsAddingConcorrente] = useState(false);
  const [editingConcorrente, setEditingConcorrente] = useState<ControleConcorrencia | null>(null);
  const [concorrenteForm, setConcorrenteForm] = useState({
    ies: "",
    razaoSocial: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "UF",
    cep: "",
    telefone: "",
    site: "",
    observacoes: "",
    unidadeVinculada: "",
  });

  // Global state for mystery shopper evidences and institutional prices
  const [evidenciasGlobal, setEvidenciasGlobal] = useState<EvidenciaClienteOculto[]>([]);
  const [precosMinhaInst, setPrecosMinhaInst] = useState<PrecoInstituicao[]>([]);

  // Listen to standalone collections for Evidences & Institutional Prices
  useEffect(() => {
    let unsubEv = () => {};
    let unsubPrecos = () => {};
    try {
      if (COLLECTIONS.EVIDENCIAS_CLIENTE_OCULTO) {
        unsubEv = onSnapshot(
          collection(db, COLLECTIONS.EVIDENCIAS_CLIENTE_OCULTO),
          (snap) => {
            setEvidenciasGlobal(
              snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvidenciaClienteOculto))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, COLLECTIONS.EVIDENCIAS_CLIENTE_OCULTO)
        );
      }
      if (COLLECTIONS.PRECOS_INSTITUICAO) {
        unsubPrecos = onSnapshot(
          collection(db, COLLECTIONS.PRECOS_INSTITUICAO),
          (snap) => {
            setPrecosMinhaInst(
              snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrecoInstituicao))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, COLLECTIONS.PRECOS_INSTITUICAO)
        );
      }
    } catch (e) {
      console.error("Error subscribing to secondary collections:", e);
    }
    return () => {
      unsubEv();
      unsubPrecos();
    };
  }, []);

  // Selected competitor object
  const selectedConcorrente = useMemo(() => {
    return data.find((c) => c.id === selectedConcorrenteId) || null;
  }, [data, selectedConcorrenteId]);

  // Derived unique cities & modalities for filters
  const citiesList = useMemo(() => {
    const setC = new Set<string>();
    data.forEach((c) => {
      if (c.cidade) setC.add(c.cidade);
      if (c.bairro) setC.add(c.bairro);
    });
    return Array.from(setC).sort();
  }, [data]);

  const filteredConcorrentes = useMemo(() => {
    return data.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchName =
        item.ies.toLowerCase().includes(term) ||
        (item.razaoSocial || "").toLowerCase().includes(term) ||
        (item.bairro || "").toLowerCase().includes(term) ||
        (item.cidade || "").toLowerCase().includes(term);

      const matchCity = !filterCidade || item.cidade === filterCidade || item.bairro === filterCidade;

      const matchModality =
        !filterModalidade ||
        (item.cursos || []).some((c) => c.modalidade === filterModalidade);

      return matchName && matchCity && matchModality;
    });
  }, [data, searchTerm, filterCidade, filterModalidade]);

  // Top KPIs
  const totalConcorrentes = data.length;
  const countSWOT = useMemo(() => {
    return data.filter((c) => c.swot && c.swot.length > 0).length;
  }, [data]);
  const totalPlanosAtaque = useMemo(() => {
    return data.reduce((acc, c) => acc + (c.planoAtaque?.length || 0), 0);
  }, [data]);
  const totalEvidencias = useMemo(() => {
    const embeddedCount = data.reduce((acc, c) => acc + (c.evidencias?.length || 0), 0);
    return Math.max(embeddedCount, evidenciasGlobal.length);
  }, [data, evidenciasGlobal]);

  // Save/Update Competitor CRUD
  const handleOpenAddConcorrente = () => {
    setEditingConcorrente(null);
    setConcorrenteForm({
      ies: "",
      razaoSocial: "",
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "UF",
      cep: "",
      telefone: "",
      site: "",
      observacoes: "",
      unidadeVinculada: "",
    });
    setIsAddingConcorrente(true);
  };

  const handleEditConcorrenteClick = (c: ControleConcorrencia) => {
    setEditingConcorrente(c);
    setConcorrenteForm({
      ies: c.ies || "",
      razaoSocial: c.razaoSocial || "",
      rua: c.rua || "",
      numero: c.numero || "",
      bairro: c.bairro || "",
      cidade: c.cidade || "",
      estado: c.estado || "UF",
      cep: c.cep || "",
      telefone: c.telefone || "",
      site: c.site || "",
      observacoes: c.observacoes || c.observacao || "",
      unidadeVinculada: c.unidadeVinculada || "",
    });
    setIsAddingConcorrente(true);
  };

  const handleSaveConcorrente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concorrenteForm.ies.trim()) {
      onToast("Nome do concorrente (IES) é obrigatório!", "error");
      return;
    }
    if (!concorrenteForm.telefone.trim()) {
      onToast("Telefone do concorrente é obrigatório!", "error");
      return;
    }

    try {
      const payload = {
        ies: concorrenteForm.ies.trim(),
        razaoSocial: concorrenteForm.razaoSocial.trim(),
        rua: concorrenteForm.rua.trim(),
        numero: concorrenteForm.numero.trim(),
        bairro: concorrenteForm.bairro.trim(),
        cidade: concorrenteForm.cidade.trim(),
        estado: concorrenteForm.estado.trim(),
        cep: concorrenteForm.cep.trim(),
        telefone: concorrenteForm.telefone.trim(),
        site: concorrenteForm.site.trim(),
        observacoes: concorrenteForm.observacoes.trim(),
        observacao: concorrenteForm.observacoes.trim(),
        unidadeVinculada: concorrenteForm.unidadeVinculada,
        updatedAt: serverTimestamp(),
      };

      if (editingConcorrente) {
        await updateDoc(doc(db, COLLECTIONS.CONTROLE_CONCORRENCIA, editingConcorrente.id), payload);
        onToast("Concorrente atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, COLLECTIONS.CONTROLE_CONCORRENCIA), {
          ...payload,
          swot: [],
          cursos: [],
          planoAtaque: [],
          evidencias: [],
          createdAt: serverTimestamp(),
        });
        onToast("Concorrente cadastrado com sucesso!", "success");
      }

      setIsAddingConcorrente(false);
      setEditingConcorrente(null);
    } catch (err: any) {
      onToast(`Erro ao salvar concorrente: ${err.message}`, "error");
    }
  };

  const handleDeleteConcorrente = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o concorrente "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.CONTROLE_CONCORRENCIA, id));
      if (selectedConcorrenteId === id) setSelectedConcorrenteId(null);
      onToast("Concorrente excluído com sucesso!", "success");
    } catch (err: any) {
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Navigation Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <Target className="text-indigo-600" size={28} />
            Controle de Concorrência Estratégico
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Mapeie concorrentes, analise SWOT, compare preços e acompanhe evidências de cliente oculto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveMainTab("concorrentes");
              setSelectedConcorrenteId(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeMainTab === "concorrentes" && !selectedConcorrenteId
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Building2 size={18} />
            Concorrentes
          </button>
          <button
            onClick={() => {
              setActiveMainTab("comparativo");
              setSelectedConcorrenteId(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeMainTab === "comparativo"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <BarChart3 size={18} />
            Comparativo de Preços
          </button>
          <button
            onClick={() => {
              setActiveMainTab("cliente_oculto");
              setSelectedConcorrenteId(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeMainTab === "cliente_oculto"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Eye size={18} />
            Cliente Oculto
          </button>
        </div>
      </div>

      {/* Top Dashboard KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Concorrentes Mapeados</p>
            <p className="text-2xl font-black text-slate-800">{totalConcorrentes}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-bold shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Análises SWOT</p>
            <p className="text-2xl font-black text-slate-800">{countSWOT}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-bold shrink-0">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Planos de Ataque</p>
            <p className="text-2xl font-black text-slate-800">{totalPlanosAtaque}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-bold shrink-0">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Evidências de Cliente Oculto</p>
            <p className="text-2xl font-black text-slate-800">{totalEvidencias}</p>
          </div>
        </div>
      </div>

      {/* VIEW 1: COMPETITOR LIST & CARDS */}
      {activeMainTab === "concorrentes" && !selectedConcorrente && (
        <div className="space-y-6">
          {/* Controls & Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por IES, razão social ou bairro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={filterCidade}
                onChange={(e) => setFilterCidade(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas as Cidades / Bairros</option>
                {citiesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={filterModalidade}
                onChange={(e) => setFilterModalidade(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas as Modalidades</option>
                <option value="Presencial">Presencial</option>
                <option value="Semipresencial">Semipresencial</option>
                <option value="EAD">EAD</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddConcorrente}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 shrink-0"
            >
              <Plus size={18} /> Novo Concorrente
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredConcorrentes.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-100">
                <Building2 size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Nenhum concorrente encontrado</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Cadastre um novo concorrente ou modifique os filtros acima.
                </p>
              </div>
            ) : (
              filteredConcorrentes.map((item) => {
                const totalCursosCount = item.cursos?.length || (item.curso ? 1 : 0);
                const swotItemsCount = item.swot?.length || 0;
                const planosAtaqueCount = item.planoAtaque?.length || 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md uppercase tracking-wider mb-1.5">
                            {item.unidadeVinculada || "Sem Campus Vinculado"}
                          </span>
                          <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {item.ies}
                          </h3>
                          {item.razaoSocial && (
                            <p className="text-xs text-slate-400 font-medium">{item.razaoSocial}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-90">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditConcorrenteClick(item);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar concorrente"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConcorrente(item.id, item.ies);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir concorrente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Info list */}
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex items-start gap-2">
                          <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            {[item.rua, item.numero, item.bairro, item.cidade, item.estado]
                              .filter(Boolean)
                              .join(", ") || item.bairro || "Endereço não especificado"}
                          </span>
                        </div>

                        {item.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone size={15} className="text-slate-400 shrink-0" />
                            <span>{item.telefone}</span>
                          </div>
                        )}

                        {item.site && (
                          <div className="flex items-center gap-2">
                            <Globe size={15} className="text-slate-400 shrink-0" />
                            <a
                              href={item.site.startsWith("http") ? item.site : `https://${item.site}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-indigo-600 hover:underline truncate"
                            >
                              {item.site}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Counters Badges */}
                      <div className="pt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                        <div className="bg-slate-50 p-2 rounded-xl text-slate-600">
                          <p className="text-slate-400 text-[10px] font-normal uppercase">Cursos</p>
                          <p className="text-sm font-black text-slate-800">{totalCursosCount}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-slate-600">
                          <p className="text-slate-400 text-[10px] font-normal uppercase">SWOT</p>
                          <p className="text-sm font-black text-slate-800">{swotItemsCount}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-slate-600">
                          <p className="text-slate-400 text-[10px] font-normal uppercase">Plano Ataque</p>
                          <p className="text-sm font-black text-slate-800">{planosAtaqueCount}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedConcorrenteId(item.id)}
                      className="w-full bg-slate-50 hover:bg-indigo-50 border-t border-slate-100 py-3 px-5 text-indigo-600 font-bold text-sm flex items-center justify-between transition-colors group-hover:bg-indigo-600 group-hover:text-white"
                    >
                      <span>Abrir Ficha do Concorrente</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FICHA DO CONCORRENTE (PAGE DETAILS WITH TABS) */}
      {activeMainTab === "concorrentes" && selectedConcorrente && (
        <FichaConcorrenteView
          concorrente={selectedConcorrente}
          unidadesRegional={unidadesRegional}
          onBack={() => setSelectedConcorrenteId(null)}
          onEdit={() => handleEditConcorrenteClick(selectedConcorrente)}
          onToast={onToast}
        />
      )}

      {/* VIEW 3: COMPARATIVO DE PREÇOS */}
      {activeMainTab === "comparativo" && (
        <ComparativoPrecosView
          concorrentes={data}
          cursosDisponiveis={cursosDisponiveis}
          precosMinhaInst={precosMinhaInst}
          onToast={onToast}
        />
      )}

      {/* VIEW 4: EVIDÊNCIAS DE CLIENTE OCULTO */}
      {activeMainTab === "cliente_oculto" && (
        <EvidenciasClienteOcultoView
          concorrentes={data}
          evidenciasGlobal={evidenciasGlobal}
          onToast={onToast}
        />
      )}

      {/* MODAL: ADD / EDIT CONCORRENTE */}
      {isAddingConcorrente && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Building2 className="text-indigo-600" size={24} />
                {editingConcorrente ? "Editar Concorrente" : "Novo Concorrente"}
              </h3>
              <button
                onClick={() => setIsAddingConcorrente(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveConcorrente} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Nome / IES *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Faculdade Anhanguera"
                    value={concorrenteForm.ies}
                    onChange={(e) => setConcorrenteForm({ ...concorrenteForm, ies: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Razão Social (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Razão Social completa"
                    value={concorrenteForm.razaoSocial}
                    onChange={(e) => setConcorrenteForm({ ...concorrenteForm, razaoSocial: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Campus/Unidade Vinculada (Opcional)
                  </label>
                  <select
                    value={concorrenteForm.unidadeVinculada}
                    onChange={(e) => setConcorrenteForm({ ...concorrenteForm, unidadeVinculada: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione a Unidade...</option>
                    {unidadesRegional.map((u) => (
                      <option key={u.id || u.nome} value={u.nome}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={concorrenteForm.telefone}
                    onChange={(e) => setConcorrenteForm({ ...concorrenteForm, telefone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Site / URL (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://exemplo.com.br"
                    value={concorrenteForm.site}
                    onChange={(e) => setConcorrenteForm({ ...concorrenteForm, site: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Endereço Completo */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Rua / Logradouro (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Rua..."
                      value={concorrenteForm.rua}
                      onChange={(e) => setConcorrenteForm({ ...concorrenteForm, rua: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Número (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={concorrenteForm.numero}
                      onChange={(e) => setConcorrenteForm({ ...concorrenteForm, numero: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Bairro (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={concorrenteForm.bairro}
                      onChange={(e) => setConcorrenteForm({ ...concorrenteForm, bairro: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Cidade (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={concorrenteForm.cidade}
                      onChange={(e) => setConcorrenteForm({ ...concorrenteForm, cidade: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Estado / CEP (Opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="UF"
                        value={concorrenteForm.estado}
                        onChange={(e) => setConcorrenteForm({ ...concorrenteForm, estado: e.target.value })}
                        className="w-16 px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none uppercase focus:ring-2 focus:ring-indigo-500 text-center"
                      />
                      <input
                        type="text"
                        placeholder="CEP"
                        value={concorrenteForm.cep}
                        onChange={(e) => setConcorrenteForm({ ...concorrenteForm, cep: e.target.value })}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Observações (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais sobre o concorrente..."
                    value={concorrenteForm.observacoes}
                    onChange={(e) => setConcorrenteForm({ ...concorrenteForm, observacoes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingConcorrente(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md shadow-indigo-100"
                >
                  {editingConcorrente ? "Salvar Alterações" : "Cadastrar Concorrente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT 1: FICHA DO CONCORRENTE (PAGE DETAIL WITH TABS)
   ========================================================================= */
function FichaConcorrenteView({
  concorrente,
  unidadesRegional,
  onBack,
  onEdit,
  onToast,
}: {
  concorrente: ControleConcorrencia;
  unidadesRegional: UnidadeRegional[];
  onBack: () => void;
  onEdit: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [activeFichaTab, setActiveFichaTab] = useState<"swot" | "cursos" | "plano">("swot");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Competitor Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <button
            onClick={onBack}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para Concorrentes
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black text-slate-800">{concorrente.ies}</h2>
            {concorrente.unidadeVinculada && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                {concorrente.unidadeVinculada}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin size={14} className="text-slate-400" />
              {[concorrente.rua, concorrente.numero, concorrente.bairro, concorrente.cidade, concorrente.estado]
                .filter(Boolean)
                .join(", ") || concorrente.bairro || "Sem endereço"}
            </span>
            {concorrente.telefone && (
              <span className="flex items-center gap-1">
                <Phone size={14} className="text-slate-400" /> {concorrente.telefone}
              </span>
            )}
            {concorrente.site && (
              <a
                href={concorrente.site.startsWith("http") ? concorrente.site : `https://${concorrente.site}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Globe size={14} /> {concorrente.site}
              </a>
            )}
          </p>
        </div>

        <button
          onClick={onEdit}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all"
        >
          <Edit2 size={16} /> Editar Dados
        </button>
      </div>

      {/* Internal Tabs */}
      <div className="flex border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveFichaTab("swot")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeFichaTab === "swot"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers size={18} /> Análise SWOT
        </button>
        <button
          onClick={() => setActiveFichaTab("cursos")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeFichaTab === "cursos"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpenIcon size={18} /> Cursos & Preços
        </button>
        <button
          onClick={() => setActiveFichaTab("plano")}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeFichaTab === "plano"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Target size={18} /> Plano de Ataque
        </button>
      </div>

      {/* TAB CONTENT 1: SWOT */}
      {activeFichaTab === "swot" && (
        <SwotTab concorrente={concorrente} onToast={onToast} />
      )}

      {/* TAB CONTENT 2: CURSOS & PREÇOS */}
      {activeFichaTab === "cursos" && (
        <CursosTab concorrente={concorrente} onToast={onToast} />
      )}

      {/* TAB CONTENT 3: PLANO DE ATAQUE */}
      {activeFichaTab === "plano" && (
        <PlanoAtaqueTab concorrente={concorrente} onToast={onToast} />
      )}
    </div>
  );
}

function BookOpenIcon({ size }: { size: number }) {
  return <FileText size={size} />;
}

/* =========================================================================
   SUB-COMPONENT 1.1: SWOT TAB (PONTOS FORTES, FRACOS, OPORTUNIDADES, AMEAÇAS)
   ========================================================================= */
function SwotTab({
  concorrente,
  onToast,
}: {
  concorrente: ControleConcorrencia;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [swotList, setSwotList] = useState<SWOTItem[]>(concorrente.swot || []);
  const [newItemText, setNewItemText] = useState({ forte: "", fraco: "", oportunidade: "", ameaca: "" });

  useEffect(() => {
    setSwotList(concorrente.swot || []);
  }, [concorrente.swot]);

  const saveSwotItems = async (updated: SWOTItem[]) => {
    try {
      setSwotList(updated);
      await updateDoc(doc(db, COLLECTIONS.CONTROLE_CONCORRENCIA, concorrente.id), {
        swot: updated,
        updatedAt: serverTimestamp(),
      });
      onToast("Análise SWOT atualizada!", "success");
    } catch (e: any) {
      onToast(`Erro ao salvar SWOT: ${e.message}`, "error");
    }
  };

  const handleAddItem = (tipo: 'forte' | 'fraco' | 'oportunidade' | 'ameaca') => {
    const text = newItemText[tipo].trim();
    if (!text) return;

    const newItem: SWOTItem = {
      id: Math.random().toString(36).substring(2, 9),
      tipo,
      texto: text,
      createdAt: new Date().toISOString(),
    };

    const updated = [...swotList, newItem];
    saveSwotItems(updated);
    setNewItemText({ ...newItemText, [tipo]: "" });
  };

  const handleDeleteItem = (id: string) => {
    const updated = swotList.filter((item) => item.id !== id);
    saveSwotItems(updated);
  };

  const getQuadrant = (tipo: 'forte' | 'fraco' | 'oportunidade' | 'ameaca') => {
    return swotList.filter((item) => item.tipo === tipo);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pontos Fortes */}
      <div className="bg-emerald-50/60 border border-emerald-200/70 p-5 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-emerald-900 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            Pontos Fortes
          </h3>
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full">
            {getQuadrant('forte').length} itens
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Adicionar ponto forte..."
            value={newItemText.forte}
            onChange={(e) => setNewItemText({ ...newItemText, forte: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem('forte')}
            className="flex-1 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={() => handleAddItem('forte')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {getQuadrant('forte').length === 0 ? (
            <p className="text-xs italic text-emerald-700/60 text-center py-4">
              Nenhum item neste quadrante ainda
            </p>
          ) : (
            getQuadrant('forte').map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex justify-between items-center text-sm font-medium text-slate-700"
              >
                <span>{item.texto}</span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pontos Fracos */}
      <div className="bg-rose-50/60 border border-rose-200/70 p-5 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-rose-900 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-600" />
            Pontos Fracos
          </h3>
          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-xs font-black rounded-full">
            {getQuadrant('fraco').length} itens
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Adicionar ponto fraco..."
            value={newItemText.fraco}
            onChange={(e) => setNewItemText({ ...newItemText, fraco: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem('fraco')}
            className="flex-1 px-4 py-2 bg-white border border-rose-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            onClick={() => handleAddItem('fraco')}
            className="bg-rose-600 hover:bg-rose-700 text-white p-2.5 rounded-xl transition-all"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {getQuadrant('fraco').length === 0 ? (
            <p className="text-xs italic text-rose-700/60 text-center py-4">
              Nenhum item neste quadrante ainda
            </p>
          ) : (
            getQuadrant('fraco').map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex justify-between items-center text-sm font-medium text-slate-700"
              >
                <span>{item.texto}</span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Oportunidades */}
      <div className="bg-blue-50/60 border border-blue-200/70 p-5 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-blue-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            Oportunidades
          </h3>
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full">
            {getQuadrant('oportunidade').length} itens
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Adicionar oportunidade..."
            value={newItemText.oportunidade}
            onChange={(e) => setNewItemText({ ...newItemText, oportunidade: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem('oportunidade')}
            className="flex-1 px-4 py-2 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleAddItem('oportunidade')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {getQuadrant('oportunidade').length === 0 ? (
            <p className="text-xs italic text-blue-700/60 text-center py-4">
              Nenhum item neste quadrante ainda
            </p>
          ) : (
            getQuadrant('oportunidade').map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex justify-between items-center text-sm font-medium text-slate-700"
              >
                <span>{item.texto}</span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ameaças */}
      <div className="bg-amber-50/60 border border-amber-200/70 p-5 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-amber-900 flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-600" />
            Ameaças
          </h3>
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-black rounded-full">
            {getQuadrant('ameaca').length} itens
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Adicionar ameaça..."
            value={newItemText.ameaca}
            onChange={(e) => setNewItemText({ ...newItemText, ameaca: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem('ameaca')}
            className="flex-1 px-4 py-2 bg-white border border-amber-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={() => handleAddItem('ameaca')}
            className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl transition-all"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {getQuadrant('ameaca').length === 0 ? (
            <p className="text-xs italic text-amber-700/60 text-center py-4">
              Nenhum item neste quadrante ainda
            </p>
          ) : (
            getQuadrant('ameaca').map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex justify-between items-center text-sm font-medium text-slate-700"
              >
                <span>{item.texto}</span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT 1.2: CURSOS & PREÇOS TAB
   ========================================================================= */
function CursosTab({
  concorrente,
  onToast,
}: {
  concorrente: ControleConcorrencia;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [cursosList, setCursosList] = useState<CursoConcorrente[]>(() => {
    if (concorrente.cursos && concorrente.cursos.length > 0) return concorrente.cursos;
    if (concorrente.curso) {
      return [
        {
          id: "legacy",
          nomeCurso: concorrente.curso,
          modalidade: "Presencial",
          turno: "Noturno",
          duracao: "4 anos",
          mensalidade: Number(concorrente.valor || 0),
          historicoPrecos: [],
        },
      ];
    }
    return [];
  });

  const [isAddingModal, setIsAddingModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CursoConcorrente | null>(null);
  const [selectedCourseHistory, setSelectedCourseHistory] = useState<CursoConcorrente | null>(null);

  const [formCourse, setFormCourse] = useState({
    nomeCurso: "",
    modalidade: "Presencial" as 'Presencial' | 'Semipresencial' | 'EAD',
    turno: "Noturno" as 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral' | 'EAD / Livre',
    duracao: "4 anos",
    mensalidade: "",
  });

  const saveCursos = async (updated: CursoConcorrente[]) => {
    try {
      setCursosList(updated);
      await updateDoc(doc(db, COLLECTIONS.CONTROLE_CONCORRENCIA, concorrente.id), {
        cursos: updated,
        updatedAt: serverTimestamp(),
      });
      onToast("Cursos do concorrente atualizados!", "success");
    } catch (e: any) {
      onToast(`Erro ao salvar curso: ${e.message}`, "error");
    }
  };

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormCourse({
      nomeCurso: "",
      modalidade: "Presencial",
      turno: "Noturno",
      duracao: "4 anos",
      mensalidade: "",
    });
    setIsAddingModal(true);
  };

  const handleEditCourse = (c: CursoConcorrente) => {
    setEditingCourse(c);
    setFormCourse({
      nomeCurso: c.nomeCurso,
      modalidade: c.modalidade,
      turno: c.turno,
      duracao: c.duracao,
      mensalidade: c.mensalidade.toString(),
    });
    setIsAddingModal(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourse.nomeCurso.trim()) return;

    const val = Number(formCourse.mensalidade) || 0;
    const today = new Date().toISOString().split("T")[0];

    let updated: CursoConcorrente[];
    if (editingCourse) {
      updated = cursosList.map((item) => {
        if (item.id === editingCourse.id) {
          const priceChanged = item.mensalidade !== val;
          const historico = [...(item.historicoPrecos || [])];
          if (priceChanged) {
            historico.unshift({
              data: today,
              valor: val,
              observacao: `Alterado de R$ ${item.mensalidade} para R$ ${val}`,
            });
          }
          return {
            ...item,
            nomeCurso: formCourse.nomeCurso,
            modalidade: formCourse.modalidade,
            turno: formCourse.turno,
            duracao: formCourse.duracao,
            mensalidade: val,
            historicoPrecos: historico,
          };
        }
        return item;
      });
    } else {
      const newC: CursoConcorrente = {
        id: Math.random().toString(36).substring(2, 9),
        nomeCurso: formCourse.nomeCurso,
        modalidade: formCourse.modalidade,
        turno: formCourse.turno,
        duracao: formCourse.duracao,
        mensalidade: val,
        historicoPrecos: [
          {
            data: today,
            valor: val,
            observacao: "Preço inicial cadastrado",
          },
        ],
        createdAt: new Date().toISOString(),
      };
      updated = [...cursosList, newC];
    }

    saveCursos(updated);
    setIsAddingModal(false);
  };

  const handleDeleteCourse = (id: string) => {
    if (!window.confirm("Deseja remover este curso do concorrente?")) return;
    const updated = cursosList.filter((c) => c.id !== id);
    saveCursos(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Cursos Ofertados pelo Concorrente</h3>
          <p className="text-xs text-slate-400">Modalidades, turnos e histórico de mensalidades</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2"
        >
          <Plus size={16} /> Adicionar Curso
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                <th className="p-4">Curso</th>
                <th className="p-4">Modalidade</th>
                <th className="p-4">Turno</th>
                <th className="p-4">Duração</th>
                <th className="p-4">Mensalidade</th>
                <th className="p-4 text-center">Histórico</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {cursosList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Nenhum curso cadastrado para este concorrente ainda.
                  </td>
                </tr>
              ) : (
                cursosList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{c.nomeCurso}</td>
                    <td className="p-4 text-slate-600">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium text-xs rounded-lg">
                        {c.modalidade}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{c.turno}</td>
                    <td className="p-4 text-slate-600">{c.duracao}</td>
                    <td className="p-4 font-black text-emerald-600">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        c.mensalidade
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedCourseHistory(c)}
                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 mx-auto"
                      >
                        <Clock size={14} /> {c.historicoPrecos?.length || 0} alterações
                      </button>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleEditCourse(c)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(c.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD/EDIT CURSO */}
      {isAddingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingCourse ? "Editar Curso do Concorrente" : "Novo Curso"}
            </h3>
            <form onSubmit={handleSaveCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Curso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Medicina, Direito, Enfermagem"
                  value={formCourse.nomeCurso}
                  onChange={(e) => setFormCourse({ ...formCourse, nomeCurso: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modalidade</label>
                <select
                  value={formCourse.modalidade}
                  onChange={(e) => setFormCourse({ ...formCourse, modalidade: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Semipresencial">Semipresencial</option>
                  <option value="EAD">EAD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turno</label>
                <select
                  value={formCourse.turno}
                  onChange={(e) => setFormCourse({ ...formCourse, turno: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Noturno">Noturno</option>
                  <option value="Integral">Integral</option>
                  <option value="EAD / Livre">EAD / Livre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duração</label>
                <input
                  type="text"
                  placeholder="Ex: 4 anos (8 semestres)"
                  value={formCourse.duracao}
                  onChange={(e) => setFormCourse({ ...formCourse, duracao: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensalidade (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formCourse.mensalidade}
                  onChange={(e) => setFormCourse({ ...formCourse, mensalidade: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE PREÇOS */}
      {selectedCourseHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-indigo-600" size={20} />
                Histórico de Preços: {selectedCourseHistory.nomeCurso}
              </h3>
              <button
                onClick={() => setSelectedCourseHistory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {!selectedCourseHistory.historicoPrecos || selectedCourseHistory.historicoPrecos.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">Nenhum histórico registrado.</p>
              ) : (
                selectedCourseHistory.historicoPrecos.map((h, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 font-bold">{h.data}</p>
                      <p className="text-xs text-slate-600">{h.observacao || "Alteração de valor"}</p>
                    </div>
                    <span className="font-black text-emerald-600 text-sm">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(h.valor)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedCourseHistory(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT 1.3: PLANO DE ATAQUE TAB
   ========================================================================= */
function PlanoAtaqueTab({
  concorrente,
  onToast,
}: {
  concorrente: ControleConcorrencia;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [planosList, setPlanosList] = useState<PlanoAtaque[]>(concorrente.planoAtaque || []);
  const [isAddingModal, setIsAddingModal] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoAtaque | null>(null);

  const [formPlano, setFormPlano] = useState({
    titulo: "",
    descricao: "",
    responsavel: "",
    prazo: "",
    prioridade: "Média" as 'Baixa' | 'Média' | 'Alta',
    status: "A Fazer" as 'A Fazer' | 'Em Andamento' | 'Concluído',
  });

  useEffect(() => {
    setPlanosList(concorrente.planoAtaque || []);
  }, [concorrente.planoAtaque]);

  const savePlanos = async (updated: PlanoAtaque[]) => {
    try {
      setPlanosList(updated);
      await updateDoc(doc(db, COLLECTIONS.CONTROLE_CONCORRENCIA, concorrente.id), {
        planoAtaque: updated,
        updatedAt: serverTimestamp(),
      });
      onToast("Plano de ataque atualizado!", "success");
    } catch (e: any) {
      onToast(`Erro ao salvar plano: ${e.message}`, "error");
    }
  };

  const handleOpenAdd = () => {
    setEditingPlano(null);
    setFormPlano({
      titulo: "",
      descricao: "",
      responsavel: "",
      prazo: "",
      prioridade: "Média",
      status: "A Fazer",
    });
    setIsAddingModal(true);
  };

  const handleEditPlano = (p: PlanoAtaque) => {
    setEditingPlano(p);
    setFormPlano({
      titulo: p.titulo,
      descricao: p.descricao,
      responsavel: p.responsavel,
      prazo: p.prazo,
      prioridade: p.prioridade,
      status: p.status,
    });
    setIsAddingModal(true);
  };

  const handleSavePlano = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlano.titulo.trim()) return;

    let updated: PlanoAtaque[];
    if (editingPlano) {
      updated = planosList.map((item) =>
        item.id === editingPlano.id ? { ...item, ...formPlano } : item
      );
    } else {
      const newP: PlanoAtaque = {
        id: Math.random().toString(36).substring(2, 9),
        ...formPlano,
        createdAt: new Date().toISOString(),
      };
      updated = [...planosList, newP];
    }

    savePlanos(updated);
    setIsAddingModal(false);
  };

  const handleDeletePlano = (id: string) => {
    if (!window.confirm("Deseja excluir esta ação estratégica?")) return;
    const updated = planosList.filter((p) => p.id !== id);
    savePlanos(updated);
  };

  const handleToggleStatus = (p: PlanoAtaque) => {
    const statusCycle: Record<string, 'A Fazer' | 'Em Andamento' | 'Concluído'> = {
      "A Fazer": "Em Andamento",
      "Em Andamento": "Concluído",
      "Concluído": "A Fazer",
    };
    const nextStatus = statusCycle[p.status] || "A Fazer";
    const updated = planosList.map((item) =>
      item.id === p.id ? { ...item, status: nextStatus } : item
    );
    savePlanos(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Plano de Ataque Estratégico</h3>
          <p className="text-xs text-slate-400">Ações para combater e superar a concorrência</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2"
        >
          <Plus size={16} /> Nova Ação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planosList.length === 0 ? (
          <div className="col-span-full bg-white p-8 text-center rounded-2xl border border-slate-100 text-slate-400 italic">
            Nenhum plano de ataque cadastrado para este concorrente ainda.
          </div>
        ) : (
          planosList.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-slate-800 text-base">{p.titulo}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      p.prioridade === "Alta"
                        ? "bg-rose-100 text-rose-800"
                        : p.prioridade === "Média"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {p.prioridade}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-3">{p.descricao || "Sem descrição"}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Resp: <strong className="text-slate-700">{p.responsavel || "Não atribuído"}</strong></span>
                  <span>Prazo: <strong className="text-slate-700">{p.prazo || "Sem data"}</strong></span>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => handleToggleStatus(p)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      p.status === "Concluído"
                        ? "bg-emerald-100 text-emerald-800"
                        : p.status === "Em Andamento"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p.status === "Concluído" && <CheckCircle2 size={13} />}
                    {p.status === "Em Andamento" && <Clock size={13} />}
                    {p.status}
                  </button>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditPlano(p)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePlano(p.id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: ADD/EDIT PLANO */}
      {isAddingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingPlano ? "Editar Ação" : "Nova Ação Estratégica"}
            </h3>
            <form onSubmit={handleSavePlano} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Ação *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campanha de Bolsas no Bairro"
                  value={formPlano.titulo}
                  onChange={(e) => setFormPlano({ ...formPlano, titulo: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Detalhamento do plano..."
                  value={formPlano.descricao}
                  onChange={(e) => setFormPlano({ ...formPlano, descricao: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável</label>
                  <input
                    type="text"
                    placeholder="Nome do responsável"
                    value={formPlano.responsavel}
                    onChange={(e) => setFormPlano({ ...formPlano, responsavel: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prazo</label>
                  <input
                    type="date"
                    value={formPlano.prazo}
                    onChange={(e) => setFormPlano({ ...formPlano, prazo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                  <select
                    value={formPlano.prioridade}
                    onChange={(e) => setFormPlano({ ...formPlano, prioridade: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={formPlano.status}
                    onChange={(e) => setFormPlano({ ...formPlano, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="A Fazer">A Fazer</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT 2: COMPARATIVO DE PREÇOS
   ========================================================================= */
function ComparativoPrecosView({
  concorrentes,
  cursosDisponiveis = [],
  precosMinhaInst = [],
  onToast,
}: {
  concorrentes: ControleConcorrencia[];
  cursosDisponiveis: CursoDisponivel[];
  precosMinhaInst: PrecoInstituicao[];
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [filterConcorrente, setFilterConcorrente] = useState("");
  const [filterModalidade, setFilterModalidade] = useState("");

  // Modal for adding custom Institutional Price for comparison
  const [isAddingPrecoInst, setIsAddingPrecoInst] = useState(false);
  const [formInst, setFormInst] = useState({
    curso: "",
    modalidade: "Presencial" as 'Presencial' | 'Semipresencial' | 'EAD',
    mensalidade: "",
  });

  const handleSavePrecoInst = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInst.curso.trim() || !formInst.mensalidade) return;
    try {
      await addDoc(collection(db, COLLECTIONS.PRECOS_INSTITUICAO), {
        curso: formInst.curso.trim(),
        modalidade: formInst.modalidade,
        mensalidade: Number(formInst.mensalidade),
        createdAt: serverTimestamp(),
      });
      onToast("Preço da instituição salvo!", "success");
      setFormInst({ curso: "", modalidade: "Presencial", mensalidade: "" });
      setIsAddingPrecoInst(false);
    } catch (e: any) {
      onToast(`Erro: ${e.message}`, "error");
    }
  };

  // Build comparison rows
  const comparisonRows = useMemo(() => {
    const rows: Array<{
      id: string;
      curso: string;
      modalidade: string;
      meuPreco: number;
      concorrenteNome: string;
      precoConcorrente: number;
      diferenca: number;
      status: 'mais_barato' | 'mais_caro' | 'igual';
    }> = [];

    concorrentes.forEach((c) => {
      if (filterConcorrente && c.ies !== filterConcorrente) return;

      const courses = c.cursos && c.cursos.length > 0 ? c.cursos : (c.curso ? [{
        id: "legacy",
        nomeCurso: c.curso,
        modalidade: "Presencial" as const,
        turno: "Noturno" as const,
        duracao: "4 anos",
        mensalidade: Number(c.valor || 0),
      }] : []);

      courses.forEach((cc) => {
        if (filterModalidade && cc.modalidade !== filterModalidade) return;

        // Find institutional price matching course name
        const matchInst = precosMinhaInst.find(
          (p) => p.curso.toLowerCase() === cc.nomeCurso.toLowerCase()
        );
        const meuPreco = matchInst ? matchInst.mensalidade : 0;
        const diff = meuPreco - cc.mensalidade; // positive = we are more expensive, negative = we are cheaper

        let status: 'mais_barato' | 'mais_caro' | 'igual' = 'igual';
        if (meuPreco > 0) {
          if (diff < 0) status = 'mais_barato';
          else if (diff > 0) status = 'mais_caro';
        }

        rows.push({
          id: `${c.id}_${cc.id}`,
          curso: cc.nomeCurso,
          modalidade: cc.modalidade,
          meuPreco,
          concorrenteNome: c.ies,
          precoConcorrente: cc.mensalidade,
          diferenca: diff,
          status,
        });
      });
    });

    return rows;
  }, [concorrentes, precosMinhaInst, filterConcorrente, filterModalidade]);

  // Derived Indicators
  const countMaisCaro = comparisonRows.filter((r) => r.meuPreco > 0 && r.status === 'mais_caro').length;
  const countMaisBarato = comparisonRows.filter((r) => r.meuPreco > 0 && r.status === 'mais_barato').length;

  const { diffMedia, rotuloAutomatico } = useMemo(() => {
    const validRows = comparisonRows.filter((r) => r.meuPreco > 0);
    if (validRows.length === 0) return { diffMedia: 0, rotuloAutomatico: "Sem dados de preço da instituição" };

    const totalDiff = validRows.reduce((acc, r) => acc + r.diferenca, 0);
    const avg = totalDiff / validRows.length;

    if (avg < 0) {
      return {
        diffMedia: Math.abs(avg),
        rotuloAutomatico: "minha instituição é mais barata em média",
      };
    } else if (avg > 0) {
      return {
        diffMedia: avg,
        rotuloAutomatico: "minha instituição é mais cara em média",
      };
    } else {
      return {
        diffMedia: 0,
        rotuloAutomatico: "preços em média iguais",
      };
    }
  }, [comparisonRows]);

  // Export CSV
  const handleExportCSV = () => {
    if (comparisonRows.length === 0) {
      onToast("Nenhum dado para exportar!", "error");
      return;
    }

    const headers = ["Curso", "Modalidade", "Minha Instituição (R$)", "Concorrente", "Preço Concorrente (R$)", "Diferença (R$)", "Situação"];
    const csvLines = comparisonRows.map((r) => [
      `"${r.curso}"`,
      `"${r.modalidade}"`,
      r.meuPreco ? r.meuPreco.toFixed(2) : "0.00",
      `"${r.concorrenteNome}"`,
      r.precoConcorrente.toFixed(2),
      r.diferenca.toFixed(2),
      r.meuPreco === 0 ? "Sem cadastro" : r.status === "mais_barato" ? "Mais Barato" : r.status === "mais_caro" ? "Mais Caro" : "Igual",
    ].join(","));

    const content = [headers.join(","), ...csvLines].join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `comparativo_precos_concorrencia_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast("Relatório CSV exportado com sucesso!", "success");
  };

  return (
    <div className="space-y-6">
      {/* Top Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center font-black">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-rose-800">Mais Caro em</p>
            <p className="text-2xl font-black text-rose-900">{countMaisCaro} cursos</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-black">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-emerald-800">Mais Barato em</p>
            <p className="text-2xl font-black text-emerald-900">{countMaisBarato} cursos</p>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-black">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-indigo-800">Diferença Média</p>
            <p className="text-xl font-black text-indigo-950">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(diffMedia)}
            </p>
            <p className="text-[11px] font-bold text-indigo-700 capitalize">{rotuloAutomatico}</p>
          </div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={filterConcorrente}
            onChange={(e) => setFilterConcorrente(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            <option value="">Todas as IES / Concorrentes</option>
            {concorrentes.map((c) => (
              <option key={c.id} value={c.ies}>
                {c.ies}
              </option>
            ))}
          </select>

          <select
            value={filterModalidade}
            onChange={(e) => setFilterModalidade(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            <option value="">Todas as Modalidades</option>
            <option value="Presencial">Presencial</option>
            <option value="Semipresencial">Semipresencial</option>
            <option value="EAD">EAD</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsAddingPrecoInst(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Cadastrar Nosso Preço
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm"
          >
            <Download size={16} /> Exportar CSV/Excel
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                <th className="p-4">Curso</th>
                <th className="p-4">Modalidade</th>
                <th className="p-4">Minha Instituição (R$)</th>
                <th className="p-4">Concorrente</th>
                <th className="p-4">Preço Concorrente (R$)</th>
                <th className="p-4">Diferença</th>
                <th className="p-4 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {comparisonRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Nenhum curso comparável cadastrado.
                  </td>
                </tr>
              ) : (
                comparisonRows.map((r) => {
                  const isCheaper = r.meuPreco > 0 && r.status === "mais_barato";
                  const isExpensive = r.meuPreco > 0 && r.status === "mais_caro";

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCheaper ? "bg-emerald-50/30" : isExpensive ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-slate-800">{r.curso}</td>
                      <td className="p-4 text-slate-600">{r.modalidade}</td>
                      <td className="p-4 font-bold text-slate-800">
                        {r.meuPreco > 0
                          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.meuPreco)
                          : "Não informado"}
                      </td>
                      <td className="p-4 font-bold text-slate-700">{r.concorrenteNome}</td>
                      <td className="p-4 font-bold text-slate-800">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          r.precoConcorrente
                        )}
                      </td>
                      <td className="p-4 font-bold">
                        {r.meuPreco > 0 ? (
                          <span className={isCheaper ? "text-emerald-600" : isExpensive ? "text-rose-600" : "text-slate-600"}>
                            {r.diferenca > 0 ? `+ R$ ${r.diferenca.toFixed(2)}` : `- R$ ${Math.abs(r.diferenca).toFixed(2)}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {r.meuPreco === 0 ? (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-xs rounded-full">
                            Sem Nosso Valor
                          </span>
                        ) : isCheaper ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full inline-flex items-center gap-1">
                            <TrendingDown size={13} /> Mais Barato
                          </span>
                        ) : isExpensive ? (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full inline-flex items-center gap-1">
                            <TrendingUp size={13} /> Mais Caro
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">
                            Igual
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD NOSSO PREÇO */}
      {isAddingPrecoInst && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Cadastrar Preço da Minha Instituição</h3>
            <form onSubmit={handleSavePrecoInst} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Curso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Medicina, Direito"
                  value={formInst.curso}
                  onChange={(e) => setFormInst({ ...formInst, curso: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modalidade</label>
                <select
                  value={formInst.modalidade}
                  onChange={(e) => setFormInst({ ...formInst, modalidade: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Semipresencial">Semipresencial</option>
                  <option value="EAD">EAD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nossa Mensalidade (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formInst.mensalidade}
                  onChange={(e) => setFormInst({ ...formInst, mensalidade: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPrecoInst(false)}
                  className="px-4 py-2 text-slate-600 font-bold rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT 3: EVIDÊNCIAS DE CLIENTE OCULTO
   ========================================================================= */
function EvidenciasClienteOcultoView({
  concorrentes,
  evidenciasGlobal = [],
  onToast,
}: {
  concorrentes: ControleConcorrencia[];
  evidenciasGlobal: EvidenciaClienteOculto[];
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [filterConcorrente, setFilterConcorrente] = useState("");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");

  const [isAddingEvidencia, setIsAddingEvidencia] = useState(false);
  const [formEvidencia, setFormEvidencia] = useState({
    concorrenteNome: "",
    data: new Date().toISOString().split("T")[0],
    responsavel: "",
    canal: "Presencial" as 'Presencial' | 'Telefone' | 'WhatsApp' | 'Site',
    relato: "",
  });

  const [anexos, setAnexos] = useState<AnexoClienteOculto[]>([]);

  // Merge embedded and global evidences
  const allEvidencias = useMemo(() => {
    const list: EvidenciaClienteOculto[] = [...evidenciasGlobal];
    concorrentes.forEach((c) => {
      if (c.evidencias) {
        c.evidencias.forEach((ev) => {
          if (!list.some((item) => item.id === ev.id)) {
            list.push({ ...ev, concorrenteNome: c.ies });
          }
        });
      }
    });
    return list;
  }, [concorrentes, evidenciasGlobal]);

  // Filtered List
  const filteredEvidencias = useMemo(() => {
    return allEvidencias.filter((ev) => {
      const matchConc = !filterConcorrente || ev.concorrenteNome === filterConcorrente;
      const matchStart = !filterDataInicio || ev.data >= filterDataInicio;
      const matchEnd = !filterDataFim || ev.data <= filterDataFim;
      return matchConc && matchStart && matchEnd;
    });
  }, [allEvidencias, filterConcorrente, filterDataInicio, filterDataFim]);

  // Group by Date
  const groupedEvidencias = useMemo(() => {
    const map = new Map<string, EvidenciaClienteOculto[]>();
    filteredEvidencias.forEach((ev) => {
      const d = ev.data || "Sem Data";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(ev);
    });

    // Sort dates descending
    const sortedEntries = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return sortedEntries;
  }, [filteredEvidencias]);

  // File Upload Handling (Base64 dataURL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAnexos((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            nome: file.name,
            tipo: file.type,
            url: result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAnexo = (id: string) => {
    setAnexos((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveEvidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEvidencia.concorrenteNome.trim() || !formEvidencia.data) {
      onToast("Selecione o concorrente e a data!", "error");
      return;
    }

    try {
      const payload: Omit<EvidenciaClienteOculto, 'id'> = {
        concorrenteNome: formEvidencia.concorrenteNome,
        data: formEvidencia.data,
        responsavel: formEvidencia.responsavel.trim(),
        canal: formEvidencia.canal,
        relato: formEvidencia.relato.trim(),
        anexos,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, COLLECTIONS.EVIDENCIAS_CLIENTE_OCULTO), payload);

      onToast("Evidência de cliente oculto salva com sucesso!", "success");
      setIsAddingEvidencia(false);
      setFormEvidencia({
        concorrenteNome: "",
        data: new Date().toISOString().split("T")[0],
        responsavel: "",
        canal: "Presencial",
        relato: "",
      });
      setAnexos([]);
    } catch (err: any) {
      onToast(`Erro ao salvar evidência: ${err.message}`, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={filterConcorrente}
            onChange={(e) => setFilterConcorrente(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            <option value="">Todos os Concorrentes</option>
            {concorrentes.map((c) => (
              <option key={c.id} value={c.ies}>
                {c.ies}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>De:</span>
            <input
              type="date"
              value={filterDataInicio}
              onChange={(e) => setFilterDataInicio(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
            />
            <span>Até:</span>
            <input
              type="date"
              value={filterDataFim}
              onChange={(e) => setFilterDataFim(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => setIsAddingEvidencia(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Registrar Visita / Evidência
        </button>
      </div>

      {/* Grouped Evidences List */}
      <div className="space-y-6">
        {groupedEvidencias.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400 italic">
            Nenhuma evidência de cliente oculto registrada.
          </div>
        ) : (
          groupedEvidencias.map(([date, items]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Calendar size={18} className="text-indigo-600" />
                <h3 className="text-base font-black text-slate-800">{date}</h3>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-full">
                  {items.length} {items.length === 1 ? "evidência" : "evidências"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg uppercase">
                          {ev.canal}
                        </span>
                        <h4 className="font-black text-slate-800 text-lg mt-1">{ev.concorrenteNome}</h4>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        Coletado por: <strong className="text-slate-600">{ev.responsavel || "Não informado"}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {ev.relato || "Sem observações"}
                    </p>

                    {/* Attachments list */}
                    {ev.anexos && ev.anexos.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Anexos ({ev.anexos.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {ev.anexos.map((a) => (
                            <div key={a.id} className="relative group">
                              {a.tipo.startsWith("image/") ? (
                                <img
                                  src={a.url}
                                  alt={a.nome}
                                  className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-500 p-1 text-center">
                                  <FileText size={18} />
                                  <span className="text-[9px] truncate w-full">{a.nome}</span>
                                </div>
                              )}
                              <a
                                href={a.url}
                                download={a.nome}
                                className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white p-1"
                                title="Baixar anexo"
                              >
                                <Download size={16} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: REGISTRAR EVIDÊNCIA */}
      {isAddingEvidencia && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <h3 className="text-lg font-bold text-slate-800">Registrar Cliente Oculto</h3>
            <form onSubmit={handleSaveEvidencia} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Concorrente *</label>
                <select
                  required
                  value={formEvidencia.concorrenteNome}
                  onChange={(e) => setFormEvidencia({ ...formEvidencia, concorrenteNome: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="">Selecione o concorrente...</option>
                  {concorrentes.map((c) => (
                    <option key={c.id} value={c.ies}>
                      {c.ies}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data da Visita *</label>
                  <input
                    type="date"
                    required
                    value={formEvidencia.data}
                    onChange={(e) => setFormEvidencia({ ...formEvidencia, data: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Canal de Coleta</label>
                  <select
                    value={formEvidencia.canal}
                    onChange={(e) => setFormEvidencia({ ...formEvidencia, canal: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Telefone">Telefone</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Site">Site</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável pela Coleta</label>
                <input
                  type="text"
                  placeholder="Nome do avaliador / pesquisador"
                  value={formEvidencia.responsavel}
                  onChange={(e) => setFormEvidencia({ ...formEvidencia, responsavel: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Relato / Observações</label>
                <textarea
                  rows={3}
                  placeholder="Descreva o atendimento, proposta recebida, argumentos do vendedor..."
                  value={formEvidencia.relato}
                  onChange={(e) => setFormEvidencia({ ...formEvidencia, relato: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none resize-none"
                />
              </div>

              {/* Upload de Anexos */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Upload de Anexos (Fotos, Print, Tabela de Preço, PDF)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />

                {anexos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {anexos.map((a) => (
                      <div key={a.id} className="relative bg-slate-100 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                        <span className="truncate max-w-[120px]">{a.nome}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAnexo(a.id)}
                          className="text-rose-600 hover:text-rose-800 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingEvidencia(false)}
                  className="px-4 py-2 text-slate-600 font-bold rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-sm"
                >
                  Salvar Evidência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
