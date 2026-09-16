import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { Docente, UserProfile } from '../types';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  ExternalLink,
  GraduationCap,
  Calendar,
  BookOpen,
  FileText,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

const AREAS_ATUACAO = [
  'Juridico', 
  'Saúde', 
  'Ciências Biologicas', 
  'Pedagogia', 
  'Técnico', 
  'Engenharia', 
  'Gestão', 
  'Tecnologia'
];

const FORMACOES = [
  'Superior', 
  'Pós Graduado', 
  'Mestrado', 
  'Doutorado'
];

const DIAS_SEMANA = [
  'Segunda', 
  'Terça', 
  'Quarta', 
  'Quinta', 
  'Sexta', 
  'Sábado'
];

interface Props {
  profile: UserProfile;
  onToast: (m: string, t?: "success" | "error") => void;
}

export function AlocacaoDocenteView({ profile, onToast }: Props) {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros
  const [filterFormacao, setFilterFormacao] = useState<string[]>([]);
  const [filterArea, setFilterArea] = useState<string[]>([]);
  const [filterDia, setFilterDia] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.DOCENTES), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Docente[] = [];
      snapshot.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as Docente);
      });
      setDocentes(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este docente?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.DOCENTES, id));
      onToast('Docente excluído com sucesso!');
    } catch (err) {
      console.error(err);
      onToast('Erro ao excluir docente.', 'error');
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredDocentes.map(d => ({
      Nome: d.nome,
      Matrícula: d.matricula,
      Telefone: d.telefone,
      Email: d.email,
      'Currículo Lattes': d.lattes,
      'Áreas de Atuação': d.areasAtuacao?.join(', '),
      Formação: d.formacao?.join(', '),
      'Dias Disponíveis': d.diasDisponiveis?.join(', '),
      Observações: d.obs
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Docentes');
    XLSX.writeFile(wb, 'Alocacao_Docente.xlsx');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        onToast(`Importação em desenvolvimento. ${data.length} registros encontrados.`);
      } catch (err) {
        onToast('Erro ao ler arquivo Excel.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredDocentes = docentes.filter(d => {
    const matchesSearch = 
      d.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.matricula.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFormacao = filterFormacao.length === 0 || d.formacao?.some(f => filterFormacao.includes(f));
    const matchesArea = filterArea.length === 0 || d.areasAtuacao?.some(a => filterArea.includes(a));
    const matchesDia = filterDia.length === 0 || d.diasDisponiveis?.some(dia => filterDia.includes(dia));

    return matchesSearch && matchesFormacao && matchesArea && matchesDia;
  });

  const toggleFilter = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (list.includes(val)) {
      setList(list.filter(item => item !== val));
    } else {
      setList([...list, val]);
    }
  };

  const publicLink = `${window.location.origin}${window.location.pathname}?form=docente`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-blue-600" />
            Alocação Docente
          </h2>
          <p className="text-sm text-slate-500">Histórico e gestão de docentes cadastrados</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(publicLink);
              onToast('Link copiado para a área de transferência!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-100 transition-all"
          >
            <ExternalLink size={18} />
            Link do Formulário
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-all"
          >
            <Download size={18} />
            Exportar Excel
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-bold border border-amber-100 hover:bg-amber-100 transition-all cursor-pointer">
            <Upload size={18} />
            Importar
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
          </label>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou matrícula..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border",
              showFilters || filterFormacao.length > 0 || filterArea.length > 0 || filterDia.length > 0
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
            )}
          >
            <Filter size={18} />
            Filtros
            {(filterFormacao.length > 0 || filterArea.length > 0 || filterDia.length > 0) && (
              <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                {filterFormacao.length + filterArea.length + filterDia.length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap size={14} /> Formação
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FORMACOES.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleFilter(filterFormacao, setFilterFormacao, f)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      filterFormacao.includes(f)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={14} /> Área de Atuação
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AREAS_ATUACAO.map(a => (
                  <button
                    key={a}
                    onClick={() => toggleFilter(filterArea, setFilterArea, a)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      filterArea.includes(a)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={14} /> Disponibilidade
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map(d => (
                  <button
                    key={d}
                    onClick={() => toggleFilter(filterDia, setFilterDia, d)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      filterDia.includes(d)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="md:col-span-3 flex justify-end">
              <button 
                onClick={() => {
                  setFilterFormacao([]);
                  setFilterArea([]);
                  setFilterDia([]);
                }}
                className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
              >
                <X size={14} /> Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredDocentes.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
              <User size={32} />
            </div>
            <p className="text-slate-500 font-bold">Nenhum docente encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDocentes.map(d => (
              <div key={d.id} className="group bg-white p-6 rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-bold text-xl uppercase">
                      {d.nome.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg leading-none mb-1">{d.nome}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase">
                          Mtr: {d.matricula}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{d.email}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(d.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone size={14} className="text-emerald-500" /> {d.telefone}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lattes</p>
                    {d.lattes ? (
                      <a href={d.lattes} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 flex items-center gap-1.5 hover:underline">
                        <ExternalLink size={14} /> Acessar Currículo
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-slate-400">Não informado</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {d.formacao?.map(f => (
                      <span key={f} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100 flex items-center gap-1">
                        <GraduationCap size={10} /> {f}
                      </span>
                    ))}
                    {d.areasAtuacao?.map(a => (
                      <span key={a} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1">
                        <BookOpen size={10} /> {a}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {DIAS_SEMANA.map(dia => {
                      const isAvailable = d.diasDisponiveis?.includes(dia);
                      return (
                        <div 
                          key={dia}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border",
                            isAvailable ? "bg-emerald-500 text-white border-emerald-500" : "bg-slate-50 text-slate-300 border-slate-100"
                          )}
                          title={dia}
                        >
                          {dia.charAt(0)}
                        </div>
                      );
                    })}
                  </div>

                  {d.obs && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText size={10} /> Observações/Aderência
                      </p>
                      <p className="text-sm text-slate-600 font-medium italic">{d.obs}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
