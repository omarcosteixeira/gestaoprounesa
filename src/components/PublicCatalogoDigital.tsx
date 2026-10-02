import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { CursoDisponivel, MetodologiaInfo } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Search, 
  MapPin, 
  Clock, 
  User, 
  GraduationCap, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  Phone,
  Maximize2,
  X,
  Layers
} from "lucide-react";
import { cn } from "../lib/utils";

export function PublicCatalogoDigital() {
  const [cursos, setCursos] = useState<CursoDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCurso, setSelectedCurso] = useState<CursoDisponivel | null>(null);
  const [selectedMetodologia, setSelectedMetodologia] = useState<MetodologiaInfo | null>(null);

  useEffect(() => {
    if (selectedCurso) {
      const metas = selectedCurso.metodologias && selectedCurso.metodologias.length > 0 
        ? selectedCurso.metodologias 
        : [{ nome: selectedCurso.metodologia, observacao: selectedCurso.observacoes || "" }];
      setSelectedMetodologia(metas[0]);
    } else {
      setSelectedMetodologia(null);
    }
  }, [selectedCurso]);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.CURSOS), orderBy("curso", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CursoDisponivel[];
      setCursos(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredCursos = useMemo(() => {
    const raw = cursos.filter(c => 
      c.curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nomeUnidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.produto.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping logic
    const groups: Record<string, CursoDisponivel> = {};
    raw.forEach(c => {
      const key = `${c.nomeUnidade}|${c.produto}|${c.curso}`.toLowerCase();
      if (!groups[key]) {
        groups[key] = { ...c, metodologias: c.metodologias || [{ nome: c.metodologia, observacao: c.observacoes || "" }] };
      } else {
        // Merge methodologies from separate records if they exist
        const existingMetas = groups[key].metodologias || [];
        const newMetas = c.metodologias || [{ nome: c.metodologia, observacao: c.observacoes || "" }];
        
        newMetas.forEach(nm => {
          if (!existingMetas.some(em => em.nome === nm.nome)) {
            existingMetas.push(nm);
          }
        });
        groups[key].metodologias = existingMetas;
        
        // Use the record with more info (description/images) if current one is sparse
        if (!groups[key].descricao && c.descricao) groups[key].descricao = c.descricao;
        if ((!groups[key].imagens || groups[key].imagens?.length === 0) && c.imagens?.length) groups[key].imagens = c.imagens;
      }
    });

    return Object.values(groups);
  }, [cursos, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Carregando Catálogo Digital...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header Imersivo */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Revista Digital</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catálogo de Cursos & Oportunidades</p>
            </div>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar curso, unidade ou modalidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <AnimatePresence mode="popLayout">
            {filteredCursos.map((curso, idx) => (
              <motion.div
                key={curso.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedCurso(curso)}
                className="group bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 cursor-pointer flex flex-col h-full"
              >
                {/* Capa do Card */}
                <div className="h-64 relative overflow-hidden bg-slate-100">
                  {curso.imagens && curso.imagens.length > 0 ? (
                    <img 
                      src={curso.imagens[0]} 
                      alt={curso.curso}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <GraduationCap size={64} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md",
                      curso.produto === "Graduação" ? "bg-white/90 text-indigo-600" :
                      curso.produto === "Técnico" ? "bg-white/90 text-orange-600" :
                      "bg-white/90 text-purple-600"
                    )}>
                      {curso.produto}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <span className="text-white text-sm font-bold flex items-center gap-2">
                      Ver detalhes <ArrowRight size={16} />
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 text-slate-400">
                    <MapPin size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{curso.nomeUnidade}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {curso.curso}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Metodologias</p>
                      <div className="flex flex-wrap gap-1">
                        {(curso.metodologias || []).slice(0, 2).map((m, i) => (
                          <span key={i} className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {m.nome}
                          </span>
                        ))}
                        {(curso.metodologias?.length || 0) > 2 && (
                          <span className="text-[10px] font-bold text-indigo-600">+{curso.metodologias!.length - 2}</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Duração</p>
                      <p className="text-xs font-bold text-slate-700">{curso.duracao}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredCursos.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum curso encontrado</h3>
            <p className="text-slate-500">Tente buscar por termos diferentes ou confira outras categorias.</p>
          </div>
        )}
      </main>

      {/* Modal imersivo de Detalhes (Estilo Revista) */}
      <AnimatePresence>
        {selectedCurso && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCurso(null)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedCurso(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xl"
              >
                <X size={24} />
              </button>

              {/* Galeria Lateral */}
              <div className="w-full md:w-1/2 h-80 md:h-auto relative bg-slate-900">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={selectedCurso.imagens?.[0]}
                    src={selectedCurso.imagens?.[0] || 'https://images.unsplash.com/photo-1523050335392-93851179ae22?q=80&w=2067&auto=format&fit=crop'}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                </AnimatePresence>
                
                {selectedCurso.imagens && selectedCurso.imagens.length > 1 && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                    {selectedCurso.imagens.map((_, i) => (
                      <div key={i} className={cn("w-2 h-2 rounded-full transition-all", i === 0 ? "bg-white w-6" : "bg-white/40")} />
                    ))}
                  </div>
                )}
              </div>

              {/* Informações detalhadas */}
              <div className="flex-1 overflow-y-auto p-8 md:p-14 bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                    {selectedCurso.produto}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {selectedCurso.nomeUnidade}
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-[1.1]">
                  {selectedCurso.curso}
                </h2>

                <div className="grid grid-cols-2 gap-6 mb-12">
                  <div className="col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Layers size={14} />
                      Escolha a Metodologia
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {(selectedCurso.metodologias || []).map((m, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedMetodologia(m)}
                          className={cn(
                            "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border-2",
                            selectedMetodologia?.nome === m.nome
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                              : "bg-white text-slate-500 border-slate-100 hover:border-indigo-200"
                          )}
                        >
                          {m.nome}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                      <Maximize2 size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Duração</p>
                      <p className="text-sm font-bold text-slate-900">{selectedCurso.duracao}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {selectedMetodologia?.observacao && (
                    <motion.div 
                      key={selectedMetodologia.nome}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-amber-50 p-6 rounded-3xl border border-amber-100"
                    >
                      <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Clock size={14} />
                        Como funciona o {selectedMetodologia.nome}
                      </h4>
                      <p className="text-amber-900/80 text-sm leading-relaxed font-medium">
                        {selectedMetodologia.observacao}
                      </p>
                    </motion.div>
                  )}

                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <span>Descrição do Curso</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      {selectedCurso.descricao || "Explore as possibilidades deste curso e transforme seu futuro acadêmico e profissional."}
                    </p>
                  </div>

                  {selectedCurso.observacoes && (
                    <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <LinkIcon size={14} />
                        <span>Informações Gerais</span>
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                        {selectedCurso.observacoes}
                      </p>
                    </div>
                  )}

                  {selectedCurso.possuiCoordenador && selectedCurso.coordenador && (
                    <div className="pt-8">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-2">
                        Coordenação Acadêmica
                      </h4>
                      <div className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                        <div className="w-20 h-20 rounded-2xl bg-white shadow-lg overflow-hidden shrink-0 border-4 border-white">
                          <img 
                            src={selectedCurso.coordenador.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop'} 
                            alt={selectedCurso.coordenador.nome}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-lg font-black text-slate-900 mb-1">{selectedCurso.coordenador.nome}</h5>
                          <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                            {selectedCurso.coordenador.descricao}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {selectedCurso.coordenador.lattes && (
                              <a 
                                href={selectedCurso.coordenador.lattes} 
                                target="_blank" 
                                className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
                              >
                                <LinkIcon size={12} /> LATTES
                              </a>
                            )}
                            {selectedCurso.coordenador.contato && (
                              <div className="inline-flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black text-white shadow-lg shadow-indigo-100">
                                <Phone size={12} /> {selectedCurso.coordenador.contato}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-14 flex items-center justify-between gap-6 border-t border-slate-100 pt-8">
                  <div className="text-slate-400 italic text-xs">
                    Interessado neste curso? Entre em contato com a unidade.
                  </div>
                  <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    Inscrever-se Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer minimalista */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            © 2024 Gestão PRO — Todos os direitos reservados
          </div>
          <div className="flex items-center gap-8 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600 transition-colors">Termos</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
