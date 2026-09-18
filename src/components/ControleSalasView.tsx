import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, COLLECTIONS, auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { SalaAula, HistoricoSala, MapaoAcademicoEntry, UserProfile } from '../types';
import { 
  DoorClosed, 
  Plus, 
  Search, 
  Filter, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  BookOpen, 
  User, 
  Building2, 
  Users, 
  X, 
  Save, 
  Layers, 
  AlertCircle,
  FileSpreadsheet,
  History,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

const TIPOS_SALA = ['Sala de Aula', 'Laboratório', 'Auditório', 'Outro'] as const;
const STATUS_SALA = ['Disponível', 'Ocupada', 'Manutenção'] as const;
const RECURSOS_DISPONIVEIS = [
  'Projetor / Datashow',
  'Ar-condicionado',
  'Quadro Branco',
  'Computadores',
  'Aparelho de Som / Microfone',
  'TV / Monitor Smart',
  'Acessibilidade PWD'
];
const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

interface Props {
  profile: UserProfile;
  mapao: MapaoAcademicoEntry[];
  onToast: (m: string, t?: 'success' | 'error') => void;
}

export function ControleSalasView({ profile, mapao, onToast }: Props) {
  const [salas, setSalas] = useState<SalaAula[]>([]);
  const [historicoPersistido, setHistoricoPersistido] = useState<HistoricoSala[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-abas internas do Controle de Salas
  const [activeSubTab, setActiveSubTab] = useState<'salas' | 'historico'>('salas');

  // Filtros Salas
  const [searchTermSala, setSearchTermSala] = useState('');
  const [filterTipoSala, setFilterTipoSala] = useState<string>('');
  const [filterStatusSala, setFilterStatusSala] = useState<string>('');

  // Filtros Histórico
  const [searchTermHist, setSearchTermHist] = useState('');
  const [filterDiaHist, setFilterDiaHist] = useState<string>('');
  const [filterSalaHist, setFilterSalaHist] = useState<string>('');

  // Modal Sala
  const [isSalaModalOpen, setIsSalaModalOpen] = useState(false);
  const [editingSala, setEditingSala] = useState<SalaAula | null>(null);
  const [savingSala, setSavingSala] = useState(false);
  const [salaFormData, setSalaFormData] = useState({
    nome: '',
    bloco: '',
    capacidade: 40,
    tipo: 'Sala de Aula' as 'Sala de Aula' | 'Laboratório' | 'Auditório' | 'Outro',
    recursos: [] as string[],
    status: 'Disponível' as 'Disponível' | 'Ocupada' | 'Manutenção',
    observacoes: ''
  });

  // Modal Alocação Manual no Histórico
  const [isHistModalOpen, setIsHistModalOpen] = useState(false);
  const [savingHist, setSavingHist] = useState(false);
  const [histFormData, setHistFormData] = useState({
    salaNome: '',
    dia: 'Segunda-feira',
    horario: '19:00 - 22:00',
    disciplina: '',
    professor: '',
    curso: '',
    turma: ''
  });

  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        console.warn('Anonymous auth in ControleSalasView:', err);
      });
    }

    // 1. Ouvir salas de aula cadastradas
    const unsubSalas = onSnapshot(
      collection(db, COLLECTIONS.SALAS_AULA),
      (snap) => {
        const docs: SalaAula[] = [];
        snap.forEach((d) => {
          docs.push({ id: d.id, ...d.data() } as SalaAula);
        });
        docs.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', undefined, { numeric: true }));
        setSalas(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar salas:', err);
        setLoading(false);
      }
    );

    // 2. Ouvir histórico persistido de salas
    const unsubHist = onSnapshot(
      collection(db, COLLECTIONS.HISTORICO_SALAS),
      (snap) => {
        const docs: HistoricoSala[] = [];
        snap.forEach((d) => {
          docs.push({ id: d.id, ...d.data() } as HistoricoSala);
        });
        setHistoricoPersistido(docs);
      },
      (err) => {
        console.error('Erro ao buscar histórico de salas:', err);
      }
    );

    return () => {
      unsubSalas();
      unsubHist();
    };
  }, []);

  // Agrega todas as alocações automáticas vindas das disciplinas PRESENCIAIS do Mapão
  const alocacoesAutomaticasMapao = useMemo(() => {
    const alocacoes: HistoricoSala[] = [];

    mapao.forEach((entry) => {
      (entry.disciplinas || []).forEach((disc, idx) => {
        if (disc.tipoDisciplina === 'PRESENCIAL' && disc.sala && disc.sala.trim() !== '') {
          alocacoes.push({
            id: `mapao-${entry.id}-${idx}`,
            salaNome: disc.sala.trim(),
            dia: disc.dia || 'Não definido',
            horario: disc.horario || 'Não informado',
            disciplina: disc.disciplina || 'Disciplina sem nome',
            codDisc: disc.codDisc || '',
            professor: disc.professor || 'Não informado',
            curso: entry.curso || '',
            periodo: entry.periodo || '',
            turma: disc.turma || '',
            origem: 'MAPAO',
            mapaoId: entry.id,
            createdAt: entry.createdAt
          });
        }
      });
    });

    return alocacoes;
  }, [mapao]);

  // Lista unificada de histórico & ocupação de salas
  const todasAlocacoes = useMemo(() => {
    // Começa com as automáticas do Mapão
    const lista = [...alocacoesAutomaticasMapao];

    // Adiciona as manuais persistidas que não sejam duplicatas do mapão
    historicoPersistido.forEach((h) => {
      if (h.origem === 'MANUAL') {
        lista.push(h);
      }
    });

    // Ordenar por Dia da semana e Horário
    const ordemDias: Record<string, number> = {
      'Segunda-feira': 1,
      'Segunda': 1,
      'Terça-feira': 2,
      'Terça': 2,
      'Quarta-feira': 3,
      'Quarta': 3,
      'Quinta-feira': 4,
      'Quinta': 4,
      'Sexta-feira': 5,
      'Sexta': 5,
      'Sábado': 6,
      'Sabado': 6
    };

    lista.sort((a, b) => {
      const diaA = ordemDias[a.dia] || 99;
      const diaB = ordemDias[b.dia] || 99;
      if (diaA !== diaB) return diaA - diaB;
      const hA = a.horario || '';
      const hB = b.horario || '';
      if (hA !== hB) return hA.localeCompare(hB);
      return (a.salaNome || '').localeCompare(b.salaNome || '');
    });

    return lista;
  }, [alocacoesAutomaticasMapao, historicoPersistido]);

  // Contagem de alocações por sala para badges informativos
  const ocupacaoPorSala = useMemo(() => {
    const mapa: Record<string, number> = {};
    todasAlocacoes.forEach((aloc) => {
      const chave = aloc.salaNome.trim().toLowerCase();
      mapa[chave] = (mapa[chave] || 0) + 1;
    });
    return mapa;
  }, [todasAlocacoes]);

  // Filtragem de salas
  const salasFiltradas = useMemo(() => {
    return salas.filter((s) => {
      const matchSearch =
        searchTermSala === '' ||
        s.nome.toLowerCase().includes(searchTermSala.toLowerCase()) ||
        (s.bloco && s.bloco.toLowerCase().includes(searchTermSala.toLowerCase())) ||
        (s.observacoes && s.observacoes.toLowerCase().includes(searchTermSala.toLowerCase()));
      const matchTipo = !filterTipoSala || s.tipo === filterTipoSala;
      const matchStatus = !filterStatusSala || s.status === filterStatusSala;
      return matchSearch && matchTipo && matchStatus;
    });
  }, [salas, searchTermSala, filterTipoSala, filterStatusSala]);

  // Filtragem do Histórico
  const historicoFiltrado = useMemo(() => {
    return todasAlocacoes.filter((h) => {
      const matchSearch =
        searchTermHist === '' ||
        h.salaNome.toLowerCase().includes(searchTermHist.toLowerCase()) ||
        h.disciplina.toLowerCase().includes(searchTermHist.toLowerCase()) ||
        (h.professor && h.professor.toLowerCase().includes(searchTermHist.toLowerCase())) ||
        (h.curso && h.curso.toLowerCase().includes(searchTermHist.toLowerCase())) ||
        (h.turma && h.turma.toLowerCase().includes(searchTermHist.toLowerCase()));

      const matchDia = !filterDiaHist || h.dia.toLowerCase().includes(filterDiaHist.toLowerCase());
      const matchSala =
        !filterSalaHist || h.salaNome.trim().toLowerCase() === filterSalaHist.trim().toLowerCase();

      return matchSearch && matchDia && matchSala;
    });
  }, [todasAlocacoes, searchTermHist, filterDiaHist, filterSalaHist]);

  // Operações Sala
  const handleOpenNewSala = () => {
    setEditingSala(null);
    setSalaFormData({
      nome: '',
      bloco: '',
      capacidade: 40,
      tipo: 'Sala de Aula',
      recursos: ['Projetor / Datashow', 'Ar-condicionado', 'Quadro Branco'],
      status: 'Disponível',
      observacoes: ''
    });
    setIsSalaModalOpen(true);
  };

  const handleOpenEditSala = (s: SalaAula) => {
    setEditingSala(s);
    setSalaFormData({
      nome: s.nome || '',
      bloco: s.bloco || '',
      capacidade: s.capacidade || 40,
      tipo: s.tipo || 'Sala de Aula',
      recursos: s.recursos || [],
      status: s.status || 'Disponível',
      observacoes: s.observacoes || ''
    });
    setIsSalaModalOpen(true);
  };

  const handleSaveSala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaFormData.nome.trim()) {
      onToast('Informe o nome ou número da sala.', 'error');
      return;
    }

    setSavingSala(true);
    try {
      if (editingSala) {
        await updateDoc(doc(db, COLLECTIONS.SALAS_AULA, editingSala.id), {
          ...salaFormData,
          updatedAt: serverTimestamp()
        });
        onToast('Sala de aula atualizada com sucesso!', 'success');
      } else {
        await addDoc(collection(db, COLLECTIONS.SALAS_AULA), {
          ...salaFormData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        onToast('Nova sala cadastrada com sucesso!', 'success');
      }
      setIsSalaModalOpen(false);
      setEditingSala(null);
    } catch (err: any) {
      console.error('Erro ao salvar sala:', err);
      onToast('Erro ao salvar sala: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setSavingSala(false);
    }
  };

  const handleDeleteSala = async (sala: SalaAula) => {
    const emUso = (ocupacaoPorSala[sala.nome.trim().toLowerCase()] || 0) > 0;
    const msg = emUso
      ? `Atenção: A sala "${sala.nome}" possui disciplinas vinculadas no Mapão Acadêmico. Deseja realmente excluí-la?`
      : `Deseja realmente excluir a sala "${sala.nome}"?`;

    if (!window.confirm(msg)) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.SALAS_AULA, sala.id));
      onToast('Sala excluída com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao excluir sala:', err);
      onToast('Erro ao excluir sala: ' + (err.message || 'Erro desconhecido'), 'error');
    }
  };

  // Operações Histórico Manual
  const handleOpenNewHist = () => {
    setHistFormData({
      salaNome: salas[0]?.nome || '',
      dia: 'Segunda-feira',
      horario: '19:00 - 22:00',
      disciplina: '',
      professor: '',
      curso: '',
      turma: ''
    });
    setIsHistModalOpen(true);
  };

  const handleSaveHistManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histFormData.salaNome.trim()) {
      onToast('Selecione uma sala.', 'error');
      return;
    }
    if (!histFormData.disciplina.trim()) {
      onToast('Informe o nome da disciplina / aula.', 'error');
      return;
    }

    setSavingHist(true);
    try {
      await addDoc(collection(db, COLLECTIONS.HISTORICO_SALAS), {
        ...histFormData,
        origem: 'MANUAL',
        createdAt: serverTimestamp()
      });
      onToast('Alocação registrada no histórico com sucesso!', 'success');
      setIsHistModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao registrar histórico manual:', err);
      onToast('Erro ao registrar: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setSavingHist(false);
    }
  };

  const handleDeleteHistManual = async (id: string) => {
    if (!window.confirm('Deseja remover este registro manual do histórico?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.HISTORICO_SALAS, id));
      onToast('Registro removido com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao remover histórico:', err);
      onToast('Erro ao remover registro.', 'error');
    }
  };

  const handleExportHistExcel = () => {
    if (historicoFiltrado.length === 0) {
      onToast('Nenhum registro para exportar com os filtros atuais.', 'error');
      return;
    }

    const data = historicoFiltrado.map((h) => ({
      'Sala de Aula': h.salaNome,
      'Dia da Semana': h.dia,
      'Horário': h.horario,
      'Disciplina': h.disciplina,
      'Código': h.codDisc || '',
      'Professor': h.professor || 'Não informado',
      'Curso': h.curso || '',
      'Período': h.periodo || '',
      'Turma': h.turma || '',
      'Origem': h.origem === 'MAPAO' ? 'Mapão Acadêmico (Automático)' : 'Alocação Manual'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historico_Salas');
    XLSX.writeFile(wb, `Historico_Controle_Salas_${new Date().toISOString().split('T')[0]}.xlsx`);
    onToast('Relatório exportado para Excel com sucesso!', 'success');
  };

  const toggleRecurso = (recurso: string) => {
    setSalaFormData((prev) => {
      const exists = prev.recursos.includes(recurso);
      return {
        ...prev,
        recursos: exists ? prev.recursos.filter((r) => r !== recurso) : [...prev.recursos, recurso]
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Card */}
      <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-100 mb-3 border border-white/10">
              <DoorClosed size={14} className="text-blue-300" />
              <span>Gestão de Infraestrutura Acadêmica</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Controle de Salas de Aula
            </h2>
            <p className="text-blue-100/80 text-sm mt-1 max-w-xl">
              Cadastre e organize as salas disponíveis da unidade e acompanhe o histórico de uso e alocação automática vinculado ao Mapão Acadêmico.
            </p>
          </div>

          {/* Metric Badges */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl text-center min-w-[110px]">
              <div className="text-2xl font-black text-white">{salas.length}</div>
              <div className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                Salas Totais
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl text-center min-w-[110px]">
              <div className="text-2xl font-black text-emerald-300">
                {todasAlocacoes.length}
              </div>
              <div className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                Aulas Alocadas
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl text-center min-w-[110px]">
              <div className="text-2xl font-black text-amber-300">
                {Object.keys(ocupacaoPorSala).length}
              </div>
              <div className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                Salas em Uso
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação entre Sub-Abas do Controle de Salas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('salas')}
            className={cn(
              'flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeSubTab === 'salas'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Building2 size={16} />
            <span>Salas Cadastradas ({salas.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('historico')}
            className={cn(
              'flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeSubTab === 'historico'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <History size={16} />
            <span>Histórico de Uso & Ocupação ({todasAlocacoes.length})</span>
          </button>
        </div>

        {activeSubTab === 'salas' ? (
          <button
            onClick={handleOpenNewSala}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Cadastrar Nova Sala</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportHistExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handleOpenNewHist}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Alocação Avulsa</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================
          SUB-ABA 1: SALAS CADASTRADAS
         ========================================================= */}
      {activeSubTab === 'salas' && (
        <div className="space-y-4">
          {/* Filtros de salas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, bloco..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTermSala}
                onChange={(e) => setSearchTermSala(e.target.value)}
              />
              {searchTermSala && (
                <button
                  onClick={() => setSearchTermSala('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterTipoSala}
                onChange={(e) => setFilterTipoSala(e.target.value)}
              >
                <option value="">Todos os Tipos</option>
                {TIPOS_SALA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatusSala}
                onChange={(e) => setFilterStatusSala(e.target.value)}
              >
                <option value="">Todos os Status</option>
                {STATUS_SALA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {(filterTipoSala || filterStatusSala || searchTermSala) && (
                <button
                  onClick={() => {
                    setFilterTipoSala('');
                    setFilterStatusSala('');
                    setSearchTermSala('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Grid de Salas */}
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
              <p className="text-slate-500 text-xs font-semibold">Carregando salas cadastradas...</p>
            </div>
          ) : salasFiltradas.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <DoorClosed size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">Nenhuma sala encontrada</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                {salas.length === 0
                  ? 'Você ainda não cadastrou nenhuma sala de aula. Clique no botão "Cadastrar Nova Sala" acima para começar.'
                  : 'Nenhuma sala corresponde aos filtros selecionados.'}
              </p>
              {salas.length === 0 && (
                <button
                  onClick={handleOpenNewSala}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus size={16} /> Cadastrar Primeira Sala
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salasFiltradas.map((sala) => {
                const totalOcupacoes = ocupacaoPorSala[sala.nome.trim().toLowerCase()] || 0;
                return (
                  <div
                    key={sala.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Header do Card */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-slate-800 tracking-tight">
                              {sala.nome}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                                sala.status === 'Disponível'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : sala.status === 'Ocupada'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              )}
                            >
                              {sala.status || 'Disponível'}
                            </span>
                          </div>
                          {sala.bloco && (
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 size={13} className="text-slate-400" />
                              {sala.bloco}
                            </p>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEditSala(sala)}
                            title="Editar Sala"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteSala(sala)}
                            title="Excluir Sala"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Info Pills */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          <Users size={12} className="text-slate-500" />
                          Capacidade: {sala.capacidade || 40} alunos
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                          <Layers size={12} className="text-indigo-500" />
                          {sala.tipo || 'Sala de Aula'}
                        </span>
                        {totalOcupacoes > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                            <Clock size={12} className="text-blue-600" />
                            {totalOcupacoes} {totalOcupacoes === 1 ? 'aula alocada' : 'aulas alocadas'}
                          </span>
                        )}
                      </div>

                      {/* Recursos da Sala */}
                      {sala.recursos && sala.recursos.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Recursos & Equipamentos
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {sala.recursos.map((rec) => (
                              <span
                                key={rec}
                                className="text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md"
                              >
                                {rec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observações */}
                      {sala.observacoes && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                          "{sala.observacoes}"
                        </p>
                      )}
                    </div>

                    {/* Footer com link rápido para histórico da sala */}
                    <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setFilterSalaHist(sala.nome);
                          setActiveSubTab('historico');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <History size={13} />
                        Ver Ocupação da Sala ({totalOcupacoes})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          SUB-ABA 2: HISTÓRICO DE CONTROLE DE SALAS DE AULA
         ========================================================= */}
      {activeSubTab === 'historico' && (
        <div className="space-y-4">
          {/* Informação explicativa sobre a sincronização automática com o Mapão */}
          <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
            <Sparkles size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-bold mb-0.5">Sincronização Automática com o Mapão Acadêmico</p>
              <p className="text-blue-700">
                Ao cadastrar ou editar uma disciplina presencial no Mapão Acadêmico e definir a sala de aula, ela é registrada e sincronizada automaticamente aqui no Histórico de Controle de Salas, indicando em quais dias e horários a sala está sendo utilizada.
              </p>
            </div>
          </div>

          {/* Barra de Filtros do Histórico */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar disciplina, professor, curso..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTermHist}
                onChange={(e) => setSearchTermHist(e.target.value)}
              />
              {searchTermHist && (
                <button
                  onClick={() => setSearchTermHist('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              {/* Filtro por Dia */}
              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterDiaHist}
                onChange={(e) => setFilterDiaHist(e.target.value)}
              >
                <option value="">Todos os Dias</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Filtro por Sala */}
              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterSalaHist}
                onChange={(e) => setFilterSalaHist(e.target.value)}
              >
                <option value="">Todas as Salas</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.nome}>
                    {s.nome} {s.bloco ? `(${s.bloco})` : ''}
                  </option>
                ))}
              </select>

              {(filterDiaHist || filterSalaHist || searchTermHist) && (
                <button
                  onClick={() => {
                    setFilterDiaHist('');
                    setFilterSalaHist('');
                    setSearchTermHist('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Tabela / Cards de Ocupação */}
          {historicoFiltrado.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <History size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">Nenhuma alocação encontrada</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                {todasAlocacoes.length === 0
                  ? 'Ainda não há nenhuma sala alocada para disciplinas presenciais no Mapão Acadêmico. Ao definir a sala no cadastro da disciplina, ela aparecerá aqui automaticamente.'
                  : 'Nenhum registro coincide com os filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Sala de Aula</th>
                      <th className="py-3.5 px-4">Dia da Semana</th>
                      <th className="py-3.5 px-4">Horário</th>
                      <th className="py-3.5 px-4">Disciplina / Aula</th>
                      <th className="py-3.5 px-4">Professor</th>
                      <th className="py-3.5 px-4">Curso / Turma</th>
                      <th className="py-3.5 px-4">Origem</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {historicoFiltrado.map((item) => (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>{item.salaNome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Calendar size={13} className="text-slate-500" />
                            {item.dia}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-blue-700">
                          <span className="inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            <Clock size={13} className="text-blue-600" />
                            {item.horario}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <div>
                            <span>{item.disciplina}</span>
                            {item.codDisc && (
                              <span className="text-[10px] font-semibold text-slate-400 block">
                                Cód: {item.codDisc}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" />
                            {item.professor || 'Não informado'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-800">{item.curso || '-'}</span>
                            {(item.turma || item.periodo) && (
                              <span className="text-[11px] text-slate-400 block">
                                {item.turma ? `Turma: ${item.turma}` : ''}{' '}
                                {item.periodo ? `(${item.periodo})` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {item.origem === 'MAPAO' ? (
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Sparkles size={11} />
                              Mapão Acadêmico
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {item.origem === 'MANUAL' && (
                            <button
                              onClick={() => handleDeleteHistManual(item.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remover alocação manual"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                          {item.origem === 'MAPAO' && (
                            <span className="text-[11px] font-semibold text-slate-400 italic">
                              Sincronizado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          MODAL: CADASTRO / EDIÇÃO DE SALA
         ========================================================= */}
      {isSalaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <DoorClosed size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">
                    {editingSala ? 'Editar Sala de Aula' : 'Cadastrar Nova Sala'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o nome, capacidade e recursos disponíveis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSalaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSala} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Nome / Número da Sala *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sala 101, Lab de Informática 2, Auditório A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    value={salaFormData.nome}
                    onChange={(e) => setSalaFormData({ ...salaFormData, nome: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Bloco / Prédio / Andar
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bloco B, 2º Andar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    value={salaFormData.bloco}
                    onChange={(e) => setSalaFormData({ ...salaFormData, bloco: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Capacidade (Alunos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    placeholder="Ex: 40"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    value={salaFormData.capacidade}
                    onChange={(e) =>
                      setSalaFormData({ ...salaFormData, capacidade: Number(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Tipo de Sala
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    value={salaFormData.tipo}
                    onChange={(e) =>
                      setSalaFormData({
                        ...salaFormData,
                        tipo: e.target.value as any
                      })
                    }
                  >
                    {TIPOS_SALA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Status Operacional
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    value={salaFormData.status}
                    onChange={(e) =>
                      setSalaFormData({
                        ...salaFormData,
                        status: e.target.value as any
                      })
                    }
                  >
                    {STATUS_SALA.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recursos Disponíveis */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Recursos & Equipamentos na Sala
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RECURSOS_DISPONIVEIS.map((rec) => {
                    const checked = salaFormData.recursos.includes(rec);
                    return (
                      <button
                        key={rec}
                        type="button"
                        onClick={() => toggleRecurso(rec)}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer',
                          checked
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded flex items-center justify-center border transition-all',
                            checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          )}
                        >
                          {checked && <CheckCircle2 size={12} />}
                        </div>
                        <span>{rec}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Sala próxima à escada de emergência, com tomadas individuais..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none"
                  value={salaFormData.observacoes}
                  onChange={(e) => setSalaFormData({ ...salaFormData, observacoes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSalaModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSala}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save size={15} />
                  <span>{savingSala ? 'Salvando...' : editingSala ? 'Salvar Alterações' : 'Cadastrar Sala'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ALOCAÇÃO AVULSA NO HISTÓRICO
         ========================================================= */}
      {isHistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 text-base">Alocação Avulsa de Sala</h3>
                <p className="text-xs text-slate-500">
                  Registre uma atividade ou aula extra no histórico
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHistManual} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Sala de Aula *
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={histFormData.salaNome}
                  onChange={(e) => setHistFormData({ ...histFormData, salaNome: e.target.value })}
                >
                  <option value="">Selecione uma sala...</option>
                  {salas.map((s) => (
                    <option key={s.id} value={s.nome}>
                      {s.nome} {s.bloco ? `(${s.bloco})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Dia da Semana *
                  </label>
                  <select
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={histFormData.dia}
                    onChange={(e) => setHistFormData({ ...histFormData, dia: e.target.value })}
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Horário *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 19:00 - 22:00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={histFormData.horario}
                    onChange={(e) => setHistFormData({ ...histFormData, horario: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Disciplina / Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aula Prática de Anatomia, Prova Especial..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={histFormData.disciplina}
                  onChange={(e) => setHistFormData({ ...histFormData, disciplina: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Professor / Responsável
                </label>
                <input
                  type="text"
                  placeholder="Nome do professor ou coordenador"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={histFormData.professor}
                  onChange={(e) => setHistFormData({ ...histFormData, professor: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Curso (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Enfermagem"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={histFormData.curso}
                    onChange={(e) => setHistFormData({ ...histFormData, curso: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Turma (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ENF-301"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={histFormData.turma}
                    onChange={(e) => setHistFormData({ ...histFormData, turma: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHistModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingHist}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save size={15} />
                  <span>{savingHist ? 'Salvando...' : 'Registrar no Histórico'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
