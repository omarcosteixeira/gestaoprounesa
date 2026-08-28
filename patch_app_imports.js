import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('SalesContact')) {
  code = code.replace(
    '  CrescimentoAnualEntry,\n  SolicitacaoManutencao,\n} from "./types";',
    '  CrescimentoAnualEntry,\n  SolicitacaoManutencao,\n  SalesContact\n} from "./types";'
  );
}

if (!code.includes('handleContatoViaSales = async')) {
  const target = '  const handleMoveToGap = async (lead: Lead) => {';
  const replacement = `  const handleContatoViaSales = async (contact: {id: string; nome: string; telefone: string; cursoInteresse?: string; curso?: string}, origem: string) => {
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

  const handleMoveToGap = async (lead: Lead) => {`;
  code = code.replace(target, replacement);
}

fs.writeFileSync('src/App.tsx', code);
