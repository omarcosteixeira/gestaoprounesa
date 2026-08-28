import fs from 'fs';
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

code = code.replace(
  '  IsencaoEntry,\n  PedidoCursoEntry,\n  MetaDia,\n  Ligacao,\n  AnalysisScheme,\n  SolicitacaoManutencao\n} from "../types";',
  '  IsencaoEntry,\n  PedidoCursoEntry,\n  MetaDia,\n  Ligacao,\n  AnalysisScheme,\n  SolicitacaoManutencao,\n  SalesContact\n} from "../types";'
);

code = code.replace(
  '  solicitacoesManutencao?: SolicitacaoManutencao[];\n  profile: UserProfile;\n  onToast: (msg: string, type?: "success" | "error") => void;\n}',
  '  solicitacoesManutencao?: SolicitacaoManutencao[];\n  salesContacts?: SalesContact[];\n  profile: UserProfile;\n  onToast: (msg: string, type?: "success" | "error") => void;\n}'
);

code = code.replace(
  '  solicitacoesManutencao = [],\n  analysisSchemes = [],\n  profile,\n  onToast,\n}: RelatoriosViewProps) => {',
  '  solicitacoesManutencao = [],\n  salesContacts = [],\n  analysisSchemes = [],\n  profile,\n  onToast,\n}: RelatoriosViewProps) => {'
);

code = code.replace(
  '    "historico" | "bases" | "fiesProuni" | "planoAcao" | "empresas" | "insumos" | "isencoes" | "pedidos_cursos" | "metaDia" | "ligacoes" | "crescimento" | "manutencao"\n  >("historico");',
  '    "historico" | "bases" | "fiesProuni" | "planoAcao" | "empresas" | "insumos" | "isencoes" | "pedidos_cursos" | "metaDia" | "ligacoes" | "crescimento" | "manutencao" | "sales"\n  >("historico");'
);

fs.writeFileSync('src/components/RelatoriosView.tsx', code);
