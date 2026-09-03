/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin Master' | 'Promotor' | 'FDV' | 'Sala de Matrícula' | 'SM' | 'QG' | 'Líder/FDV' | 'SSA' | 'Gestor Unidade' | 'Gestor Comercial' | 'Acadêmico' | 'Promotor/rua' | 'Gerente Comercial (Comercial)' | 'FDV (Comercial)' | 'Financeiro' | 'Técnico' | 'Regional' | 'Líder SM' | 'Gestor';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  nome?: string;
  cpf?: string;
  dataNascimento?: string;
  phone?: string;
  role: UserRole;
  chavePix?: string;
  telegram?: string;
  blocked?: boolean;
  mustChangePassword?: boolean;
  botNumber?: string;
  unidade?: string;
  servidor?: 'principal' | 'comercial' | 'unesa';
  linkadoA?: string; // used for Promotor/rua to link to FDV
  createdAt: any;
  updatedAt?: any;
  dashboardWidgets?: {
    stats: boolean;
    links: boolean;
    planner: boolean;
    campanhas: boolean;
    bomDia: boolean;
    forecast: boolean;
    periodo: boolean;
    qgLigacoes?: boolean;
    aniversarios?: boolean;
    metaSM?: boolean;
    metaCursos?: boolean;
    metaUnidadeRegional?: boolean;
  };
}

export interface CalendarioAcao {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  observacao: string;
  concluida: boolean;
  status?: string;
  fotos?: string[];
  creatorId?: string;
  creatorRole?: string;
  createdAt: any;
  metaBoletos?: number;
  metaInscritos?: number;
  boletosFeitos?: number;
  leadsFeitos?: number;
  precisaPromotor?: boolean;
  promotoresSelecionados?: string[];
  presencaPromotores?: { [promoterUid: string]: boolean };
  dadosPresencaPromotores?: { [promoterUid: string]: { empresa?: 'GR15' | 'RP7'; horas?: number } };
  valorPromotor?: number;
  valorOrcado?: number;
  statusPagamentoPromotores?: { [promoterUid: string]: 'Pendente' | 'Recusada' | 'Realizada' };
  colaboradorId?: string;
  colaboradorNome?: string;
  colaboradoresIds?: string[];
  colaboradoresNomes?: string[];
  tipoAtividade?: 'Ação' | 'Visita';
  empresaParceiraId?: string;
  empresaParceiraNome?: string;
  unidade?: string;
  horario?: string;
}

