import React, { useState, useEffect, useMemo } from 'react';
import {
  DoorOpen,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  Copy,
  X,
  Check,
  Building2,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Info,
  CalendarDays,
  Armchair
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, COLLECTIONS, handleFirestoreError, OperationType } from '../firebase';
import { SalaAula, UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onToast: (m: string, t?: 'success' | 'error') => void;
}

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const;

const DIAS_SIGLAS: { [key: string]: string } = {
  'Segunda-feira': 'SEG',
  'Terça-feira': 'TER',
  'Quarta-feira': 'QUA',
  'Quinta-feira': 'QUI',
  'Sexta-feira': 'SEX',
  'Sábado': 'SÁB',
  'Domingo': 'DOM',
};

const ANDARES_PADRAO = [
  'Subsolo',
  'Térreo',
  '1º Andar',
  '2º Andar',
  '3º Andar',
  '4º Andar',
  '5º Andar',
  'Anexo',
];

const TIPOS_SALA = [
  'Sala de Aula',
  'Laboratório de Informática',
  'Laboratório de Saúde/Ciências',
  'Auditório',
  'Sala de Reunião',
  'Oficina/Prancheta',
  'Outro',
];

const RECURSOS_DISPONIVEIS = [
  'Ar Condicionado',
  'Projetor / Multimídia',
  'Computadores',
  'Quadro Branco',
  'Lousa Interativa',
  'Acessibilidade PCD',
  'Tomadas Individuais',
  'Sistema de Som',
];

const TURNOS = ['Manhã', 'Tarde', 'Noite'];

