import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DoorOpen, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Users, 
  GraduationCap, 
  User, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  History, 
  Monitor, 
  Wind, 
  FileText, 
  X, 
  Check,
  Building,
  Eye,
  CalendarCheck
} from 'lucide-react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { SalaAula, HistoricoSalaAula, MapaoAcademicoEntry } from '../types';
import { cn } from '../lib/utils';
import { RelatorioDoDiaModal } from './RelatorioDoDiaModal';

interface ControleSalasViewProps {
  salas: SalaAula[];
  historico: HistoricoSalaAula[];
  mapao: MapaoAcademicoEntry[];
  canEdit: boolean;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const RECURSOS_DISPONIVEIS = [
  'Projetor / Datashow',
  'Ar Condicionado',
  'Computadores / PCs',
  'Quadro Branco',
  'Smart TV',
  'Acessibilidade',
  'Sistema de Som',
  'Bancadas / Laboratório'
];

export const ControleSalasView: React.FC<ControleSalasViewProps> = ({
  salas,
  historico,
  mapao,
  canEdit,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<'salas' | 'historico' | 'grade'>('salas');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBloco, setFilterBloco] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterDia, setFilterDia] = useState('todos');
  const [filterSalaHistorico, setFilterSalaHistorico] = useState('todas');

  // Modal States
  const [showModalSala, setShowModalSala] = useState(false);
  const [editingSala, setEditingSala] = useState<SalaAula | null>(null);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<SalaAula>>({
    nome: '',
    bloco: '',
    andar: '',
    capacidade: 40,
    tipo: 'Sala Padrão',
    recursos: ['Ar Condicionado', 'Quadro Branco'],
    status: 'Ativa',
    observacao: ''
  });

  // Unique Blocks for filter
  const blocosUnicos = useMemo(() => {
    const list = salas.map((s) => s.bloco?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [salas]);

  // Combine allocations from both collections & directly from Mapão entries for guaranteed synchronization
  const alocacoesConsolidadas = useMemo(() => {
    const list: Array<{
      id: string;
      salaNome: string;
      salaId?: string;
      dia: string;
      horario: string;
      disciplina: string;
      codDisc?: string;
      professor?: string;
      curso?: string;
      turma?: string;
      tipoCurso?: string;
      mapaoId?: string;
      dataAlocacao?: any;
    }> = [];

    // 1. Gather all presencial disciplines from Mapao entries that have a sala assigned
    mapao.forEach((entry) => {
      (entry.disciplinas || []).forEach((disc, idx) => {
        const isPresencial = (disc.tipoDisciplina || 'PRESENCIAL').toUpperCase() === 'PRESENCIAL';
        if (isPresencial && disc.sala?.trim()) {
          list.push({
            id: `mapao-${entry.id}-${idx}`,
            salaNome: disc.sala.trim(),
            salaId: disc.salaId,
            dia: disc.dia || 'Não especificado',
            horario: disc.horario || 'Não especificado',
            disciplina: disc.disciplina || 'Sem nome',
            codDisc: disc.codDisc,
            professor: disc.professor?.trim() || 'A definir',
            curso: entry.curso || '',
            turma: disc.turma || '',
            tipoCurso: entry.tipoCurso,
            mapaoId: entry.id,
            dataAlocacao: entry.createdAt
          });
        }
      });
    });

    // 2. Also incorporate any custom/direct historico records if they are not already listed
    historico.forEach((h) => {
      const exists = list.some(
        (item) =>
          item.salaNome.toLowerCase() === h.salaNome?.toLowerCase() &&
          item.dia === h.dia &&
          item.horario === h.horario &&
          item.disciplina === h.disciplina
      );
      if (!exists && h.salaNome) {
        list.push({
          id: h.id,
          salaNome: h.salaNome,
          salaId: h.salaId,
          dia: h.dia,
          horario: h.horario,
          disciplina: h.disciplina,
          codDisc: h.codDisc,
          professor: h.professor || 'A definir',
          curso: h.curso || '',
          turma: h.turma || '',
          tipoCurso: h.tipoCurso,
          mapaoId: h.mapaoId,
          dataAlocacao: h.dataAlocacao
        });
      }
    });

    return list;
  }, [mapao, historico]);

  // Conflict detection: multiple classes assigned to the same room, on the same day and overlapping schedule
  const conflitosPorSala = useMemo(() => {
    const mapa = new Map<string, number>();
    alocacoesConsolidadas.forEach((item) => {
      const key = `${item.salaNome.toLowerCase()}__${item.dia.toLowerCase()}__${item.horario.trim()}`;
      mapa.set(key, (mapa.get(key) || 0) + 1);
    });
    return mapa;
  }, [alocacoesConsolidadas]);

  // Filtered Salas
  const filteredSalas = useMemo(() => {
    return salas.filter((s) => {
      const matchSearch =
        !searchTerm ||
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.bloco && s.bloco.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.tipo && s.tipo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchBloco = filterBloco === 'todos' || s.bloco === filterBloco;
      const matchStatus = filterStatus === 'todos' || s.status === filterStatus;

      return matchSearch && matchBloco && matchStatus;
    });
  }, [salas, searchTerm, filterBloco, filterStatus]);

  // Filtered Historico
  const filteredHistorico = useMemo(() => {
    return alocacoesConsolidadas.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.salaNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.professor && item.professor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.curso && item.curso.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDia = filterDia === 'todos' || item.dia === filterDia;
      const matchSala = filterSalaHistorico === 'todas' || item.salaNome.toLowerCase() === filterSalaHistorico.toLowerCase();

      return matchSearch && matchDia && matchSala;
    });
  }, [alocacoesConsolidadas, searchTerm, filterDia, filterSalaHistorico]);