export interface Campanha {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  objetivo: string;
  status?: string;
  produto?: string;
  publicoAlvo?: string;
  descontos?: string;
  conflitos?: string;
  nomeBolsas?: string;
  dis?: string;
  quemLancaraBolsa?: string;
  boletimImagemUrl?: string;
  boletimImagemNome?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface SalesContact {
  id: string;
  contactId: string;
  nome: string;
  telefone: string;
  curso: string;
  origem: string;
  createdAt: any;
}

export interface SendContact {
  id: string;
  contactId: string;
  nome: string;
  telefone: string;
  curso: string;
  origem: string;
  createdAt: any;
  userEmail?: string;
  userName?: string;
}

export type WhatsContact = SendContact;
export type MalaDiretaContact = SendContact;

export interface Lead {
  id: string;
  acao: string;
  acaoId?: string;
  nome: string;
  telefone: string;
  cpf?: string;
  cursoInteresse?: string;
  empresa?: string;
  status: 'Pendente' | 'Sem retorno' | 'Interessado' | 'Não Interessado' | 'Convertido' | 'Contato via Sales';
  converted?: boolean;
  createdAt: any;
  promotorId: string;
  promotorName: string;
  promotorRole?: string;
  linkadoA?: string;
  unidade?: string;
  email?: string;
}

export interface BaseEntry {
  id: string;
  nomeBase: string;
  nome: string;
  telefone: string;
  cpf?: string;
  curso: string;
  produto: 'Graduação' | 'Técnico' | 'Pós-graduação';
  numeroOportunidade: string;
  semestre: string;
  periodo?: string;
  numeroMatricula?: string;
  metodologia: string;
  formaIngresso: string;
  status: 'Pendente' | 'Interessado' | 'Convertido' | 'Não tem interesse' | 'Sem retorno' | 'Contato via Sales';
  unidade?: string;
  email?: string;
  createdAt: any;
}

export interface GapEntry {
  id: string;
  nome?: string;
  telefone?: string;
  cpf?: string;
  produto?: string;
  numeroOportunidade?: string;
  curso?: string;
  semestre?: string;
  metodologia?: string;
  formaIngresso?: string;
  periodo?: string;
  numeroMatricula?: string;
  matAcad?: any;
  documentos?: any;
  unidade?: string;
  contrato?: any;
  carta?: any;
  acaoId?: string;
  acao?: any;
  status?: string;
  createdAt?: any;
}

export interface GapDocs { [key: string]: boolean; }

export interface SWOTItem {
  id: string;
  tipo: 'forte' | 'fraco' | 'oportunidade' | 'ameaca';
  texto: string;
  createdAt?: string;
}

export interface HistoricoPreco {
  id?: string;
  data: string;
  valor: number;
  observacao?: string;
}

export interface CursoConcorrente {
  id: string;
  nomeCurso: string;
  modalidade: 'Presencial' | 'Semipresencial' | 'EAD';
  turno: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral' | 'EAD / Livre';
  duracao: string;
  mensalidade: number;
  historicoPrecos?: HistoricoPreco[];
  createdAt?: string;
}

export interface PlanoAtaque {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  prioridade: 'Baixa' | 'Média' | 'Alta';
  status: 'A Fazer' | 'Em Andamento' | 'Concluído';
  createdAt?: string;
}

export interface AnexoClienteOculto {
  id: string;
  nome: string;
  tipo: string;
  url: string;
}

export interface EvidenciaClienteOculto {
  id: string;
  concorrenteId?: string;
  concorrenteNome: string;
  data: string;
  responsavel: string;
  canal: 'Presencial' | 'Telefone' | 'WhatsApp' | 'Site';
  relato: string;
  anexos?: AnexoClienteOculto[];
  createdAt?: any;
}

export interface PrecoInstituicao {
  id: string;
  curso: string;
  modalidade: 'Presencial' | 'Semipresencial' | 'EAD' | string;
  turno?: string;
  mensalidade: number;
  valorDe?: number;
  unidade?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ControleConcorrencia {
  id: string;
  ies: string; // Nome / Razão Social
  razaoSocial?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  site?: string;
  observacao?: string;
  observacoes?: string;
  unidadeVinculada?: string;

  swot?: SWOTItem[];
  cursos?: CursoConcorrente[];
  planoAtaque?: PlanoAtaque[];
  evidencias?: EvidenciaClienteOculto[];

  // Campos legados mantidos para compatibilidade
  curso?: string;
  valor?: number;
  descontoExtra?: string;

  createdAt?: any;
  updatedAt?: any;
}

export interface BomDiaMetrics {
  insc: number;
  matFin: number;
  matAcad: number;
}

export interface BomDiaCaptacao {
  id: string;
  titulo: string;
  metaFinal: BomDiaMetrics;
  metaDia: BomDiaMetrics;
  anoAnterior: BomDiaMetrics;
  real: BomDiaMetrics;
  data: string;
  oculto?: boolean;
  createdAt: any;
}

export interface ForecastCaptacao {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  metaDiaYTD: number;
  realizado: number;
  metaFechamento: number;
  oculto?: boolean;
  linkedBomDiaId?: string;
  linkedBomDiaMetric?: 'insc' | 'matFin' | 'matAcad';
  createdAt: any;
}

export interface PlannerTask {
  id: string;
  dayOfWeek: string;
  atendenteName: string;
  baseName: string;
}

export interface FiesProuniVaga {
  id: string;
  periodo: string;
  semestre?: string;
  codCurso: string;
  curso: string;
  turno: string;
  metodologia: string;
  bolsa: '50%' | '100%';
  vagas: number;
  unidade?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface FiesProuniEntry {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  tipo: 'FIES' | 'PROUNI';
  bolsa: 'Parcial' | 'Total' | 'PARCIAL' | 'INTEGRAL';
  metodologia: string;
  curso: string;
  situacao?: 'Candidato' | 'Aluno (mesmo curso)' | 'Aluno (outro curso)';
  cotaPPI?: 'Sim' | 'Não';
  inscricaoSales: string;
  numeroMatricula: string;
  tcbAssinado: boolean;
  digitalizaStatus: 'Não Postado' | 'Em Análise' | 'Concluído' | 'Documento reprovado';
  documentosEntregues: string[];
  docsEntreguesStatus: 'Sim' | 'Parcial' | 'Pendente' | 'Não compareceu';
  responsavelEntrevista: string;
  dataEntrevista: string;
  email: string;
  status: string;
  endereco: string;
  observacao: string;
  periodo: string;
  semestre?: string;
  lista: string;
  posicaoRanking: string;
  sisprouniStatus?: 'Pendente' | 'Aprovado' | 'Reprovado';
  unidade?: string;
  createdAt: any;
}

export interface LinkUtil {
  id: string;
  nome: string;
  url: string;
  local?: string;
}

export interface PeriodoCaptacao {
  id: string;
  nome: string;
  inicioInscricao: string;
  fimInscricao: string;
  inicioMatFin: string;
  fimMatFin: string;
  inicioMatAcad: string;
  fimMatAcad: string;
  createdAt: any;
}

export interface EmpresaParceira {
  id: string;
  nome: string;
  responsavel: string;
  telefone: string; // company phone
  email: string;
  endereco: string;
  bairro?: string;
  cidade?: string;
  linkMaps: string;
  telefoneResponsavel?: string;
  classificacao?: 'Bronze' | 'Prata' | 'Ouro' | '';
  seguimento?: string;
  cnpj?: string;
  statusEmpresa?: 'Conveniada' | 'Em tratativa' | 'Cancelada' | 'Não visitada' | '';
  linkSales?: string;
  createdAt: any;
  unidadesVinculadas?: string[];
  consultorId?: string;
  consultorNome?: string;
  notificado3d?: boolean;
  notificado7d?: boolean;
  notificado15d?: boolean;
}

export interface WhatsAppMessage {
  id: string;
  tipo: 'historico' | 'bases' | 'gap' | 'fiesProuni' | 'gap_0' | 'gap_1' | 'fiesProuni_0' | 'fiesProuni_1' | 'gap_ok' | 'fiesProuni_ok' | 'bases_renovacao';
  texto: string;
  nome?: string;
  updatedAt: any;
}

export interface Aviso {
  id: string;
  url: string;
  local?: string;
  titulo?: string;
  descricao?: string;
  createdAt: any;
}

export interface MapaoDisciplina {
  codDisc: string;
  disciplina: string;
  dia: string;
  horario: string;
  turma: string;

