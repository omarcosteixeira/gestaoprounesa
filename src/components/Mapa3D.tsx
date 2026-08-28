import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import {
  MapPin,
  ExternalLink,
  Search,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  MessageSquare,
  Phone,
  LocateFixed
} from "lucide-react";
import { cn } from "../lib/utils";

import { 
  EmpresaParceira as Empresa, 
  Lead, 
  CalendarioAcao as Acao 
} from "../types";

interface Mapa3DProps {
  empresas: Empresa[];
  leads: Lead[];
  acoes: Acao[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onGenerateAction: (empresa: Empresa) => void;
  formatPhone: (phone?: string) => string;
}

export default function Mapa3D({
  empresas,
  leads,
  acoes,
  selectedId,
  onSelect,
  onGenerateAction,
  formatPhone,
}: Mapa3DProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [center, setCenter] = useState<[number, number]>([-42.5, -22.2]); // Approx center of RJ state
  const [mapGeoUrl, setMapGeoUrl] = useState<string>("");

  useEffect(() => {
    // Fetch RJ Municipalities GeoJSON from IBGE
    setMapGeoUrl("https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-33-mun.json");
  }, []);

  // Map Filter/Search
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);
  const [filterConsultor, setFilterConsultor] = useState<string>("Todos");
  const [filterBairro, setFilterBairro] = useState<string>("Todos");
  const [filterCidade, setFilterCidade] = useState<string>("Todas");

  
  
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [filterClassificacao, setFilterClassificacao] = useState<string>("Todas");
  const [filterUnidade, setFilterUnidade] = useState<string>("Todas");
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  // Helper to detect city from address
  
  const getRegionColor = (cityName: string) => {
    if (!cityName) return "#e2e8f0"; // default slate-200
    const lowerName = cityName.toLowerCase();
    
    const noroeste = ["aperibé", "bom jesus do itabapoana", "cambuci", "italva", "itaocara", "itaperuna", "laje do muriaé", "miracema", "natividade", "porciúncula", "santo antônio de pádua", "são josé de ubá", "varre-sai"];
    const norte = ["campos dos goytacazes", "carapebus", "cardoso moreira", "conceição de macabu", "macaé", "quissamã", "são fidélis", "são francisco de itabapoana", "são joão da barra"];
    const serrana = ["bom jardim", "cachoeiras de macacu", "cantagalo", "carmo", "cordeiro", "duas barras", "guapimirim", "macuco", "nova friburgo", "petrópolis", "santa maria madalena", "são sebastião do alto", "sumidouro", "teresópolis", "trajano de moraes"];
    const lagos = ["araruama", "armação dos búzios", "arraial do cabo", "cabo frio", "casimiro de abreu", "iguaba grande", "rio das ostras", "são pedro da aldeia", "silva jardim", "rio bonito", "saquarema"];
    const metropolitana = ["belford roxo", "duque de caxias", "itaboraí", "itaguaí", "japeri", "magé", "maricá", "mesquita", "nilópolis", "niterói", "nova iguaçu", "paracambi", "queimados", "rio de janeiro", "são gonçalo", "são joão de meriti", "seropédica", "tanguá"];
    const medioParaiba = ["angra dos reis", "barra do piraí", "barra mansa", "itatiaia", "mangaratiba", "paraty", "parati", "pinheiral", "piraí", "porto real", "quatis", "resende", "rio claro", "rio das flores", "valença", "vassouras", "volta redonda"];
    const centroSul = ["areal", "comendador levy gasparian", "engenheiro paulo de frontin", "mendes", "miguel pereira", "paraíba do sul", "paty do alferes", "sapucaia", "são josé do vale do rio preto", "três rios"];

    if (noroeste.includes(lowerName)) return "#f9a8d4"; // Pink
    if (norte.includes(lowerName)) return "#fde047"; // Yellow
    if (serrana.includes(lowerName)) return "#7dd3fc"; // Blue
    if (lagos.includes(lowerName)) return "#fca5a5"; // Red/Coral
    if (metropolitana.includes(lowerName)) return "#86efac"; // Green
    if (medioParaiba.includes(lowerName)) return "#d8b4fe"; // Purple
    if (centroSul.includes(lowerName)) return "#fdba74"; // Orange

    return "#e2e8f0";
  };