export function ControleSalasAulaView({ profile, onToast }: Props) {
  const [salas, setSalas] = useState<SalaAula[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAndar, setFilterAndar] = useState<string>('todos');
  const [filterDia, setFilterDia] = useState<string>('todos');
  const [filterStatusDia, setFilterStatusDia] = useState<'todos' | 'ocupadas' | 'livres'>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterMinCadeiras, setFilterMinCadeiras] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'cards' | 'tabela' | 'matriz'>('cards');
  const [showFilters, setShowFilters] = useState(false);

  // Modal de cadastro / edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSala, setEditingSala] = useState<SalaAula | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Formulário
  const [numero, setNumero] = useState('');
  const [andar, setAndar] = useState('1º Andar');
  const [andarCustom, setAndarCustom] = useState('');
  const [quantidadeCadeiras, setQuantidadeCadeiras] = useState<number | ''>(40);
  const [diasOcupados, setDiasOcupados] = useState<string[]>([]);
  const [turnosOcupados, setTurnosOcupados] = useState<string[]>(['Manhã', 'Noite']);
  const [tipo, setTipo] = useState<string>('Sala de Aula');
  const [recursos, setRecursos] = useState<string[]>(['Ar Condicionado', 'Quadro Branco']);
  const [disciplinaTurma, setDisciplinaTurma] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [obs, setObs] = useState('');
  const [status, setStatus] = useState<'Ocupada' | 'Livre' | 'Manutenção' | 'Ocupação Parcial'>('Livre');

  // Confirmação de exclusão
  const [deletingSala, setDeletingSala] = useState<SalaAula | null>(null);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);

  // Determina o dia da semana atual
  const hojeDiaSemana = useMemo(() => {
    const dias = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const index = new Date().getDay();
    return dias[index];
  }, []);

  // Inscrição em tempo real no Firestore
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        console.warn('Anonymous auth check in ControleSalasAulaView:', err);
      });
    }

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.SALAS_AULA),
      (snapshot) => {
        const items: SalaAula[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as SalaAula);
        });

        // Ordenar por andar e número da sala
        items.sort((a, b) => {
          if (a.andar !== b.andar) {
            return a.andar.localeCompare(b.andar, undefined, { numeric: true });
          }
          return a.numero.localeCompare(b.numero, undefined, { numeric: true });
        });

        setSalas(items);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, COLLECTIONS.SALAS_AULA);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Lista única de andares presentes nas salas cadastradas
  const andaresDisponiveis = useMemo(() => {
    const list = Array.from(new Set(salas.map((s) => s.andar).filter(Boolean)));
    list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return list;
  }, [salas]);

  // Estatísticas e métricas
  const stats = useMemo(() => {
    const totalSalas = salas.length;
    const totalCadeiras = salas.reduce((acc, s) => acc + (Number(s.quantidadeCadeiras) || 0), 0);
    const mediaCadeiras = totalSalas > 0 ? Math.round(totalCadeiras / totalSalas) : 0;

    // Salas ocupadas no dia atual
    const ocupadasHoje = salas.filter((s) => s.diasOcupados?.includes(hojeDiaSemana)).length;
    const livresHoje = totalSalas - ocupadasHoje;
    const taxaOcupacaoHoje = totalSalas > 0 ? Math.round((ocupadasHoje / totalSalas) * 100) : 0;

    // Andares distintos
    const totalAndares = andaresDisponiveis.length;

    return {
      totalSalas,
      totalCadeiras,
      mediaCadeiras,
      ocupadasHoje,
      livresHoje,
      taxaOcupacaoHoje,
      totalAndares,
    };
  }, [salas, hojeDiaSemana, andaresDisponiveis]);

  // Filtragem
  const filteredSalas = useMemo(() => {
    return salas.filter((s) => {
      // Busca geral
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNumero = s.numero?.toLowerCase().includes(query);
        const matchAndar = s.andar?.toLowerCase().includes(query);
        const matchTipo = s.tipo?.toLowerCase().includes(query);
        const matchTurma = s.disciplinaTurma?.toLowerCase().includes(query);
        const matchResp = s.responsavel?.toLowerCase().includes(query);
        const matchRecursos = s.recursos?.some((r) => r.toLowerCase().includes(query));
        if (!matchNumero && !matchAndar && !matchTipo && !matchTurma && !matchResp && !matchRecursos) {
          return false;
        }
      }

      // Filtro por andar
      if (filterAndar !== 'todos' && s.andar !== filterAndar) {
        return false;
      }

      // Filtro por tipo
      if (filterTipo !== 'todos' && s.tipo !== filterTipo) {
        return false;
      }

      // Filtro por capacidade mínima de cadeiras
      if (filterMinCadeiras > 0 && (s.quantidadeCadeiras || 0) < filterMinCadeiras) {
        return false;
      }

      // Filtro por dia da semana
      if (filterDia !== 'todos') {
        const ocupadaNesseDia = s.diasOcupados?.includes(filterDia);
        if (filterStatusDia === 'ocupadas' && !ocupadaNesseDia) return false;
        if (filterStatusDia === 'livres' && ocupadaNesseDia) return false;
        if (filterStatusDia === 'todos' && !ocupadaNesseDia) return false;
      }

      return true;
    });
  }, [salas, searchTerm, filterAndar, filterTipo, filterMinCadeiras, filterDia, filterStatusDia]);

  // Abertura do modal para nova sala
  const handleOpenNew = () => {
    setEditingSala(null);
    setNumero('');
    setAndar('1º Andar');
    setAndarCustom('');
    setQuantidadeCadeiras(40);
    setDiasOcupados(['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']);
    setTurnosOcupados(['Manhã', 'Noite']);
    setTipo('Sala de Aula');
    setRecursos(['Ar Condicionado', 'Quadro Branco']);
    setDisciplinaTurma('');
    setResponsavel('');
    setObs('');
    setStatus('Ocupada');
    setModalError('');
    setIsModalOpen(true);
  };

  // Abertura do modal para edição
  const handleOpenEdit = (sala: SalaAula) => {
    setEditingSala(sala);
    setNumero(sala.numero || '');
    if (ANDARES_PADRAO.includes(sala.andar)) {
      setAndar(sala.andar);
      setAndarCustom('');
    } else {
      setAndar('outro');
      setAndarCustom(sala.andar || '');
    }
    setQuantidadeCadeiras(sala.quantidadeCadeiras ?? 40);
    setDiasOcupados(sala.diasOcupados || []);
    setTurnosOcupados(sala.turnosOcupados || ['Manhã', 'Noite']);
    setTipo(sala.tipo || 'Sala de Aula');
    setRecursos(sala.recursos || []);
    setDisciplinaTurma(sala.disciplinaTurma || '');
    setResponsavel(sala.responsavel || '');
    setObs(sala.obs || '');
    setStatus(sala.status || (sala.diasOcupados?.length ? 'Ocupada' : 'Livre'));
    setModalError('');
    setIsModalOpen(true);
  };

  // Duplicar sala (atalho prático para agilizar cadastro de blocos de salas)
  const handleDuplicate = (sala: SalaAula) => {
    setEditingSala(null);
    setNumero(`${sala.numero} (Cópia)`);
    if (ANDARES_PADRAO.includes(sala.andar)) {
      setAndar(sala.andar);
      setAndarCustom('');
    } else {
      setAndar('outro');
      setAndarCustom(sala.andar || '');
    }
    setQuantidadeCadeiras(sala.quantidadeCadeiras ?? 40);
    setDiasOcupados([...(sala.diasOcupados || [])]);
    setTurnosOcupados([...(sala.turnosOcupados || [])]);
    setTipo(sala.tipo || 'Sala de Aula');
    setRecursos([...(sala.recursos || [])]);
    setDisciplinaTurma(sala.disciplinaTurma || '');
    setResponsavel(sala.responsavel || '');
    setObs(sala.obs || '');
    setStatus(sala.status || 'Livre');
    setModalError('');
    setIsModalOpen(true);
    onToast('Sala duplicada! Ajuste o número e salve.', 'success');
  };

  // Toggle de dias ocupados
  const handleToggleDia = (dia: string) => {
    setDiasOcupados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  // Toggle de turnos ocupados
  const handleToggleTurno = (turno: string) => {
    setTurnosOcupados((prev) =>
      prev.includes(turno) ? prev.filter((t) => t !== turno) : [...prev, turno]
    );
  };

  // Toggle de recursos
  const handleToggleRecurso = (rec: string) => {
    setRecursos((prev) =>
      prev.includes(rec) ? prev.filter((r) => r !== rec) : [...prev, rec]
    );
  };

  // Salvar sala no Firestore
  const handleSaveSala = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!numero.trim()) {
      setModalError('Informe o número ou identificação da sala.');
      return;
    }

    const finalAndar = andar === 'outro' ? andarCustom.trim() : andar;
    if (!finalAndar) {
      setModalError('Informe o andar da sala.');
      return;
    }

    const qtd = Number(quantidadeCadeiras);
    if (isNaN(qtd) || qtd <= 0) {
      setModalError('Informe uma quantidade válida de cadeiras (maior que 0).');
      return;
    }

    setSaving(true);
    try {
      const calculatedStatus =
        status || (diasOcupados.length === 0 ? 'Livre' : diasOcupados.length === 7 ? 'Ocupada' : 'Ocupação Parcial');

      const payload: Partial<SalaAula> = {
        numero: numero.trim(),
        andar: finalAndar,
        quantidadeCadeiras: qtd,
        diasOcupados: diasOcupados,
        turnosOcupados: turnosOcupados,
        tipo: tipo as any,
        recursos: recursos,
        disciplinaTurma: disciplinaTurma.trim() || undefined,
        responsavel: responsavel.trim() || undefined,
        obs: obs.trim() || undefined,
        status: calculatedStatus,
        unidade: profile.unidade || undefined,
        updatedAt: serverTimestamp(),
      };

      if (editingSala) {
        await updateDoc(doc(db, COLLECTIONS.SALAS_AULA, editingSala.id), payload);
        onToast(`Sala ${numero} atualizada com sucesso!`, 'success');
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, COLLECTIONS.SALAS_AULA), payload);
        onToast(`Sala ${numero} cadastrada com sucesso!`, 'success');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar sala:', err);
      setModalError(err.message || 'Erro ao salvar sala no banco de dados.');
      handleFirestoreError(
        err,
        editingSala ? OperationType.UPDATE : OperationType.CREATE,
        COLLECTIONS.SALAS_AULA
      );
    } finally {
      setSaving(false);
    }
  };

  // Exclusão de sala
  const handleDeleteSala = async () => {
    if (!deletingSala) return;
    setConfirmDeleteLoading(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.SALAS_AULA, deletingSala.id));
      onToast(`Sala ${deletingSala.numero} excluída com sucesso!`, 'success');
      setDeletingSala(null);
    } catch (err: any) {
      console.error('Erro ao excluir sala:', err);
      onToast('Erro ao excluir sala.', 'error');
      handleFirestoreError(err, OperationType.DELETE, COLLECTIONS.SALAS_AULA);
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  // Exportação para Excel (.xlsx)
  const handleExportExcel = () => {
    if (salas.length === 0) {
      onToast('Nenhuma sala disponível para exportação.', 'error');
      return;
    }

    const dataToExport = filteredSalas.map((s) => ({
      'Número da Sala': s.numero,
      'Andar': s.andar,
      'Quantidade de Cadeiras': s.quantidadeCadeiras,
      'Dias Ocupados': s.diasOcupados?.join(', ') || 'Nenhum (Livre)',
      'Total Dias Ocupados': s.diasOcupados?.length || 0,
      'Turnos Ocupados': s.turnosOcupados?.join(', ') || 'Não especificado',
      'Tipo': s.tipo || 'Sala de Aula',
      'Status': s.status || (s.diasOcupados?.length ? 'Ocupada' : 'Livre'),
      'Turmas / Disciplinas': s.disciplinaTurma || '-',
      'Responsável': s.responsavel || '-',
      'Recursos': s.recursos?.join(', ') || '-',
      'Observações': s.obs || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salas de Aula');
    XLSX.writeFile(wb, `Controle_Salas_de_Aula_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onToast('Relatório exportado para Excel com sucesso!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO PRINCIPAL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <DoorOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Controle de Salas de Aula</h2>
              <p className="text-xs text-slate-500">
                Gestão de capacidade de cadeiras, distribuição por andares e dias de ocupação semanal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Exportar dados para planilha Excel"
          >
            <Download size={15} />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Cadastrar Sala</span>
          </button>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS & KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total de Salas</span>
            <Building2 size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalSalas}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalAndares} andares com salas</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total de Cadeiras</span>
            <Armchair size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalCadeiras}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Média de {stats.mediaCadeiras} por sala</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Ocupadas Hoje</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.ocupadasHoje}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{hojeDiaSemana}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Livres Hoje</span>
            <XCircle size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.livresHoje}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Disponíveis p/ alocação</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Taxa de Ocupação</span>
            <CalendarDays size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.taxaOcupacaoHoje}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.taxaOcupacaoHoje, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS & VISUALIZAÇÕES */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por número da sala, andar, disciplina ou recurso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Alternador de Modo de Visualização */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start md:self-auto">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'tabela'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon size={14} />
              <span>Tabela</span>
            </button>

            <button
              onClick={() => setViewMode('matriz')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'matriz'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grade Semanal de Ocupação de Salas"
            >
              <CalendarDays size={14} />
              <span>Matriz Semanal</span>
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                showFilters || filterAndar !== 'todos' || filterDia !== 'todos' || filterMinCadeiras > 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
            </button>
          </div>
        </div>

        {/* DIAS DA SEMANA RÁPIDOS */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap mr-1">
            Filtrar por Dia:
          </span>
          <button
            onClick={() => {
              setFilterDia('todos');
              setFilterStatusDia('todos');
            }}
            className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              filterDia === 'todos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos os Dias
          </button>
          {DIAS_SEMANA.map((dia) => {
            const isSelected = filterDia === dia;
            const isHoje = dia === hojeDiaSemana;
            return (
              <button
                key={dia}
                onClick={() => setFilterDia(isSelected ? 'todos' : dia)}
                className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{dia}</span>
                {isHoje && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      isSelected ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    Hoje
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* PAINEL EXPANSÍVEL DE FILTROS AVANÇADOS */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Filtrar por Andar:
              </label>
              <select
                value={filterAndar}
                onChange={(e) => setFilterAndar(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Andares</option>
                {andaresDisponiveis.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tipo de Espaço:
              </label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Tipos</option>
                {TIPOS_SALA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Status no Dia Selecionado:
              </label>
              <select
                value={filterStatusDia}
                onChange={(e) => setFilterStatusDia(e.target.value as any)}
                disabled={filterDia === 'todos'}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="todos">Ocupadas e Livres</option>
                <option value="ocupadas">Somente Ocupadas no Dia</option>
                <option value="livres">Somente Livres no Dia</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Capacidade Mínima (Cadeiras):
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={0}
                  step={5}
                  placeholder="Ex: 30"
                  value={filterMinCadeiras || ''}
                  onChange={(e) => setFilterMinCadeiras(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {(filterAndar !== 'todos' ||
                  filterDia !== 'todos' ||
                  filterMinCadeiras > 0 ||
                  filterTipo !== 'todos' ||
                  filterStatusDia !== 'todos') && (
                  <button
                    onClick={() => {
                      setFilterAndar('todos');
                      setFilterDia('todos');
                      setFilterTipo('todos');
                      setFilterMinCadeiras(0);
                      setFilterStatusDia('todos');
                    }}
                    className="p-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Limpar todos os filtros"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ÁREA PRINCIPAL: LISTAGEM DE SALAS */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-medium">Carregando dados das salas de aula...</p>
        </div>
      ) : filteredSalas.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <DoorOpen size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Nenhuma sala encontrada</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {salas.length === 0
                ? 'Nenhuma sala de aula foi cadastrada ainda. Clique no botão abaixo para adicionar a primeira sala.'
                : 'Nenhuma sala corresponde aos critérios de busca ou filtros selecionados.'}
            </p>
          </div>
          {salas.length === 0 ? (
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Cadastrar Primeira Sala</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterAndar('todos');
                setFilterDia('todos');
                setFilterStatusDia('todos');
                setFilterTipo('todos');
                setFilterMinCadeiras(0);
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <X size={14} />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* MODO CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSalas.map((sala) => {
            const ocupadaHoje = sala.diasOcupados?.includes(hojeDiaSemana);
            return (
              <div
                key={sala.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between space-y-4"
              >
                {/* Cabeçalho do Card: Número, Andar e Capacidade */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-slate-800 tracking-tight">
                          {sala.numero}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100">
                          {sala.andar}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{sala.tipo || 'Sala de Aula'}</p>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDuplicate(sala)}
                        title="Duplicar sala"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(sala)}
                        title="Editar sala"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingSala(sala)}
                        title="Excluir sala"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Capacidade de Cadeiras & Status Hoje */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-1.5 text-slate-700">
                      <div className="p-1 bg-amber-50 text-amber-600 rounded-md">
                        <Armchair size={15} />
                      </div>
                      <span className="text-sm font-bold">{sala.quantidadeCadeiras}</span>
                      <span className="text-xs text-slate-500 font-medium">cadeiras</span>
                    </div>

                    <div>
                      {ocupadaHoje ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>Ocupada Hoje</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Livre Hoje</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dias da Semana Ocupados */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Calendar size={13} className="text-slate-400" />
                      <span>Dias Ocupados na Semana:</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {sala.diasOcupados?.length || 0} de 7 dias
                    </span>
                  </div>

                  {/* Chips dos Dias (SEG a DOM) */}
                  <div className="grid grid-cols-7 gap-1">
                    {DIAS_SEMANA.map((dia) => {
                      const isOcupado = sala.diasOcupados?.includes(dia);
                      const isHoje = dia === hojeDiaSemana;
                      return (
                        <div
                          key={dia}
                          title={`${dia}: ${isOcupado ? 'Ocupada' : 'Livre'}${isHoje ? ' (Hoje)' : ''}`}
                          className={`flex flex-col items-center justify-center py-1 rounded text-center transition-all ${
                            isOcupado
                              ? 'bg-rose-500 text-white font-bold shadow-xs'
                              : 'bg-white text-slate-400 border border-slate-200/60 font-medium'
                          } ${isHoje ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                        >
                          <span className="text-[9px] leading-tight">{DIAS_SIGLAS[dia]}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Turnos ocupados se houver */}
                  {sala.turnosOcupados && sala.turnosOcupados.length > 0 && (
                    <div className="flex items-center space-x-1 pt-1 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-600">Turnos:</span>
                      <span>{sala.turnosOcupados.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Informações adicionais (Turma, Recursos) */}
                <div className="space-y-1.5 text-xs">
                  {sala.disciplinaTurma && (
                    <div className="text-[11px] text-slate-600 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                      <span className="font-semibold text-blue-900">Alocação: </span>
                      <span className="text-slate-700">{sala.disciplinaTurma}</span>
                    </div>
                  )}

                  {sala.recursos && sala.recursos.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {sala.recursos.slice(0, 3).map((rec) => (
                        <span
                          key={rec}
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]"
                        >
                          {rec}
                        </span>
                      ))}
                      {sala.recursos.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px]">
                          +{sala.recursos.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'tabela' ? (
        /* MODO TABELA */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Número da Sala</th>
                  <th className="px-4 py-3">Andar</th>
                  <th className="px-4 py-3 text-center">Cadeiras</th>
                  <th className="px-4 py-3">Dias Ocupados</th>
                  <th className="px-4 py-3">Hoje ({DIAS_SIGLAS[hojeDiaSemana]})</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Turmas / Obs</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalas.map((sala) => {
                  const ocupadaHoje = sala.diasOcupados?.includes(hojeDiaSemana);
                  return (
                    <tr key={sala.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        <div className="flex items-center space-x-2">
                          <DoorOpen size={15} className="text-blue-600" />
                          <span>{sala.numero}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">{sala.andar}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-bold text-xs">
                          <Armchair size={12} />
                          <span>{sala.quantidadeCadeiras}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {DIAS_SEMANA.map((dia) => {
                            const isOcupado = sala.diasOcupados?.includes(dia);
                            if (!isOcupado) return null;
                            return (
                              <span
                                key={dia}
                                className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold"
                              >
                                {DIAS_SIGLAS[dia]}
                              </span>
                            );
                          })}
                          {(!sala.diasOcupados || sala.diasOcupados.length === 0) && (
                            <span className="text-[11px] text-emerald-600 font-semibold">
                              Livre toda semana
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {ocupadaHoje ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                            Ocupada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            Livre
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{sala.tipo || 'Sala de Aula'}</td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                        {sala.disciplinaTurma || sala.obs || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleDuplicate(sala)}
                            title="Duplicar"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(sala)}
                            title="Editar"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingSala(sala)}
                            title="Excluir"
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODO MATRIZ SEMANAL DE OCUPAÇÃO */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-800">Matriz Semanal de Ocupação de Salas</h3>
              <p className="text-xs text-slate-500">
                Visão panorâmica de ocupação dia a dia para rápida alocação de turmas e eventos
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span>Ocupada</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                <span>Livre</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3 border-r border-slate-200">Sala</th>
                  <th className="p-3 border-r border-slate-200">Andar</th>
                  <th className="p-3 border-r border-slate-200 text-center">Cadeiras</th>
                  {DIAS_SEMANA.map((dia) => (
                    <th
                      key={dia}
                      className={`p-3 text-center border-r border-slate-200 last:border-r-0 ${
                        dia === hojeDiaSemana ? 'bg-blue-50 text-blue-800 font-extrabold' : ''
                      }`}
                    >
                      <div>{DIAS_SIGLAS[dia]}</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        {dia === hojeDiaSemana ? 'Hoje' : ''}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalas.map((sala) => (
                  <tr key={sala.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-100">
                      <div className="flex items-center justify-between">
                        <span>{sala.numero}</span>
                        <button
                          onClick={() => handleOpenEdit(sala)}
                          className="text-slate-300 hover:text-blue-600 p-1"
                          title="Editar sala"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 border-r border-slate-100 font-medium">
                      {sala.andar}
                    </td>
                    <td className="p-3 text-center text-slate-800 font-bold border-r border-slate-100">
                      {sala.quantidadeCadeiras}
                    </td>
                    {DIAS_SEMANA.map((dia) => {
                      const isOcupado = sala.diasOcupados?.includes(dia);
                      return (
                        <td
                          key={dia}
                          className={`p-2 text-center border-r border-slate-100 last:border-r-0 ${
                            dia === hojeDiaSemana ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          {isOcupado ? (
                            <span className="inline-block px-2 py-1 rounded bg-rose-500 text-white font-bold text-[10px] shadow-xs">
                              Ocupada
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                              Livre
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE SALA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <DoorOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingSala ? 'Editar Sala de Aula' : 'Cadastrar Nova Sala'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha as informações de infraestrutura e ocupação semanal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSala} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Número da Sala */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número / Identificação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 101, Lab 204"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Andar */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Andar *
                  </label>
                  <select
                    value={andar}
                    onChange={(e) => setAndar(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {ANDARES_PADRAO.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                    <option value="outro">Outro Andar...</option>
                  </select>
                </div>

                {/* Quantidade de Cadeiras */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantidade de Cadeiras *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Ex: 40"
                    value={quantidadeCadeiras}
                    onChange={(e) =>
                      setQuantidadeCadeiras(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {andar === 'outro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Especifique o Andar / Localização *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mezanino, Bloco C 3º Andar..."
                    value={andarCustom}
                    onChange={(e) => setAndarCustom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              )}

              {/* DIAS DA SEMANA OCUPADOS */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Calendar size={14} className="text-blue-600" />
                    <span>Dias da Semana em que a Sala está Ocupada:</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDiasOcupados([
                          'Segunda-feira',
                          'Terça-feira',
                          'Quarta-feira',
                          'Quinta-feira',
                          'Sexta-feira',
                        ])
                      }
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      Seg a Sex
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setDiasOcupados([...DIAS_SEMANA])}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setDiasOcupados([])}
                      className="text-[10px] text-slate-500 hover:underline font-medium"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DIAS_SEMANA.map((dia) => {
                    const isChecked = diasOcupados.includes(dia);
                    return (
                      <button
                        type="button"
                        key={dia}
                        onClick={() => handleToggleDia(dia)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>{dia}</span>
                        {isChecked ? (
                          <Check size={14} className="text-rose-600" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * Os dias não marcados ficarão marcados automaticamente como livres para novas alocações.
                </p>
              </div>

              {/* TURNOS & TIPO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipo de Sala */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Espaço
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {TIPOS_SALA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Turnos Ocupados */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Turnos de Ocupação
                  </label>
                  <div className="flex items-center space-x-1.5 pt-0.5">
                    {TURNOS.map((turno) => {
                      const isChecked = turnosOcupados.includes(turno);
                      return (
                        <button
                          type="button"
                          key={turno}
                          onClick={() => handleToggleTurno(turno)}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {turno}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recursos Disponíveis */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recursos da Sala
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RECURSOS_DISPONIVEIS.map((rec) => {
                    const isChecked = recursos.includes(rec);
                    return (
                      <button
                        type="button"
                        key={rec}
                        onClick={() => handleToggleRecurso(rec)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {rec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Turmas / Disciplinas Alocadas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Turmas / Disciplinas Alocadas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Direito Matutino 1º Período, Engenharia Cálculo 2..."
                  value={disciplinaTurma}
                  onChange={(e) => setDisciplinaTurma(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações de Infraestrutura (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Ar condicionado precisa de manutenção no filtro, quadro em bom estado..."
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Salvando...' : editingSala ? 'Salvar Alterações' : 'Cadastrar Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingSala && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-800">Excluir Sala?</h3>
              <p className="text-xs text-slate-500">
                Tem certeza que deseja excluir o cadastro da{' '}
                <strong className="text-slate-700">Sala {deletingSala.numero}</strong> ({deletingSala.andar})?
                Esta ação não poderá ser desfeita.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeletingSala(null)}
                disabled={confirmDeleteLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSala}
                disabled={confirmDeleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {confirmDeleteLoading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
