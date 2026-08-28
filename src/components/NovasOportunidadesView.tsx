import React, { useState } from "react";
import { BrainCircuit, Search, Loader2, MapPin, Building2, Phone, Briefcase, PlusCircle } from "lucide-react";
import { EmpresaParceira, BotConfig } from "../types";
import { cn } from "../lib/utils";

interface NovasOportunidadesViewProps {
  data: EmpresaParceira[];
  botConfig?: BotConfig;
  onToast: (m: string, t?: "success" | "error") => void;
  onAdicionarOportunidade?: (empresa: Partial<EmpresaParceira>) => void;
}

interface HunterResult {
  nome: string;
  ramo: string;
  endereco: string;
  telefone: string;
}

export default function NovasOportunidadesView({ data, botConfig, onToast, onAdicionarOportunidade }: NovasOportunidadesViewProps) {
  const [bairro, setBairro] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<HunterResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bairro.trim()) {
      onToast("Informe o bairro ou região para buscar.", "error");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      // Extrai os nomes das empresas já existentes para não trazer repetições
      const empresasExistentes = data.map(e => e.nome);

      const response = await fetch("/api/hunter/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          location: bairro, 
          empresasExistentes,
          openRouterApiKey: botConfig?.openRouterApiKey,
          aiModel: botConfig?.aiModel
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Erro ao buscar novas oportunidades.");
      }

      setResults(resData.results || []);
      if (resData.results?.length > 0) {
        onToast(`${resData.results.length} novas oportunidades encontradas!`, "success");
      } else {
        onToast("Nenhuma nova oportunidade encontrada na região.", "error");
      }
    } catch (err: any) {
      console.error(err);
      onToast(err.message, "error");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BrainCircuit size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-indigo-500/20 backdrop-blur-sm rounded-xl">
              <BrainCircuit className="text-indigo-300" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">HUNTER AI</h2>
              <p className="text-indigo-200 text-sm">IA prospectora de novas parceiras</p>
            </div>
          </div>
          <p className="max-w-2xl text-slate-300 text-lg leading-relaxed">
            Nossa inteligência artificial analisa as empresas já cadastradas na sua base 
            e busca na internet novos estabelecimentos (empresas, escolas, ONGs, clínicas) 
            na região informada para expandir as suas parcerias comerciais.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MapPin className="text-slate-400" size={20} />
            </div>
            <input
              type="text"
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Digite o bairro ou cidade (Ex: Verolme, Angra dos Reis)"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              disabled={isSearching}
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !bairro.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center space-x-2"
          >
            {isSearching ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Analisando...</span>
              </>
            ) : (
              <>
                <Search size={20} />
                <span>Buscar Oportunidades</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {hasSearched && !isSearching && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold text-slate-800">Resultados da Busca</h3>
            <span className="text-sm font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {results.length} organizações encontradas
            </span>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Building2 size={24} />
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2" title={r.nome}>{r.nome}</h4>
                    
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start space-x-3 text-sm text-slate-600">
                        <Briefcase size={16} className="mt-0.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-2" title={r.ramo}>{r.ramo || "Não informado"}</span>
                      </div>
                      
                      <div className="flex items-start space-x-3 text-sm text-slate-600">
                        <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-2" title={r.endereco}>{r.endereco || "Não informado"}</span>
                      </div>

                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <Phone size={16} className="text-slate-400 shrink-0" />
                        <span>{r.telefone || "Não informado"}</span>
                      </div>
                    </div>
                  </div>
                  
                  {onAdicionarOportunidade && (
                    <button 
                      onClick={() => onAdicionarOportunidade({
                        nome: r.nome,
                        endereco: r.endereco,
                        telefone: r.telefone !== "Não encontrado" ? r.telefone : "",
                        statusEmpresa: "Não visitada" // Status inicial
                      })}
                      className="mt-6 w-full flex items-center justify-center space-x-2 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl font-bold transition-all"
                    >
                      <PlusCircle size={18} />
                      <span>Adicionar à Base</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <BrainCircuit className="text-slate-400" size={40} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Busca Esgotada</h4>
              <p className="text-slate-500 max-w-md mx-auto">
                Não foram encontradas novas empresas na região informada, ou todas as empresas relevantes já estão na sua base.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
