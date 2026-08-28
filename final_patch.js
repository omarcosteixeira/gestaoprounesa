import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure handleContatoViaSales is completely defined outside
code = code.replace(
  '  const handleMoveToGap = async (lead: Lead) => {',
  `  const handleContatoViaSales = async (contact: any, origem: string) => {
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

  const handleMoveToGap = async (lead: Lead) => {`
);

fs.writeFileSync('src/App.tsx', code);

// Fix types.ts explicitly
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

// Fix App.tsx types imports
let app = fs.readFileSync('src/App.tsx', 'utf8');
if (!app.match(/import \{[^}]*SalesContact[^}]*\} from "\.\/types"/)) {
  app = app.replace('SolicitacaoManutencao,\n} from "./types";', 'SolicitacaoManutencao,\n  SalesContact,\n} from "./types";');
  fs.writeFileSync('src/App.tsx', app);
}

