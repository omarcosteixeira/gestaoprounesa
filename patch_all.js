import fs from 'fs';

// 1. Fix types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
if (!types.includes('export interface SalesContact')) {
  types = `export interface SalesContact {
  id: string;
  contactId: string;
  nome: string;
  telefone: string;
  curso: string;
  origem: string;
  createdAt: any;
}\n\n` + types;
  fs.writeFileSync('src/types.ts', types);
}

// 2. Fix App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure SalesContact is imported
if (!app.match(/import \{[^}]*SalesContact[^}]*\} from "\.\/types"/)) {
  app = app.replace('SolicitacaoManutencao,', 'SolicitacaoManutencao,\n  SalesContact,');
}

// Add state if missing
if (!app.includes('const [salesContacts, setSalesContacts] = useState<SalesContact[]>')) {
  app = app.replace('const [leads, setLeads] = useState<Lead[]>([]);', 'const [salesContacts, setSalesContacts] = useState<SalesContact[]>([]);\n  const [leads, setLeads] = useState<Lead[]>([]);');
}

// Add listener if missing
if (!app.includes('unsubSalesContacts = onSnapshot(')) {
  app = app.replace('let unsubLeads = () => {};', 'let unsubSalesContacts = () => {};\n    let unsubLeads = () => {};');
  app = app.replace('      unsubLeads = onSnapshot(\n        leadsQuery,', '      unsubSalesContacts = onSnapshot(\n        query(collection(db, COLLECTIONS.SALES_CONTACTS), orderBy("createdAt", "desc")),\n        (snap) => {\n          setSalesContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalesContact));\n        },\n        (err) => console.error("Error loading sales contacts:", err)\n      );\n      unsubLeads = onSnapshot(\n        leadsQuery,');
  app = app.replace('unsubLeads();\n      unsubBases();', 'unsubSalesContacts();\n        unsubLeads();\n      unsubBases();');
}

// Add handleContatoViaSales if missing
if (!app.includes('const handleContatoViaSales = async')) {
  app = app.replace('const handleMoveToGap = async (lead: Lead) => {', `  const handleContatoViaSales = async (contact: {id: string; nome: string; telefone: string; cursoInteresse?: string; curso?: string}, origem: string) => {
    try {
      await addDoc(collection(db, COLLECTIONS.SALES_CONTACTS), {
        contactId: contact.id,
        nome: contact.nome,
        telefone: contact.telefone,
        curso: contact.cursoInteresse || contact.curso || 'Não informado',
        origem,
        createdAt: serverTimestamp(),
      });
      onToast("Contato via Sales registrado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      onToast("Erro ao registrar Contato via Sales.", "error");
    }
  };

  const handleMoveToGap = async (lead: Lead) => {`);
}

// Ensure salesContacts is passed to RelatoriosView
if (app.includes('<RelatoriosView') && !app.includes('salesContacts={salesContacts}')) {
  app = app.replace('solicitacoesManutencao={solicitacoesManutencao}', 'solicitacoesManutencao={solicitacoesManutencao}\n                  salesContacts={salesContacts}');
}

fs.writeFileSync('src/App.tsx', app);

// 3. Fix RelatoriosView.tsx
let relatorios = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

if (!relatorios.match(/import \{[^}]*SalesContact[^}]*\} from "\.\.\/types"/)) {
  relatorios = relatorios.replace('SolicitacaoManutencao\n}', 'SolicitacaoManutencao,\n  SalesContact\n}');
}

if (!relatorios.includes('salesContacts?: SalesContact[]')) {
  relatorios = relatorios.replace('solicitacoesManutencao?: SolicitacaoManutencao[];', 'solicitacoesManutencao?: SolicitacaoManutencao[];\n  salesContacts?: SalesContact[];');
}

if (!relatorios.includes('salesContacts = []')) {
  relatorios = relatorios.replace('solicitacoesManutencao = [],', 'solicitacoesManutencao = [],\n  salesContacts = [],');
}

fs.writeFileSync('src/components/RelatoriosView.tsx', relatorios);