  const detectCidade = (endereco?: string) => {
    if (!endereco) return "Rio de Janeiro";
    const lower = endereco.toLowerCase();
    
    // Check known cities of RJ
    const cities = [
      "Niterói", "Duque de Caxias", "Nova Iguaçu", "São Gonçalo", 
      "Belford Roxo", "São João de Meriti", "Petrópolis", "Volta Redonda", 
      "Campos dos Goytacazes", "Macaé", "Cabo Frio", "Angra dos Reis", 
      "Maricá", "Nilópolis", "Itaboraí", "Magé", "Mesquita", 
      "Queimados", "Resende", "Araruama", "Saquarema", "Teresópolis",
      "Rio das Ostras", "Itaguaí"
    ];
    
    for (const city of cities) {
      if (lower.includes(city.toLowerCase())) {
        return city;
      }
    }
    
    if (lower.includes("rio de janeiro") || lower.includes("rj") || lower.includes("capital")) {
      return "Rio de Janeiro";
    }
    
    const match = endereco.match(/,\s*([^,]+)\s*-\s*R[Jj]/);
    if (match && match[1]) {
      const parsed = match[1].trim();
      return parsed.charAt(0).toUpperCase() + parsed.slice(1);
    }
    
    return "Rio de Janeiro"; // Default
  };

  // Dynamic filter values
  const uniqueConsultores = useMemo(() => {
    return Array.from(new Set(empresas.map((e) => e.consultorNome).filter(Boolean))).sort() as string[];
  }, [empresas]);

  const uniqueBairros = useMemo(() => {
    return Array.from(new Set(empresas.map((e) => e.bairro).filter(Boolean))).sort() as string[];
  }, [empresas]);

  const uniqueCidades = useMemo(() => {
    const cities = empresas.map(e => detectCidade(e.endereco));
    return Array.from(new Set(cities)).sort() as string[];
  }, [empresas]);

  const uniqueUnidades = useMemo(() => {
    const list: string[] = [];
    empresas.forEach(e => {
      if (Array.isArray(e.unidadesVinculadas)) {
        e.unidadesVinculadas.forEach(u => {
          if (u) list.push(u);
        });
      }
    });
    return Array.from(new Set(list)).sort() as string[];
  }, [empresas]);