  // Save Room
  const handleSaveSala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) {
      onToast('Informe o nome ou número da sala.', 'error');
      return;
    }

    try {
      if (editingSala) {
        await updateDoc(doc(db, COLLECTIONS.SALAS, editingSala.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        onToast('Sala atualizada com sucesso!');
      } else {
        await addDoc(collection(db, COLLECTIONS.SALAS), {
          ...formData,
          createdAt: serverTimestamp()
        });
        onToast('Nova sala cadastrada com sucesso!');
      }

      setShowModalSala(false);
      setEditingSala(null);
      setFormData({
        nome: '',
        bloco: '',
        andar: '',
        capacidade: 40,
        tipo: 'Sala Padrão',
        recursos: ['Ar Condicionado', 'Quadro Branco'],
        status: 'Ativa',
        observacao: ''
      });
    } catch (err: any) {
      console.error(err);
      onToast('Erro ao salvar sala.', 'error');
    }
  };

  // Delete Room
  const handleDeleteSala = async (salaId: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a sala "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.SALAS, salaId));
      onToast('Sala excluída!');
    } catch (err) {
      onToast('Erro ao excluir sala.', 'error');
    }
  };

  const handleEditClick = (sala: SalaAula) => {
    setEditingSala(sala);
    setFormData({
      nome: sala.nome,
      bloco: sala.bloco || '',
      andar: sala.andar || '',
      capacidade: sala.capacidade || 40,
      tipo: sala.tipo || 'Sala Padrão',
      recursos: sala.recursos || [],
      status: sala.status || 'Ativa',
      observacao: sala.observacao || ''
    });
    setShowModalSala(true);
  };

  const toggleRecurso = (recurso: string) => {
    setFormData((prev) => {
      const current = prev.recursos || [];
      if (current.includes(recurso)) {
        return { ...prev, recursos: current.filter((r) => r !== recurso) };
      } else {
        return { ...prev, recursos: [...current, recurso] };
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <DoorOpen size={16} />
            <span>Gestão Acadêmica de Espaços</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            Controle de Salas de Aula
          </h2>
          <p className="text-sm text-slate-500">
            Cadastro de salas, histórico de alocações automáticas do Mapão e mapa de ocupação diária
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Relatório do Dia (PDF) */}
          <button
            onClick={() => setShowRelatorioModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-2"
          >
            <CalendarCheck size={18} />
            <span>Relatório do Dia (PDF)</span>
          </button>

          {canEdit && (
            <button
              onClick={() => {
                setEditingSala(null);
                setFormData({
                  nome: '',
                  bloco: '',
                  andar: '',
                  capacidade: 40,
                  tipo: 'Sala Padrão',
                  recursos: ['Ar Condicionado', 'Quadro Branco'],
                  status: 'Ativa',
                  observacao: ''
                });
                setShowModalSala(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Cadastrar Sala</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs: Salas, Histórico, Grade Semanal */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('salas')}
          className={cn(
            'flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all',
            activeTab === 'salas'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <DoorOpen size={16} />
          <span>Salas Cadastradas ({salas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={cn(
            'flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all',
            activeTab === 'historico'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <History size={16} />
          <span>Histórico de Controle ({alocacoesConsolidadas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grade')}
          className={cn(
            'flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all',
            activeTab === 'grade'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <Calendar size={16} />
          <span>Grade Semanal de Ocupação</span>
        </button>
      </div>

      {/* TAB 1: SALAS CADASTRADAS */}
      {activeTab === 'salas' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome da sala, bloco ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {blocosUnicos.length > 0 && (
              <div className="w-full md:w-48 shrink-0">
                <select
                  value={filterBloco}
                  onChange={(e) => setFilterBloco(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Blocos</option>
                  {blocosUnicos.map((bl) => (
                    <option key={bl} value={bl}>
                      {bl}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full md:w-44 shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="Ativa">Ativa</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Inativa">Inativa</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredSalas.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
              <DoorOpen size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Nenhuma sala encontrada</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                Cadastre as salas de aula e laboratórios disponíveis na sua instituição para vinculá-las às disciplinas presenciais no Mapão Acadêmico.
              </p>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingSala(null);
                    setShowModalSala(true);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Cadastrar Primeira Sala
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSalas.map((sala) => {
                // Find all classes allocated to this room
                const alocacoesDestaSala = alocacoesConsolidadas.filter(
                  (a) => a.salaNome.toLowerCase() === sala.nome.toLowerCase()
                );

                return (
                  <motion.div
                    key={sala.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Top badges & actions */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              sala.status === 'Ativa'
                                ? 'bg-emerald-100 text-emerald-700'
                                : sala.status === 'Manutenção'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            )}
                          >
                            {sala.status}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                            {sala.tipo || 'Sala Padrão'}
                          </span>
                        </div>

                        {canEdit && (
                          <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditClick(sala)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                              title="Editar sala"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteSala(sala.id, sala.nome)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                              title="Excluir sala"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sala Name & Location */}
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          <DoorOpen size={20} className="text-blue-600 shrink-0" />
                          <span>{sala.nome}</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                          {sala.bloco && (
                            <span className="flex items-center gap-1">
                              <Building size={12} /> {sala.bloco}
                            </span>
                          )}
                          {sala.andar && <span>• {sala.andar}</span>}
                          {sala.capacidade && (
                            <span>• {sala.capacidade} lugares</span>
                          )}
                        </p>
                      </div>

                      {/* Recursos / Features */}
                      {sala.recursos && sala.recursos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {sala.recursos.map((rec) => (
                            <span
                              key={rec}
                              className="text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md"
                            >
                              {rec}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Observação */}
                      {sala.observacao && (
                        <p className="text-xs text-slate-500 italic mb-4 bg-slate-50 p-2 rounded-xl">
                          "{sala.observacao}"
                        </p>
                      )}
                    </div>

                    {/* Alocações vinculadas */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Aulas Alocadas ({alocacoesDestaSala.length})
                        </span>
                      </div>

                      {alocacoesDestaSala.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Nenhuma disciplina presencial alocada nesta sala ainda.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                          {alocacoesDestaSala.slice(0, 4).map((aloc, i) => (
                            <div
                              key={i}
                              className="text-xs bg-slate-50 hover:bg-blue-50/50 p-2 rounded-xl border border-slate-100 transition-colors"
                            >
                              <div className="font-bold text-slate-800 truncate">
                                {aloc.disciplina}
                              </div>
                              <div className="text-[10px] text-slate-500 flex justify-between items-center mt-0.5">
                                <span className="font-semibold text-blue-600">
                                  {aloc.dia}
                                </span>
                                <span>{aloc.horario}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                Prof: {aloc.professor}
                              </div>
                            </div>
                          ))}
                          {alocacoesDestaSala.length > 4 && (
                            <p className="text-[10px] text-center text-blue-600 font-bold pt-1">
                              + {alocacoesDestaSala.length - 4} outras aulas
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTÓRICO DE CONTROLE DE SALAS DE AULA */}
      {activeTab === 'historico' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
            <CheckCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong className="font-bold">Histórico e Controle Automático:</strong> Sempre que uma sala for vinculada a uma disciplina presencial no <strong>Mapão Acadêmico</strong>, o registro é sincronizado automaticamente neste histórico, mostrando em tempo real o dia, horário, professor e turma que utilizam a sala.
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por sala, aula, professor ou curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full md:w-48 shrink-0">
              <select
                value={filterDia}
                onChange={(e) => setFilterDia(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Dias</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-52 shrink-0">
              <select
                value={filterSalaHistorico}
                onChange={(e) => setFilterSalaHistorico(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas as Salas</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.nome}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredHistorico.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
              <History size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Nenhum registro de alocação encontrado</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                No cadastro de disciplinas do Mapão Acadêmico, ao selecionar uma disciplina como "Presencial", escolha uma sala cadastrada para que ela passe a constar aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <th className="py-3.5 px-4">Sala de Aula</th>
                      <th className="py-3.5 px-4">Dia da Semana</th>
                      <th className="py-3.5 px-4">Horário</th>
                      <th className="py-3.5 px-4">Disciplina / Aula</th>
                      <th className="py-3.5 px-4">Professor</th>
                      <th className="py-3.5 px-4">Curso / Turma</th>
                      <th className="py-3.5 px-4">Status de Ocupação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredHistorico.map((item, idx) => {
                      const conflictKey = `${item.salaNome.toLowerCase()}__${item.dia.toLowerCase()}__${item.horario.trim()}`;
                      const hasConflict = (conflitosPorSala.get(conflictKey) || 0) > 1;

                      return (
                        <tr key={item.id || idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                              <DoorOpen size={13} />
                              {item.salaNome}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{item.dia}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Clock size={13} className="text-amber-500" />
                              <span>{item.horario}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">{item.disciplina}</div>
                            {item.codDisc && (
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                                Cód: {item.codDisc}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <User size={13} className="text-purple-500" />
                              <span>{item.professor || 'Não informado'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="font-bold text-slate-700">{item.curso}</div>
                            <div className="text-[10px] text-slate-400">Turma: {item.turma}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {hasConflict ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                <AlertTriangle size={12} /> Conflito de Horário
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle size={12} /> Em Uso
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GRADE SEMANAL DE OCUPAÇÃO */}
      {activeTab === 'grade' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              <span>Matriz Semanal de Alocação de Salas</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Visão geral das salas por dia da semana para identificar horários livres ou ocupados rapidamente
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {DIAS_SEMANA.map((dia) => {
                const normDia = dia.toLowerCase().replace('-feira', '');
                const aulasDoDia = alocacoesConsolidadas.filter((a) =>
                  a.dia.toLowerCase().includes(normDia)
                );

                return (
                  <div
                    key={dia}
                    className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col"
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-3">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <Calendar size={15} className="text-blue-600" />
                        <span>{dia}</span>
                      </h4>
                      <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {aulasDoDia.length} aulas
                      </span>
                    </div>

                    {aulasDoDia.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs italic">
                        Nenhuma sala ocupada neste dia.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                        {aulasDoDia.map((aula, i) => (
                          <div
                            key={i}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs space-y-1"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                                <DoorOpen size={12} /> {aula.salaNome}
                              </span>
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                <Clock size={11} /> {aula.horario}
                              </span>
                            </div>
                            <div className="font-bold text-slate-800 leading-tight">
                              {aula.disciplina}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Prof: <span className="font-semibold text-slate-700">{aula.professor}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {aula.curso} ({aula.turma})
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR / EDITAR SALA */}
      {showModalSala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh] custom-scrollbar"
          >
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingSala ? 'Editar Sala de Aula' : 'Nova Sala de Aula'}
                </h3>
                <p className="text-xs text-slate-400">
                  Cadastre as informações da sala para disponibilizá-la no Mapão Acadêmico
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModalSala(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSala} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Nome / Número da Sala *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sala 101, Lab Info 1, Auditório"
                    value={formData.nome || ''}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Bloco / Prédio
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bloco A, Prédio Central"
                    value={formData.bloco || ''}
                    onChange={(e) => setFormData({ ...formData, bloco: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Andar / Localização
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1º Andar, Térreo, Subsolo"
                    value={formData.andar || ''}
                    onChange={(e) => setFormData({ ...formData, andar: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Capacidade (Lugares)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacidade || 40}
                    onChange={(e) => setFormData({ ...formData, capacidade: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Tipo de Espaço
                  </label>
                  <select
                    value={formData.tipo || 'Sala Padrão'}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Sala Padrão">Sala Padrão</option>
                    <option value="Laboratório de Informática">Laboratório de Informática</option>
                    <option value="Laboratório de Saúde / Ciências">Laboratório de Saúde / Ciências</option>
                    <option value="Auditório">Auditório</option>
                    <option value="Sala de Desenho / Arquitetura">Sala de Desenho / Arquitetura</option>
                    <option value="Sala Multiuso">Sala Multiuso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Status da Sala
                  </label>
                  <select
                    value={formData.status || 'Ativa'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Manutenção">Em Manutenção</option>
                    <option value="Inativa">Inativa</option>
                  </select>
                </div>
              </div>

              {/* Recursos Disponíveis */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Recursos Disponíveis na Sala
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RECURSOS_DISPONIVEIS.map((rec) => {
                    const checked = (formData.recursos || []).includes(rec);
                    return (
                      <button
                        type="button"
                        key={rec}
                        onClick={() => toggleRecurso(rec)}
                        className={cn(
                          'p-2 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-all',
                          checked
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <span>{rec}</span>
                        {checked && <Check size={14} className="text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Observações Adicionais
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Sala equipada com 35 computadores, projetor HDMI e ar condicionado split..."
                  value={formData.observacao || ''}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalSala(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
                >
                  {editingSala ? 'Salvar Alterações' : 'Cadastrar Sala'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* RELATÓRIO DO DIA MODAL */}
      <RelatorioDoDiaModal
        isOpen={showRelatorioModal}
        onClose={() => setShowRelatorioModal(false)}
        mapao={mapao}
        salas={salas}
      />
    </div>
  );
};
