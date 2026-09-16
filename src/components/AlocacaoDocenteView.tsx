import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  deleteDoc, 
  doc,
  addDoc,
  updateDoc,
  serverTimestamp
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
  Plus,
  Pencil,
  Copy,
  Check,
  Globe,
  Link as LinkIcon,
  Save,
  AlertCircle
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
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal de cadastro / edição interna
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [savingDocente, setSavingDocente] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    telefone: '',
    email: '',
    lattes: '',
    areasAtuacao: [] as string[],
    formacao: [] as string[],
    diasDisponiveis: [] as string[],
    obs: ''
  });

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

  const handleOpenNew = () => {
    setEditingDocente(null);
    setModalError('');
    setFormData({
      nome: '',
      matricula: '',
      telefone: '',
      email: '',
      lattes: '',
      areasAtuacao: [],
      formacao: [],
      diasDisponiveis: [],
      obs: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: Docente) => {
    setEditingDocente(d);
    setModalError('');
    setFormData({
      nome: d.nome || '',
      matricula: d.matricula || '',
      telefone: d.telefone || '',
      email: d.email || '',
      lattes: d.lattes || '',
      areasAtuacao: Array.isArray(d.areasAtuacao) ? d.areasAtuacao : [],
      formacao: Array.isArray(d.formacao) ? d.formacao : [],
      diasDisponiveis: Array.isArray(d.diasDisponiveis) ? d.diasDisponiveis : [],
      obs: d.obs || ''
    });
    setIsModalOpen(true);
  };

  const handleToggleFormArray = (field: 'areasAtuacao' | 'formacao' | 'diasDisponiveis', val: string) => {
    setFormData(prev => {
      const list = prev[field] || [];
      const updated = list.includes(val) 
        ? list.filter(item => item !== val)
        : [...list, val];
      return { ...prev, [field]: updated };
    });
  };

  const handleSaveDocente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setModalError('O nome completo é obrigatório.');
      return;
    }
    if (!formData.matricula.trim()) {
      setModalError('A matrícula é obrigatória.');
      return;
    }

    setSavingDocente(true);
    setModalError('');

    try {
      const payload = {
        nome: formData.nome.trim(),
        matricula: formData.matricula.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        lattes: formData.lattes.trim(),
        areasAtuacao: formData.areasAtuacao,
        formacao: formData.formacao,
        diasDisponiveis: formData.diasDisponiveis,
        obs: formData.obs.trim(),
        updatedAt: serverTimestamp()
      };

      if (editingDocente) {
        await updateDoc(doc(db, COLLECTIONS.DOCENTES, editingDocente.id), payload);
        onToast('Docente atualizado com sucesso!');
      } else {
        await addDoc(collection(db, COLLECTIONS.DOCENTES), {
          ...payload,
          createdAt: serverTimestamp()
        });
        onToast('Docente cadastrado com sucesso no sistema!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar docente:', err);
      setModalError('Erro ao salvar os dados. Tente novamente.');
      onToast('Erro ao salvar docente.', 'error');
    } finally {
      setSavingDocente(false);
    }
  };

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
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          onToast('Nenhum dado encontrado na planilha.', 'error');
          return;
        }

        let imported = 0;
        for (const row of data) {
          const nome = String(row['Nome'] || row['nome'] || row['NOME'] || '').trim();
          const matricula = String(row['Matrícula'] || row['Matricula'] || row['matricula'] || row['MATRICULA'] || '').trim();
          if (!nome && !matricula) continue;

          const telefone = String(row['Telefone'] || row['telefone'] || '').trim();
          const email = String(row['Email'] || row['E-mail'] || row['email'] || '').trim();
          const lattes = String(row['Currículo Lattes'] || row['Lattes'] || row['lattes'] || '').trim();
          const areasRaw = String(row['Áreas de Atuação'] || row['Areas'] || row['areasAtuacao'] || '').trim();
          const formacaoRaw = String(row['Formação'] || row['Formacao'] || row['formacao'] || '').trim();
          const diasRaw = String(row['Dias Disponíveis'] || row['Dias'] || row['diasDisponiveis'] || '').trim();
          const obs = String(row['Observações'] || row['Obs'] || row['obs'] || '').trim();

          const areasAtuacao = areasRaw ? areasRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
          const formacao = formacaoRaw ? formacaoRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
          const diasDisponiveis = diasRaw ? diasRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

          await addDoc(collection(db, COLLECTIONS.DOCENTES), {
            nome: nome || 'Sem nome',
            matricula: matricula || '',
            telefone,
            email,
            lattes,
            areasAtuacao,
            formacao,
            diasDisponiveis,
            obs,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          imported++;
        }
        onToast(`Importação concluída com sucesso! ${imported} docentes inseridos.`);
      } catch (err) {
        console.error(err);
        onToast('Erro ao ler ou importar arquivo Excel.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredDocentes = docentes.filter(d => {
    const matchesSearch = 
      d.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.matricula?.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const publicLink = `${window.location.origin}/cadastro-docente`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    onToast(`Link copiado: ${publicLink}`);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-blue-600" />
            Alocação Docente
          </h2>
          <p className="text-sm text-slate-500">Histórico, consulta e gestão de docentes cadastrados</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus size={18} />
            Cadastrar Docente
          </button>
          <button 
            onClick={copyPublicLink}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold border border-blue-200 hover:bg-blue-100 transition-all"
          >
            {copiedLink ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
            {copiedLink ? 'Link Copiado!' : 'Copiar Link Público'}
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-all"
          >
            <Download size={18} />
            Exportar Excel
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer">
            <Upload size={18} />
            Importar
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Banner Informativo do Link Público /cadastro-docente */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-100 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm md:text-base">Link de Acesso Livre para Professores</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-full">Público</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Qualquer docente pode acessar e preencher seus dados de alocação sem precisar de login no sistema.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 bg-white/90 px-3 py-1 rounded-lg border border-blue-200 select-all shadow-sm">
                {publicLink}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={copyPublicLink}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            {copiedLink ? 'Copiado!' : 'Copiar Link'}
          </button>
          <a
            href={publicLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ExternalLink size={16} />
            Abrir Formulário
          </a>
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
            <p className="text-slate-500 font-bold mb-3">Nenhum docente encontrado</p>
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Plus size={16} /> Cadastrar Primeiro Docente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDocentes.map(d => (
              <div key={d.id} className="group bg-white p-6 rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-bold text-xl uppercase">
                      {d.nome?.charAt(0) || 'D'}
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
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenEdit(d)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Editar Docente"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(d.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Excluir Docente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone size={14} className="text-emerald-500" /> {d.telefone || 'Não informado'}
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

      {/* Modal de Cadastro / Edição Interna de Docente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {editingDocente ? 'Editar Docente' : 'Cadastrar Novo Docente'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingDocente ? 'Atualize as informações do docente' : 'Preencha os dados cadastrais e de disponibilidade'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDocente} className="space-y-6">
              {/* Dados Básicos */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-blue-500" /> Informações Básicas
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        required
                        value={formData.nome}
                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Prof. Carlos Eduardo Silva"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Matrícula *
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.matricula}
                      onChange={e => setFormData({ ...formData, matricula: e.target.value })}
                      placeholder="Ex: 20241002"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Telefone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="tel"
                        value={formData.telefone}
                        onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="docente@exemplo.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Currículo Lattes (URL)
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="url"
                        value={formData.lattes}
                        onChange={e => setFormData({ ...formData, lattes: e.target.value })}
                        placeholder="http://lattes.cnpq.br/..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Áreas de Atuação */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-blue-500" /> Área de Atuação
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AREAS_ATUACAO.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => handleToggleFormArray('areasAtuacao', area)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center",
                        formData.areasAtuacao.includes(area)
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                      )}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formação Acadêmica */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-blue-500" /> Formação Acadêmica
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FORMACOES.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleToggleFormArray('formacao', f)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center",
                        formData.formacao.includes(f)
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disponibilidade de Dias */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-500" /> Disponibilidade para Aulas
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {DIAS_SEMANA.map(dia => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => handleToggleFormArray('diasDisponiveis', dia)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center",
                        formData.diasDisponiveis.includes(dia)
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                      )}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observações / Aderência */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-500" /> Observações e Disciplinas de Interesse
                </label>
                <textarea 
                  value={formData.obs}
                  onChange={e => setFormData({ ...formData, obs: e.target.value })}
                  placeholder="Descreva disciplinas de interesse, cursos ou observações adicionais..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 bg-slate-50 min-h-[90px]"
                />
              </div>

              {modalError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold">
                  <AlertCircle size={18} />
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDocente}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-blue-500/20"
                >
                  {savingDocente ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      {editingDocente ? 'Salvar Alterações' : 'Cadastrar Docente'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

