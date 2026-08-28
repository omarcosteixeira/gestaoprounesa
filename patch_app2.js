import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add SalesContact to imports
code = code.replace(
  '  IsencaoEntry,\n  PedidoCursoEntry,\n  MetaDia,\n  Ligacao,\n  CrescimentoAnualEntry,\n  SolicitacaoManutencao,\n} from "./types";',
  '  IsencaoEntry,\n  PedidoCursoEntry,\n  MetaDia,\n  Ligacao,\n  CrescimentoAnualEntry,\n  SolicitacaoManutencao,\n  SalesContact,\n} from "./types";'
);

// Add state
const target = `  const [leads, setLeads] = useState<Lead[]>([]);`;
const replacement = `  const [salesContacts, setSalesContacts] = useState<SalesContact[]>([]);\n  const [leads, setLeads] = useState<Lead[]>([]);`;
code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
