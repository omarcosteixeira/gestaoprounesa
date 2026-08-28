import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The issue is likely that handleContatoViaSales was removed entirely because the regex was too aggressive.
if (!code.includes('const handleContatoViaSales = async')) {
  code = code.replace('const handleMoveToGap = async (lead: Lead) => {', `  const handleContatoViaSales = async (contact: any, origem: string) => {
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

// Make absolutely sure SalesContact is exported correctly from types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
if (!types.includes('export interface SalesContact')) {
  types += `\nexport interface SalesContact {\n  id: string;\n  contactId: string;\n  nome: string;\n  telefone: string;\n  curso: string;\n  origem: string;\n  createdAt: any;\n}\n`;
  fs.writeFileSync('src/types.ts', types);
}

// Make sure App.tsx imports SalesContact correctly
if (!code.match(/import \{[^}]*SalesContact[^}]*\} from "\.\/types"/)) {
  code = code.replace('import {\n  UserProfile,', 'import {\n  UserProfile,\n  SalesContact,');
}

fs.writeFileSync('src/App.tsx', code);
