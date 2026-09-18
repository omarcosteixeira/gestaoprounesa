import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  FileDown, 
  Calendar, 
  Search, 
  Clock, 
  DoorOpen, 
  GraduationCap, 
  User, 
  Filter, 
  CheckCircle2,
  Building2
} from 'lucide-react';
import { MapaoAcademicoEntry, SalaAula } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RelatorioDoDiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapao: MapaoAcademicoEntry[];
  salas?: SalaAula[];
}

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export const RelatorioDoDiaModal: React.FC<RelatorioDoDiaModalProps> = ({
  isOpen,
  onClose,
  mapao,
  salas = []
}) => {
  // Detect current day of week in Portuguese
  const getInitialDay = () => {
    const dayIndex = new Date().getDay();
    const dayMap: Record<number, string> = {
      1: 'Segunda-feira',
      2: 'Terça-feira',
      3: 'Quarta-feira',
      4: 'Quinta-feira',
      5: 'Sexta-feira',
      6: 'Sábado',
      0: 'Segunda-feira' // Default Sunday to Monday for academic planning
    };
    return dayMap[dayIndex] || 'Segunda-feira';
  };

  const [selectedDia, setSelectedDia] = useState<string>(getInitialDay);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTurno, setFilterTurno] = useState<string>('todos');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Extract presencial classes for selected day
  const presencialAulas = useMemo(() => {
    const list: Array<{
      id: string;
      curso: string;
      tipoCurso: string;
      periodo: string;
      semestre?: string;
      disciplina: string;
      codDisc: string;
      dia: string;
      horario: string;
      turma: string;
      professor: string;
      sala: string;
      salaId?: string;
      turno: 'Manhã' | 'Tarde' | 'Noite' | 'Outro';
    }> = [];

    const normSelected = selectedDia.toLowerCase().replace('-feira', '').trim();

    mapao.forEach((entry) => {
      (entry.disciplinas || []).forEach((disc, idx) => {
        const isPresencial = (disc.tipoDisciplina || 'PRESENCIAL').toUpperCase() === 'PRESENCIAL';
        const discDia = (disc.dia || '').toLowerCase();
        const matchesDay = discDia.includes(normSelected);

        if (isPresencial && matchesDay) {
          // Detect turno based on horario
          const hStr = (disc.horario || '').toLowerCase();
          let turno: 'Manhã' | 'Tarde' | 'Noite' | 'Outro' = 'Noite';
          if (hStr.includes('07:') || hStr.includes('08:') || hStr.includes('09:') || hStr.includes('10:') || hStr.includes('11:') || hStr.includes('matutino') || hStr.includes('manha') || hStr.includes('manhã')) {
            turno = 'Manhã';
          } else if (hStr.includes('13:') || hStr.includes('14:') || hStr.includes('15:') || hStr.includes('16:') || hStr.includes('17:') || hStr.includes('vespertino') || hStr.includes('tarde')) {
            turno = 'Tarde';
          } else if (hStr.includes('18:') || hStr.includes('19:') || hStr.includes('20:') || hStr.includes('21:') || hStr.includes('22:') || hStr.includes('noturno') || hStr.includes('noite')) {
            turno = 'Noite';
          }

          list.push({
            id: `${entry.id}-${idx}`,
            curso: entry.curso || 'Não especificado',
            tipoCurso: entry.tipoCurso || 'GRADUACAO',
            periodo: entry.periodo || '',
            semestre: entry.semestre,
            disciplina: disc.disciplina || 'Sem nome',
            codDisc: disc.codDisc || '',
            dia: disc.dia || selectedDia,
            horario: disc.horario || 'A definir',
            turma: disc.turma || '-',
            professor: disc.professor?.trim() ? disc.professor.trim() : 'Professor a definir',
            sala: disc.sala?.trim() ? disc.sala.trim() : 'Sala a definir',
            salaId: disc.salaId,
            turno
          });
        }
      });
    });

    // Sort by Sala and Horario
    list.sort((a, b) => {
      // First compare room if known
      if (a.sala !== 'Sala a definir' && b.sala === 'Sala a definir') return -1;
      if (a.sala === 'Sala a definir' && b.sala !== 'Sala a definir') return 1;
      const salaComp = a.sala.localeCompare(b.sala);
      if (salaComp !== 0) return salaComp;
      return a.horario.localeCompare(b.horario);
    });

    return list;
  }, [mapao, selectedDia]);

  // Filtered by search and shift
  const filteredAulas = useMemo(() => {
    return presencialAulas.filter((item) => {
      const matchSearch = 
        !searchTerm ||
        item.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.professor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sala.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.turma.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codDisc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTurno = filterTurno === 'todos' || item.turno.toLowerCase() === filterTurno.toLowerCase();

      return matchSearch && matchTurno;
    });
  }, [presencialAulas, searchTerm, filterTurno]);

  // Statistics
  const totalSalasAlocadas = useMemo(() => {
    const set = new Set(presencialAulas.filter(a => a.sala && a.sala !== 'Sala a definir').map(a => a.sala));
    return set.size;
  }, [presencialAulas]);

  const totalProfessores = useMemo(() => {
    const set = new Set(presencialAulas.filter(a => a.professor && a.professor !== 'Professor a definir').map(a => a.professor));
    return set.size;
  }, [presencialAulas]);

  // Generate PDF
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const todayStr = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Header Background
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, 297, 24, 'F');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('RELATÓRIO DIÁRIO DE AULAS PRESENCIAIS E SALAS', 14, 12);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225); // Slate 300
      doc.text(`Dia da Semana: ${selectedDia.toUpperCase()}   |   Data de Emissão: ${todayStr}   |   Total de Aulas: ${filteredAulas.length}   |   Salas Ocupadas: ${totalSalasAlocadas}`, 14, 19);

      // Prepare Table Data
      const tableData = filteredAulas.map((item) => [
        item.sala.toUpperCase(),
        item.horario,
        item.codDisc ? `${item.codDisc} - ${item.disciplina}` : item.disciplina,
        item.professor,
        `${item.curso} (${item.turma})`
      ]);

      // Generate AutoTable
      autoTable(doc, {
        head: [['SALA DE AULA', 'HORÁRIO', 'NOME DA AULA (DISCIPLINA)', 'NOME DO PROFESSOR', 'CURSO / TURMA']],
        body: tableData,
        startY: 28,
        margin: { left: 14, right: 14 },
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 3,
          valign: 'middle',
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [37, 99, 235], // Blue 600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold', textColor: [37, 99, 235] },
          1: { cellWidth: 32 },
          2: { cellWidth: 85, fontStyle: 'bold' },
          3: { cellWidth: 60 },
          4: { cellWidth: 52 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate 50
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount} - Sistema de Gestão Acadêmica`,
            14,
            205
          );
        }
      });

      const safeDia = selectedDia.toLowerCase().replace(/[^a-z0-9]/g, '_');
      doc.save(`Relatorio_Aulas_Salas_${safeDia}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-6xl rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-2xl">
                <DoorOpen className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  Relatório do Dia — Aulas Presenciais e Salas
                </h3>
                <p className="text-xs text-slate-300">
                  Localização rápida de aulas, professores e salas de aula (apenas presenciais)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10"
                title="Imprimir relatório"
              >
                <Printer size={15} />
                <span>Imprimir</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || filteredAulas.length === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md disabled:opacity-50"
              >
                <FileDown size={15} />
                <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors ml-1"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Controls Bar: Day Selector & Search */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
            {/* Days pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Calendar size={14} /> Dia:
              </span>
              {DIAS_SEMANA.map((dia) => {
                const isSelected = selectedDia === dia;
                return (
                  <button
                    key={dia}
                    onClick={() => setSelectedDia(dia)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            {/* Search & Shift Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar aula, professor, sala ou curso..."
                  className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Turno:</span>
                  <select
                    value={filterTurno}
                    onChange={(e) => setFilterTurno(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todos">Todos os Turnos</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>

                {/* Quick stats badge */}
                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-blue-600">{filteredAulas.length}</span> aulas presenciais
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-600">{totalSalasAlocadas}</span> salas ativas
                </div>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {filteredAulas.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar size={36} className="mb-2 opacity-40 text-blue-500" />
                <p className="font-bold text-sm text-slate-600">Nenhuma aula presencial encontrada para {selectedDia}.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Verifique os filtros ou cadastre disciplinas com a modalidade presencial no Mapão Acadêmico.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4 font-bold w-44">
                          <div className="flex items-center space-x-1.5">
                            <DoorOpen size={14} className="text-blue-400" />
                            <span>Sala de Aula</span>
                          </div>
                        </th>
                        <th className="py-3 px-4 font-bold w-36">
                          <div className="flex items-center space-x-1.5">
                            <Clock size={14} className="text-amber-400" />
                            <span>Horário</span>
                          </div>
                        </th>
                        <th className="py-3 px-4 font-bold">
                          <div className="flex items-center space-x-1.5">
                            <GraduationCap size={14} className="text-emerald-400" />
                            <span>Nome da Aula (Disciplina)</span>
                          </div>
                        </th>
                        <th className="py-3 px-4 font-bold w-52">
                          <div className="flex items-center space-x-1.5">
                            <User size={14} className="text-purple-400" />
                            <span>Nome do Professor</span>
                          </div>
                        </th>
                        <th className="py-3 px-4 font-bold w-52">Curso / Turma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAulas.map((aula, index) => {
                        const isSalaDefinida = aula.sala && aula.sala !== 'Sala a definir';
                        return (
                          <tr
                            key={aula.id || index}
                            className={`hover:bg-blue-50/50 transition-colors ${
                              index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                            }`}
                          >
                            {/* Sala de aula */}
                            <td className="py-3.5 px-4 font-bold">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                    isSalaDefinida
                                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                                  }`}
                                >
                                  <DoorOpen size={13} className="shrink-0" />
                                  <span>{aula.sala}</span>
                                </span>
                              </div>
                            </td>

                            {/* Horário */}
                            <td className="py-3.5 px-4 font-bold text-slate-700">
                              <div className="flex items-center space-x-1.5">
                                <Clock size={13} className="text-slate-400" />
                                <span>{aula.horario}</span>
                              </div>
                            </td>

                            {/* Nome da Aula (Disciplina) */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-sm">
                                {aula.disciplina}
                              </div>
                              {aula.codDisc && (
                                <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                                  Cód: {aula.codDisc}
                                </div>
                              )}
                            </td>

                            {/* Professor */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                                <User size={13} className="text-slate-400 shrink-0" />
                                <span className={aula.professor === 'Professor a definir' ? 'text-slate-400 italic' : ''}>
                                  {aula.professor}
                                </span>
                              </div>
                            </td>

                            {/* Curso / Turma */}
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              <div className="font-bold text-slate-700">{aula.curso}</div>
                              <div className="text-[10px] text-slate-400">
                                Turma: <span className="font-semibold text-slate-600">{aula.turma}</span>
                                {aula.semestre && ` • Semestre: ${aula.semestre}`}
                              </div>
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

          {/* Footer Bar */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500 shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>
                Filtrado automaticamente para <strong>apenas disciplinas presenciais</strong> do dia{' '}
                <strong>{selectedDia}</strong>.
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-all"
              >
                Fechar
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || filteredAulas.length === 0}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                <FileDown size={16} />
                <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar Relatório em PDF'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
