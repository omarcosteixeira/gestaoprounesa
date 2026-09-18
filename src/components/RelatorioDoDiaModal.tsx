import React, { useState, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { MapaoAcademicoEntry } from '../types';
import { 
  FileText, 
  Calendar, 
  Clock, 
  DoorClosed, 
  User, 
  Download, 
  Printer, 
  X, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  Building2,
  BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mapao: MapaoAcademicoEntry[];
  onToast: (m: string, t?: 'success' | 'error') => void;
}

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export function RelatorioDoDiaModal({ isOpen, onClose, mapao, onToast }: Props) {
  // Obter o dia da semana atual em português
  const getDiaAtual = () => {
    const diaNum = new Date().getDay(); // 0 = Domingo, 1 = Segunda...
    switch (diaNum) {
      case 1:
        return 'Segunda-feira';
      case 2:
        return 'Terça-feira';
      case 3:
        return 'Quarta-feira';
      case 4:
        return 'Quinta-feira';
      case 5:
        return 'Sexta-feira';
      case 6:
        return 'Sábado';
      default:
        return 'Segunda-feira'; // Domingo cai para Segunda
    }
  };

  const [diaSelecionado, setDiaSelecionado] = useState<string>(getDiaAtual());
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Extrai todas as disciplinas PRESENCIAIS do dia selecionado
  const aulasPresenciaisDoDia = useMemo(() => {
    const lista: {
      id: string;
      disciplina: string;
      codDisc: string;
      professor: string;
      sala: string;
      horario: string;
      turma: string;
      curso: string;
      periodo: string;
    }[] = [];

    mapao.forEach((entry) => {
      (entry.disciplinas || []).forEach((disc, idx) => {
        // Apenas disciplinas que são presenciais
        if (disc.tipoDisciplina === 'PRESENCIAL') {
          const discDia = (disc.dia || '').trim().toLowerCase();
          const targetDia = diaSelecionado.trim().toLowerCase();
          
          // Match flexível: "Segunda-feira" ou "Segunda"
          const matchDia = 
            discDia === targetDia || 
            discDia.startsWith(targetDia.split('-')[0]) ||
            targetDia.startsWith(discDia.split('-')[0]);

          if (matchDia) {
            lista.push({
              id: `${entry.id}-${idx}`,
              disciplina: disc.disciplina || 'Disciplina sem nome',
              codDisc: disc.codDisc || '',
              professor: disc.professor?.trim() || 'Professor a definir',
              sala: disc.sala?.trim() || 'Sala não definida',
              horario: disc.horario?.trim() || 'Horário a definir',
              turma: disc.turma || '',
              curso: entry.curso || '',
              periodo: entry.periodo || ''
            });
          }
        }
      });
    });

    // Ordenação padrão: Horário -> Sala -> Disciplina
    lista.sort((a, b) => {
      const hA = a.horario || '';
      const hB = b.horario || '';
      if (hA !== hB) return hA.localeCompare(hB);
      return (a.sala || '').localeCompare(b.sala || '');
    });

    return lista;
  }, [mapao, diaSelecionado]);

  // Filtro de busca na listagem da modal
  const aulasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return aulasPresenciaisDoDia;
    const term = searchTerm.toLowerCase();
    return aulasPresenciaisDoDia.filter(
      (a) =>
        a.disciplina.toLowerCase().includes(term) ||
        a.professor.toLowerCase().includes(term) ||
        a.sala.toLowerCase().includes(term) ||
        a.curso.toLowerCase().includes(term) ||
        a.turma.toLowerCase().includes(term) ||
        a.horario.toLowerCase().includes(term)
    );
  }, [aulasPresenciaisDoDia, searchTerm]);

  // Geração de PDF via jsPDF vetorizado de alta nitidez
  const handleDownloadPDF = () => {
    if (aulasPresenciaisDoDia.length === 0) {
      onToast('Nenhuma aula presencial encontrada para o dia selecionado.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let currentY = margin;

      const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // ---- CABEÇALHO DO RELATÓRIO ----
      // Barra superior decorativa
      doc.setFillColor(37, 99, 235); // Blue 600
      doc.rect(margin, currentY, pageWidth - margin * 2, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('RELATÓRIO DIÁRIO DE AULAS PRESENCIAIS E ALOCAÇÃO DE SALAS', margin + 6, currentY + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Dia de Referência: ${diaSelecionado.toUpperCase()} | Data de Emissão: ${dataAtualFormatada} | Total de Aulas: ${aulasPresenciaisDoDia.length}`,
        margin + 6,
        currentY + 16
      );

      currentY += 27;

      // ---- CABEÇALHO DA TABELA ----
      const colHorarioW = 32;
      const colSalaW = 42;
      const colAulaW = 75;
      const colProfW = 60;
      const colCursoW = pageWidth - margin * 2 - (colHorarioW + colSalaW + colAulaW + colProfW);

      doc.setFillColor(241, 245, 249); // Slate 100
      doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);

      doc.setTextColor(51, 65, 85); // Slate 700
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);

      let colX = margin;
      doc.text('HORÁRIO', colX + 2, currentY + 5.5);
      colX += colHorarioW;
      doc.text('SALA DE AULA', colX + 2, currentY + 5.5);
      colX += colSalaW;
      doc.text('NOME DA AULA / DISCIPLINA', colX + 2, currentY + 5.5);
      colX += colAulaW;
      doc.text('PROFESSOR(A)', colX + 2, currentY + 5.5);
      colX += colProfW;
      doc.text('CURSO / TURMA', colX + 2, currentY + 5.5);

      currentY += 8;

      // ---- LINHAS DA TABELA ----
      const rowHeight = 9.5;
      let isEven = false;

      aulasPresenciaisDoDia.forEach((item, index) => {
        // Nova página se ultrapassar limite da página
        if (currentY + rowHeight > pageHeight - 15) {
          doc.addPage();
          currentY = margin;

          // Repete cabeçalho da tabela na nova página
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);

          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);

          let cX = margin;
          doc.text('HORÁRIO', cX + 2, currentY + 5.5);
          cX += colHorarioW;
          doc.text('SALA DE AULA', cX + 2, currentY + 5.5);
          cX += colSalaW;
          doc.text('NOME DA AULA / DISCIPLINA', cX + 2, currentY + 5.5);
          cX += colAulaW;
          doc.text('PROFESSOR(A)', cX + 2, currentY + 5.5);
          cX += colProfW;
          doc.text('CURSO / TURMA', cX + 2, currentY + 5.5);

          currentY += 8;
        }

        // Fundo zebra
        if (isEven) {
          doc.setFillColor(248, 250, 252); // Slate 50
          doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
        }
        isEven = !isEven;

        // Borda inferior
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

        // Dados
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);

        let cellX = margin;

        // 1. Horário
        doc.text(item.horario, cellX + 2, currentY + 6);
        cellX += colHorarioW;

        // 2. Sala (em destaque)
        doc.setTextColor(29, 78, 216); // Blue 700
        doc.text(item.sala, cellX + 2, currentY + 6);
        cellX += colSalaW;

        // 3. Disciplina
        doc.setTextColor(15, 23, 42); // Slate 900
        const discText = doc.splitTextToSize(item.disciplina, colAulaW - 4);
        doc.text(discText[0] || item.disciplina, cellX + 2, currentY + 6);
        cellX += colAulaW;

        // 4. Professor
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        const profText = doc.splitTextToSize(item.professor, colProfW - 4);
        doc.text(profText[0] || item.professor, cellX + 2, currentY + 6);
        cellX += colProfW;

        // 5. Curso / Turma
        doc.setTextColor(71, 85, 105);
        const cursoText = `${item.curso}${item.turma ? ` (${item.turma})` : ''}`;
        const cursoFit = doc.splitTextToSize(cursoText, colCursoW - 4);
        doc.text(cursoFit[0] || cursoText, cellX + 2, currentY + 6);

        currentY += rowHeight;
      });

      // ---- RODAPÉ ----
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text(
          `Sistema de Gestão Acadêmica - Impresso em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${totalPages}`,
          margin,
          pageHeight - 6
        );
      }

      // Salva o PDF
      const safeDia = diaSelecionado.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Relatorio_Aulas_Presenciais_${safeDia}_${new Date().toISOString().split('T')[0]}.pdf`);
      onToast('Relatório do Dia em PDF gerado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      onToast('Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header da Modal */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
              <FileText size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">Relatório do Dia</h3>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Presencial
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Localize em tempo real a sala de aula de cada professor e turma do dia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Controles e Seleção de Dia */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Selecione o Dia da Semana
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map((dia) => {
                  const isSelected = diaSelecionado === dia;
                  return (
                    <button
                      key={dia}
                      onClick={() => setDiaSelecionado(dia)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ações principais */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating || aulasPresenciaisDoDia.length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download size={16} />
                <span>{isGenerating ? 'Gerando PDF...' : 'Baixar Relatório em PDF'}</span>
              </button>
            </div>
          </div>

          {/* Barra de Busca rápida e resumo */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por aula, professor ou sala..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                {aulasPresenciaisDoDia.length}{' '}
                {aulasPresenciaisDoDia.length === 1 ? 'aula presencial' : 'aulas presenciais'} em{' '}
                <strong className="text-slate-800">{diaSelecionado}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Visualização das Aulas */}
        <div className="p-5 overflow-y-auto flex-1" ref={printRef}>
          {aulasFiltradas.length === 0 ? (
            <div className="text-center py-12 px-4">
              <DoorClosed size={48} className="mx-auto text-slate-300 mb-3" />
              <h4 className="text-base font-bold text-slate-800">
                Nenhuma aula presencial encontrada
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {aulasPresenciaisDoDia.length === 0
                  ? `Não há disciplinas cadastradas como presenciais para ${diaSelecionado}. Verifique o cadastro no Mapão Acadêmico.`
                  : 'Nenhuma aula corresponde aos termos pesquisados.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Horário</th>
                      <th className="py-3 px-4">Sala de Aula</th>
                      <th className="py-3 px-4">Nome da Aula / Disciplina</th>
                      <th className="py-3 px-4">Professor(a)</th>
                      <th className="py-3 px-4">Curso / Turma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {aulasFiltradas.map((aula) => (
                      <tr key={aula.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-blue-700">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            <Clock size={13} className="text-blue-600" />
                            {aula.horario}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <DoorClosed size={14} className="text-emerald-600" />
                            {aula.sala}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>
                            <span>{aula.disciplina}</span>
                            {aula.codDisc && (
                              <span className="text-[10px] font-semibold text-slate-400 block">
                                Cód: {aula.codDisc}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            {aula.professor}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-semibold text-slate-800">{aula.curso}</span>
                          {aula.turma && (
                            <span className="text-[11px] text-slate-500 block">
                              Turma: {aula.turma} {aula.periodo ? `(${aula.periodo})` : ''}
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

        {/* Footer da Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Sparkles size={14} className="text-blue-600" />
            <span>O relatório em PDF inclui horário, sala, nome da aula e professor de forma organizada.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating || aulasPresenciaisDoDia.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download size={15} />
              <span>{isGenerating ? 'Gerando...' : 'Gerar PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