  tipoDisciplina: 'PRESENCIAL' | 'TEAMS' | 'ONLINE' | string;
  professor: string;
  matricula: string;
  observacao: string;
  linkAula?: string;
}

export interface MapaoAcademicoEntry {
  id: string;
  modalidade: string;
  curso: string;
  periodo: string;
  semestre?: string;
  tipoCurso: 'GRADUACAO' | 'TECNICO';

  disciplinas: MapaoDisciplina[];
  createdAt: any;
}

export interface EvasaoRecord {
  id: string;
  atendimento: string;
  tipoAtendimento: string;
  horario: string;
  unidade: string;
  modalidade: string;
  matricula: string;
  curso: string;
  safra: string;
  nome: string;
  contato: string;
  status: string;
  pendencia: string;
  resultado: string;
  trancamentoCancelamento: string;
  periodo?: string;
  tipoSolicitacao?: string;
  observacao?: string;
  parcelaLeve?: string;
  mensalidades?: string;
  parcelamento?: string;
  instituicaoDestino?: string;
  multa?: string;

  createdAt: any;
  updatedAt?: any;
}

export interface BaseDisparoEntry {
  id: string;
  data: string;
  nomeBase: string;
  totalDisparos: number;
  positivos: number;
  negativos: number;
  createdAt: any;
}

export interface MetaDia {
  id: string;
  data: string;
  aaPresencial: number;
  ytdPresencial: number;
  realizadoPresencial: number;
  aaSemipresencial: number;
  ytdSemipresencial: number;
  realizadoSemipresencial: number;
  aaDigital: number;
  ytdDigital: number;
  realizadoDigital: number;
  aaTecnico?: number;
  ytdTecnico?: number;
  realizadoTecnico?: number;
  aaPosGraduacao?: number;
  ytdPosGraduacao?: number;
  realizadoPosGraduacao?: number;
  createdAt: any;
}

export interface QgLigacao {
  id: string;
  nome: string;
  diaSemana: string | string[];
  horario: string;
  createdAt: any;
}

export interface BotConfig {
  id?: string;
  url: string;
  local?: string;
  active: boolean;
  trainingContext?: string;
  botNames?: Record<string, string>;
  loginLogo?: string;
  openRouterApiKey?: string;
  aiModel?: string;
  telegramBotUrl?: string;
  telegramApiKey?: string;
  updatedAt?: any;
}

export interface SolicitacaoFolga {
  id: string;
  solicitanteId: string;
  solicitanteNome: string;
  solicitanteEmail: string;
  solicitanteRole: UserRole;
  dataInicio: string;  // Format YYYY-MM-DD
  dataFim: string;     // Format YYYY-MM-DD
  tipo: 'Folga' | 'Férias';
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  aprovadoPorId?: string;
  aprovadoPorNome?: string;
  justificativa?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface CursoDisponivel {
  id: string;
  nomeUnidade: string;
  produto: 'Graduação' | 'Técnico' | 'Pós-graduação';
  curso: string;
  metodologia: string;
  duracao: string;
  turno?: string;
  createdAt: any;
}

export interface InsumoItem {
  material: string;
  quantidade: number;
}

export interface InsumoPedido {
  id: string;
  professorNome: string;
  cursoNome: string;
  disciplinaNome: string;
  motivoUso: string;
  itens: InsumoItem[];
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Andamento' | 'Entregue';
  solicitanteId: string;
  solicitanteNome: string;
  tipoFicha?: 'docente' | 'administrativo';
  createdAt: any;
  updatedAt?: any;
}

export interface InsumoEstoque {
  id: string;
  material: string;
  quantidade: number;
  unidadeMedida?: string;
  estoqueMinimo?: number;
  descricao?: string;
  updatedAt: any;
}

export interface InsumoItemComercial {
  material: string;
  quantidade: number;
}

export interface InsumoPedidoComercial {
  id: string;
  motivoUso: string;
  itens: InsumoItemComercial[];
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Andamento' | 'Entregue';
  solicitanteId: string;
  solicitanteNome: string;
  createdAt: any;
  updatedAt?: any;
  professorNome?: string;
  cursoNome?: string;
  disciplinaNome?: string;
  tipoFicha?: 'docente' | 'administrativo';
  matricula?: string;
}

export interface InsumoEstoqueComercial {
  id: string;
  material: string;
  quantidade: number;
  unidadeMedida?: string;
  estoqueMinimo?: number;
  descricao?: string;
  ownerId: string;
  ownerName: string;
  updatedAt: any;
}

export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  tipo: 'docente' | 'administrativo';
  matricula: string;
  unidade?: string;
  createdAt: any;
}

export interface InsumoBaixa {
  id: string;
  materialId: string;
  materialNome: string;
  quantidade: number;
  motivo: 'Uso em aula' | 'Uso no setor' | 'Material vencido(lixo)';
  realizadoPor: string;
  createdAt: any;
}

export interface BotReport {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  telefone: string;
  tipoContato: 'leads' | 'bases' | 'bases_renovacao' | 'fies_prouni' | 'gap' | 'outro';
  baseName?: string;
  sentAt: any;
}

export interface PedidoCursoEntry {
  id: string;
  nome: string;
  telefone: string;
  curso: string;
  createdAt: any;
}

export interface IsencaoEntry {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  numeroOportunidade?: string;
  curso: string;
  cursoOrigem?: string;
  universidadeOrigem?: string;
  formaIngresso?: string;
  inseridoDigitaliza: 'Sim' | 'Não';
  status: 'Pendente' | 'Solicitado' | 'Deferido';
  comprovanteDeferidoUrl?: string;
  comprovanteDeferidoNome?: string;
  comprovanteDeferidoTipo?: string;
  dataDeferimento?: any;
  boletoPago: boolean;
  resultado?: 'Convertido' | 'Sem interesse';
  observacaoResultado?: string;
  createdAt: any;
  updatedAt?: any;
  createdByNome?: string;
  unidade?: string;
}

export interface Ligacao {
  id: string;
  candidatoId: string; // Lead ID or BaseEntry ID
  candidatoNome: string;
  candidatoTelefone: string;
  origem: 'Lead' | 'Base' | 'FiesProuni' | 'Gap';
  origemId: string; // acaoId or baseName
  status: 'Não atendeu' | 'Sem interesse' | 'Interesse' | 'Convertido' | 'Vai enviar a documentação via whatsapp/email' | 'Vai entregar pessoalmente na unidade';
  observacao?: string;
  atendenteId: string;
  atendenteNome: string;
  unidade?: string;
  createdAt: any;
}

export interface PeriodAnalysis {
  periodo: string;
  semestre?: string;
  meta: number;
  realizado: number;
}

export interface AnalysisScheme {
  id: string;
  nome: string;
  periodos: PeriodAnalysis[];
  createdAt: any;
}




export interface SolicitacaoManutencao {
  id: string;
  descricao: string;
  local: string;
  predio?: string;
  setor?: string;
  matricula?: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Andamento' | 'Concluído';
  solicitanteId: string;
  solicitanteNome: string;
  createdAt: any;
  updatedAt?: any;
  observacoesFinanceiro?: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  receiverPhone: string;
  timestamp: any;
  type: 'sent' | 'received';
  status?: 'sent' | 'delivered' | 'read';
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  leadMapping: keyof Lead | 'custom';
}

export interface FormConfig {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  fields: FormField[];
  unidade?: string;
  bannerUrl?: string;
  isLeadAction?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface Conversation {
  id: string; // Typically the contact's phone number
  contactPhone: string;
  contactName: string;
  lastMessage: string;
  lastMessageTimestamp: any;
  unreadCount: number;
  assignedTo?: string; // UID of the user assigned to this chat
  unidade?: string;
  sentiment?: "Positivo" | "Negativo" | "Neutro";
}

export interface MetaSM {
  id: string;
  semestre: string;
  metaAA: number;
  metaDia: number;
  metaFinal: number;
  realizado: number;
  createdAt?: any;
}

export interface MetaUnidadeRegional {
  id: string;
  unidade: string;
  semestre: string;
  metaAA: number;
  metaDia: number;
  metaFinal: number;
  realizado: number;
  inscritos?: MetaCursoMetrics;
  financeiro?: MetaCursoMetrics;
  academico?: MetaCursoMetrics;
  createdAt?: any;
  updatedAt?: any;
}

export interface MetaCursoMetrics {
  metaAA: number;
  metaDia: number;
  metaFinal: number;
  realizado: number;
}

export interface MetaCurso {
  id: string;
  semestre: string;
  curso: string;
  inscritos?: MetaCursoMetrics;
  financeiro?: MetaCursoMetrics;
  academico?: MetaCursoMetrics;
  // Legacy fields
  metaAA?: number;
  metaDia?: number;
  metaFinal?: number;
  realizado?: number;
  createdAt?: any;
}

export interface UnidadeRegional {
  id: string;
  nome: string;
  marca?: string;
  regional?: string;
  nucleo?: string;
  cluster?: string;
  codigo?: string;
  endereco?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type FuncaoSM =
  | 'Gestor'
  | 'Lider'
  | '02'
  | 'Atendente sm'
  | 'Estagiario'
  | 'Jovem aprendiz'
  | 'Líder'
  | 'Administrativo'
  | 'Estagiário'
  | 'Jovem Aprendiz';

export interface FuncionarioSM {
  id: string;
  nome: string;
  funcao?: FuncaoSM;
  cargo?: FuncaoSM; // compatibilidade com código existente
  unidade: string;
  marca?: string;
  regional?: string;
  nucleo?: string;
  cluster?: string;
  status: 'Ativo' | 'Licença' | 'Inativo';
  cpf?: string;
  email?: string;
  matricula?: string;
  dataNascimento?: string; // DT NASC
  admissaoSm?: string; // ADMISSÃO SM
  admissaoRh?: string; // ADMISSÃO RH
  desligamento?: string; // DESLIGAMENTO (opcional)
  tamanhoBlusa?: string; // Tamanho Blusa
  pdvSalesforce?: string; // PDV SalesForce
  telefone?: string; // Telefone Principal
  telefonePrincipal?: string;
  telefoneAtendimento?: string; // Telefone de Atendimento (opcional)
  dataAlteracao?: string; // Registro da data de realização de edição
  dataEdicao?: string;
  updatedAt?: any;
  createdAt?: any;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  unidade?: string;
  responsavelNome?: string;
  dataPrazo?: string;
  status: 'Em Andamento' | 'Parado' | 'Atrasado' | 'Deferido' | 'Cancelado';
  creatorId?: string;
  creatorNome?: string;
  servidor?: string;
  createdAt?: any;
}

export interface ClubeParceiro {
  id?: string;
  nomeEmpresa: string;
  categoria: 'Alimentação' | 'Saúde & Fitness' | 'Educação & Cursos' | 'Lazer & Entretenimento' | 'Moda & Beleza' | 'Serviços & Tecnologia' | 'Outros';
  descontoBadge: string;
  descricao: string;
  codigoVoucher: string;
  instrucoesUso: string;
  imagemUrl?: string;
  bannerUrl?: string;
  destaqueBanner?: boolean;
  linkParceiro?: string;
  whatsappContact?: string;
  endereco?: string;
  unidade?: string;
  validade?: string;
  ativo: boolean;
  totalResgates?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ClubeResgate {
  id?: string;
  parceiroId: string;
  nomeEmpresa: string;
  codigoVoucher: string;
  userId: string;
  userName: string;
  userEmail: string;
  userUnidade?: string;
  codigoUnicoResgate: string;
  status?: 'pendente' | 'utilizado';
  dataUtilizacao?: any;
  dataResgate: any;
  empresaValidadora?: string;
  atendenteNome?: string;
  observacaoUso?: string;
  valorConsumo?: number;
  descontoAplicado?: number;
}

export interface ClubeEmpresaValidadora {
  id?: string;
  nomeEmpresa: string;
  parceiroId?: string;
  cnpj?: string;
  responsavelNome?: string;
  responsavelTelefone?: string;
  endereco?: string;
  unidade?: string;
  codigoAcesso?: string;
  ativo?: boolean;
  totalValidados?: number;
  createdAt?: any;
  updatedAt?: any;
}

export const ROLES: Record<string, UserRole> = {
  ADMIN_MASTER: "Admin Master",
  PROMOTOR: "Promotor",
  FDV: "FDV",
  SALA_MATRICULA: "Sala de Matrícula",
  QG: "QG",
  LIDER_FDV: "Líder/FDV",
  SSA: "SSA",
  GESTOR_UNIDADE: "Gestor Unidade",
  GESTOR_COMERCIAL: "Gestor Comercial",
  ACADEMICO: "Acadêmico",
  PROMOTOR_RUA: "Promotor/rua",
  GESTOR_COMERCIAL_COMERCIAL: "Gerente Comercial (Comercial)",
  FDV_COMERCIAL: "FDV (Comercial)",
  FINANCEIRO: "Financeiro",
  TECNICO: "Técnico",
  REGIONAL: "Regional",
  LIDER_SM: "Líder SM",
  GESTOR: "Gestor",
};