  // Master Filter List
  const filteredEmpresas = useMemo(() => {
    return empresas.filter((e) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        e.nome.toLowerCase().includes(term) ||
        (e.endereco && e.endereco.toLowerCase().includes(term)) ||
        (e.statusEmpresa && e.statusEmpresa.toLowerCase().includes(term));
      
      const matchesConsultor = filterConsultor === "Todos" || e.consultorNome === filterConsultor;
      const matchesBairro = filterBairro === "Todos" || e.bairro === filterBairro;
      const matchesCidade = filterCidade === "Todas" || detectCidade(e.endereco) === filterCidade;
      
      const currentStatus = e.statusEmpresa || "Não visitada";
      const matchesStatus = filterStatus === "Todos" || currentStatus === filterStatus;
      
      const matchesClassificacao = filterClassificacao === "Todas" || e.classificacao === filterClassificacao;
      
      const matchesUnidade = filterUnidade === "Todas" || 
        (Array.isArray(e.unidadesVinculadas) && e.unidadesVinculadas.includes(filterUnidade));
        
      return matchesSearch && matchesConsultor && matchesBairro && matchesCidade && matchesStatus && matchesClassificacao && matchesUnidade;
    });
  }, [empresas, searchTerm, filterConsultor, filterBairro, filterCidade, filterStatus, filterClassificacao, filterUnidade]);

  const selectedEmpresa = useMemo(() => {
    return (
      filteredEmpresas.find((emp) => emp.id === selectedId) ||
      filteredEmpresas[0] ||
      null
    );
  }, [filteredEmpresas, selectedId]);

  useEffect(() => {
    if (filteredEmpresas.length > 0 && !selectedId) {
      onSelect(filteredEmpresas[0].id);
    }
  }, [filteredEmpresas, selectedId, onSelect]);

  const getCoordinates = (empresa: Empresa): [number, number] => {
    const { id, nome, endereco, bairro } = empresa;
    const combined = id + nome;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const randX = Math.abs((hash * 17) % 1000) / 1000;
    const randY = Math.abs((hash * 31) % 1000) / 1000;

    const lowerBairro = (bairro || "").toLowerCase();
    const lowerAddress = (endereco || "").toLowerCase();
    
    const cidade = detectCidade(endereco);

    let minLng = -43.7, maxLng = -43.1;
    let minLat = -23.0, maxLat = -22.8;

    if (cidade === "Rio de Janeiro") {
        const zonaSul = ["copacabana", "ipanema", "leblon", "botafogo", "flamengo", "gávea", "catete", "laranjeiras", "glória", "urca", "jardim botânico", "humaitá", "leme", "lagoa", "cosme velho", "são conrado"];
        const centro = ["centro", "lapa", "santa teresa", "estácio", "rio comprido", "gamboa", "saúde", "santo cristo", "maravilha", "castelo", "cinelândia", "praça xv", "catumbi"];
        const zonaOeste = ["barra", "recreio", "jacarepaguá", "campo grande", "santa cruz", "bangu", "realengo", "taquara", "anil", "freguesia", "curicica", "camorim", "itanhangá", "vargem", "cosmos", "paciência", "guaratiba", "pechincha", "sulacap", "padre miguel", "senador camará"];
        const zonaNorte = ["tijuca", "vila isabel", "grajaú", "maracanã", "méier", "madureira", "penha", "bonsucesso", "ilha do governador", "ramos", "iraja", "irajá", "cascadura", "meier", "del castilho", "galeão", "inhaúma", "pavuna", "vaz lobo", "benfica", "sampaio", "engenho", "piedade", "quintino", "anchieta", "coelho neto", "colégio", "cordovil", "higienópolis", "jacaré", "manguinhos", "olaria", "rocha", "vargas", "vicente de carvalho", "vigário geral", "vista alegre"];

        const matchesRegion = (list: string[]) => {
            return list.some(item => lowerBairro.includes(item) || lowerAddress.includes(item));
        };

        if (matchesRegion(zonaSul)) {
            minLng = -43.25; maxLng = -43.15;
            minLat = -22.99; maxLat = -22.95;
        } else if (matchesRegion(centro)) {
            minLng = -43.20; maxLng = -43.15;
            minLat = -22.93; maxLat = -22.88;
        } else if (matchesRegion(zonaOeste)) {
            minLng = -43.70; maxLng = -43.35;
            minLat = -23.05; maxLat = -22.85;
        } else if (matchesRegion(zonaNorte)) {
            minLng = -43.35; maxLng = -43.20;
            minLat = -22.88; maxLat = -22.80;
        } else {
            minLng = -43.70; maxLng = -43.15;
            minLat = -23.05; maxLat = -22.80;
        }
    } else if (cidade === "Niterói" || cidade === "São Gonçalo" || cidade === "Itaboraí" || cidade === "Maricá") {
        minLng = -43.1; maxLng = -42.8;
        minLat = -22.95; maxLat = -22.7;
    } else if (cidade === "Duque de Caxias" || cidade === "Nova Iguaçu" || cidade === "Belford Roxo" || cidade === "São João de Meriti" || cidade === "Nilópolis" || cidade === "Mesquita" || cidade === "Queimados") {
        minLng = -43.5; maxLng = -43.2;
        minLat = -22.8; maxLat = -22.6;
    } else if (cidade === "Petrópolis" || cidade === "Teresópolis") {
        minLng = -43.2; maxLng = -42.9;
        minLat = -22.5; maxLat = -22.3;
    } else if (cidade === "Cabo Frio" || cidade === "Araruama" || cidade === "Saquarema" || cidade === "Rio das Ostras" || cidade === "Macaé") {
        minLng = -42.3; maxLng = -41.7;
        minLat = -22.9; maxLat = -22.3;
    } else if (cidade === "Campos dos Goytacazes") {
        minLng = -41.5; maxLng = -41.1;
        minLat = -21.9; maxLat = -21.5;
    } else if (cidade === "Volta Redonda" || cidade === "Resende" || cidade === "Angra dos Reis") {
        minLng = -44.5; maxLng = -43.9;
        minLat = -22.6; maxLat = -22.3;
    }

    const lng = minLng + (randX * (maxLng - minLng));
    const lat = minLat + (randY * (maxLat - minLat));

    return [lng, lat];
  };

  const empresasWithPositions = useMemo(() => {
    return filteredEmpresas.map((emp) => {
      const coords = getCoordinates(emp);
      return {
        ...emp,
        pos: coords,
      };
    });
  }, [filteredEmpresas]);

  useEffect(() => {
    if (filterCidade !== "Todas") {
      setZoom(10);
      // Let's rely on the first marker of the filtered companies
      if (filteredEmpresas.length > 0) {
        // We need to calculate its coordinate quickly
        // getCoordinates is inside the component
        const first = filteredEmpresas[0];
        // The pos is in empresasWithPositions, let's just trigger a re-center if we find it
      }
    } else {
      setCenter([-42.5, -22.2]);
      setZoom(1);
    }
  }, [filterCidade]);

  // Center on first company of the filtered list if city is selected
  useEffect(() => {
     if (filterCidade !== "Todas" && empresasWithPositions.length > 0) {
        setCenter(empresasWithPositions[0].pos);
     }
  }, [filterCidade, empresasWithPositions]);

  const stats = useMemo(() => {
    const counts = { conveniada: 0, tratativa: 0, cancelada: 0, naoVisitada: 0 };
    filteredEmpresas.forEach((e) => {
      const status = e.statusEmpresa || "Não visitada";
      if (status === "Conveniada") counts.conveniada++;
      else if (status === "Em tratativa") counts.tratativa++;
      else if (status === "Cancelada") counts.cancelada++;
      else counts.naoVisitada++;
    });
    return counts;
  }, [filteredEmpresas]);

  const leadDensity = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      let companyId = "";
      if (lead.acaoId) {
        const acao = acoes.find(a => a.id === lead.acaoId);
        if (acao?.empresaParceiraId) {
          companyId = acao.empresaParceiraId;
        }
      }
      
      if (!companyId && lead.empresa) {
        const matchedEmp = empresas.find(e => e.nome.toLowerCase() === lead.empresa?.toLowerCase());
        if (matchedEmp) companyId = matchedEmp.id;
      }

      if (companyId) {
        counts[companyId] = (counts[companyId] || 0) + 1;
      }
    });
    return counts;
  }, [leads, acoes, empresas]);

  const maxLeadCount = useMemo(() => {
    const values = Object.values(leadDensity);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [leadDensity]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* LEFT SIDEBAR */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col space-y-4 max-h-[85vh] overflow-hidden">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center space-x-2">
            <span>📍 Localização RJ</span>
            <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
              {filteredEmpresas.length}
            </span>
          </h3>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1.5 shrink-0 text-center text-[10px]">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-1.5 flex flex-col items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mb-0.5" />
            <span className="font-bold text-emerald-800">{stats.conveniada}</span>
            <span className="text-emerald-600/70 uppercase">Conveniada</span>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-1.5 flex flex-col items-center">
            <span className="w-2 h-2 rounded-full bg-amber-500 mb-0.5" />
            <span className="font-bold text-amber-800">{stats.tratativa}</span>
            <span className="text-amber-600/70 uppercase">Tratativa</span>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-1.5 flex flex-col items-center">
            <span className="w-2 h-2 rounded-full bg-red-500 mb-0.5" />
            <span className="font-bold text-red-800">{stats.cancelada}</span>
            <span className="text-red-600/70 uppercase">Cancelada</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex flex-col items-center">
            <span className="w-2 h-2 rounded-full bg-slate-400 mb-0.5" />
            <span className="font-bold text-slate-600">{stats.naoVisitada}</span>
            <span className="text-slate-400 uppercase">A Visitar</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 shrink-0 space-y-2">
          <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}>
            <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs">
              <Sliders size={13} className="text-blue-600" />
              <span>Filtros do Mapa</span>
            </div>
            <span className="text-blue-600 text-[10px] font-bold hover:underline">
              {isFiltersExpanded ? "Recolher ▲" : "Expandir ▼"}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Buscar por nome ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
            />
          </div>

          <AnimatePresence initial={false}>
            {isFiltersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2 pt-1 border-t border-slate-200/50 mt-1.5"
              >
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Unidade</label>
                    <select
                      value={filterUnidade}
                      onChange={(e) => setFilterUnidade(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] outline-none"
                    >
                      <option value="Todas">Todas</option>
                      {uniqueUnidades.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Consultor</label>
                    <select
                      value={filterConsultor}
                      onChange={(e) => setFilterConsultor(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] outline-none"
                    >
                      <option value="Todos">Todos</option>
                      {uniqueConsultores.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bairro</label>
                    <select
                      value={filterBairro}
                      onChange={(e) => setFilterBairro(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] outline-none"
                    >
                      <option value="Todos">Todos</option>
                      {uniqueBairros.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cidade</label>
                    <select
                      value={filterCidade}
                      onChange={(e) => setFilterCidade(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] outline-none"
                    >
                      <option value="Todas">Todas</option>
                      {uniqueCidades.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-4">
          {filteredEmpresas.map((emp) => {
            const isSelected = selectedId === emp.id;
            let statusIcon = <HelpCircle size={12} className="text-slate-400" />;
            const st = emp.statusEmpresa;
            if (st === "Conveniada") statusIcon = <CheckCircle2 size={12} className="text-emerald-500" />;
            else if (st === "Em tratativa") statusIcon = <AlertTriangle size={12} className="text-amber-500" />;
            else if (st === "Cancelada") statusIcon = <XCircle size={12} className="text-red-500" />;

            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => {
                  onSelect(emp.id);
                  setShowCard(false);
                }}
                className={cn(
                  "w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col space-y-2 cursor-pointer relative overflow-hidden group",
                  isSelected
                    ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20"
                    : "border-slate-100 hover:bg-slate-50"
                )}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md" />}
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {emp.nome}
                  </span>
                  <div className="shrink-0 pt-0.5">{statusIcon}</div>
                </div>
                <div className="flex items-start text-slate-500 text-[10px] space-x-1.5">
                  <MapPin size={12} className="shrink-0 text-slate-400" />
                  <span className="line-clamp-2 leading-tight">
                    {emp.endereco || "Endereço não informado"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT MAIN MAP */}
      <div className="col-span-1 lg:col-span-2 h-[85vh] flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="flex-1 relative overflow-hidden select-none bg-blue-50 flex items-center justify-center">
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1 bg-white/90 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setZoom(z => Math.min(8, z + 0.5))}
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(1, z - 0.5))}
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={() => { setZoom(1); setCenter([-42.5, -22.2]); }}
              title="Visão Geral do Estado"
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={() => { setZoom(4); setCenter([-43.3, -22.9]); }}
              title="Centralizar no Rio de Janeiro"
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors mt-2 border-t border-slate-200/50 pt-2"
            >
              <LocateFixed size={15} />
            </button>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              title={showHeatmap ? "Ocultar Mapa de Calor" : "Exibir Mapa de Calor"}
              className={cn(
                "p-1.5 rounded-lg transition-all mt-1",
                showHeatmap 
                  ? "bg-orange-100 text-orange-600 shadow-inner" 
                  : "text-slate-500 hover:text-orange-600 hover:bg-slate-100"
              )}
            >
              <div className="relative">
                <MapPin size={15} />
                {showHeatmap && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                )}
              </div>
            </button>
          </div>

          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 12000 }}
            className="w-full h-full"
          >
            <ZoomableGroup
              zoom={zoom}
              center={center}
              onMoveEnd={({ coordinates, zoom }: { coordinates: [number, number]; zoom: number }) => {
                setCenter(coordinates);
                setZoom(zoom);
              }}
            >
              {mapGeoUrl && (
                <Geographies geography={mapGeoUrl}>
                  {({ geographies }: { geographies: any[] }) => {
                    const filteredGeographies = filterCidade === "Todas"
                      ? geographies
                      : geographies.filter((geo: any) => geo.properties?.name?.toLowerCase() === filterCidade.toLowerCase());

                    return filteredGeographies.map((geo: any) => {
                      const cityName = geo.properties?.name || "";
                      const regionColor = getRegionColor(cityName);

                      // Update center automatically based on the selected city's geometry center approximation
                      // using the first coordinate of its boundary. React simple maps handles this in a more complex way,
                      // but we can just let the user zoom or we can center on the marker.
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={regionColor}
                          stroke="#ffffff"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none", transition: "all 250ms" },
                            hover: { fill: "#cbd5e1", outline: "none" },
                            pressed: { fill: "#94a3b8", outline: "none" },
                          }}
                        />
                      );
                    });
                  }}
                </Geographies>
              )}

              {/* Heatmap Layer */}
              {showHeatmap && empresasWithPositions.map((emp) => {
                const count = leadDensity[emp.id] || 0;
                if (count === 0) return null;
                
                const normalizedDensity = count / maxLeadCount;
                const radius = 5 + (normalizedDensity * 25);
                const opacity = 0.2 + (normalizedDensity * 0.4);
                
                return (
                  <Marker key={`heat-${emp.id}`} coordinates={emp.pos}>
                    <circle 
                      r={radius} 
                      fill="rgba(249, 115, 22, 0.4)" // Orange-500
                      stroke="rgba(249, 115, 22, 0.2)"
                      strokeWidth={1}
                      style={{ pointerEvents: 'none' }}
                      className="animate-pulse"
                    />
                    <circle 
                      r={radius * 0.6} 
                      fill="rgba(234, 88, 12, 0.3)" // Orange-600
                      style={{ pointerEvents: 'none' }}
                    />
                  </Marker>
                );
              })}

              {empresasWithPositions.map((emp) => {
                const isSelected = selectedEmpresa?.id === emp.id;
                const status = emp.statusEmpresa || "Não visitada";
                
                let pinColor = "#94a3b8"; // Default slate
                if (status === "Conveniada") pinColor = "#10b981"; // emerald
                else if (status === "Em tratativa") pinColor = "#f59e0b"; // amber
                else if (status === "Cancelada") pinColor = "#ef4444"; // red

                return (
                  <Marker 
                     key={emp.id} 
                     coordinates={emp.pos}
                     data-city-marker="true"
                    onClick={() => {
                      onSelect(emp.id);
                      setShowCard(true);
                      setCenter(emp.pos);
                      if (zoom < 4) setZoom(4);
                    }}
                  >
                    <g transform="translate(-12, -24)">
                      <path
                        d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"
                        fill={isSelected ? "#ffffff" : pinColor}
                        stroke={isSelected ? "#3b82f6" : "#ffffff"}
                        strokeWidth={1.5}
                        className="cursor-pointer drop-shadow-md transition-all duration-200"
                        style={{
                          transformOrigin: "bottom center",
                          transform: isSelected ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                      <circle cx="12" cy="10" r="3" fill={isSelected ? "#3b82f6" : "#ffffff"} className="pointer-events-none" />
                    </g>
                    {isSelected && (
                      <text
                        textAnchor="middle"
                        y={-30}
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fill: "#1e293b",
                          fontSize: (10 / zoom) + "px",
                          fontWeight: "bold",
                          pointerEvents: "none",
                        }}
                        className="drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]"
                      >
                        {emp.nome}
                      </text>
                    )}
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        
        {/* LATERAL FLOATING CARD (Mini-Card) */}
        <AnimatePresence>
          {(selectedEmpresa && showCard) && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-16 w-72 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-5 z-20"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-slate-800 text-sm leading-tight pr-4">{selectedEmpresa.nome}</h4>
                <button 
                  onClick={() => setShowCard(false)} 
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {(() => {
                    const st = selectedEmpresa.statusEmpresa || "Não visitada";
                    if (st === "Conveniada") return <CheckCircle2 size={14} className="text-emerald-500" />;
                    if (st === "Em tratativa") return <AlertTriangle size={14} className="text-amber-500" />;
                    if (st === "Cancelada") return <XCircle size={14} className="text-red-500" />;
                    return <HelpCircle size={14} className="text-slate-400" />;
                  })()}
                  <span className="font-semibold text-xs text-slate-700">
                    {selectedEmpresa.statusEmpresa || "Não visitada"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Responsável</span>
                  <div className="flex items-center space-x-1.5 text-slate-700 font-semibold text-xs">
                    <MapPin size={12} className="text-slate-400" />
                    <span className="line-clamp-1">{selectedEmpresa.responsavel || "Não cadastrado"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Telefone Comercial</span>
                  <div className="flex items-center space-x-1.5 text-slate-700 font-semibold text-xs">
                    <Phone size={12} className="text-slate-400" />
                    <span>{formatPhone(selectedEmpresa.telefone) || "Sem telefone"}</span>
                  </div>
                </div>

                {selectedEmpresa.telefone && (
                  <a
                    href={`https://wa.me/${selectedEmpresa.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center space-x-2 text-xs"
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp</span>
                  </a>
                )}
                
                <button
                  type="button"
                  onClick={() => onGenerateAction(selectedEmpresa)}
                  className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center space-x-2 text-xs"
                >
                  <Calendar size={14} />
                  <span>Gerar Ação</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
