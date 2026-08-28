import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure SalesContact is in imports
if (!code.includes('SalesContact')) {
  code = code.replace(
    'CrescimentoAnualEntry,', 
    'CrescimentoAnualEntry,\n  SalesContact,'
  );
}

// Ensure handleContatoViaSales is defined before it's used
if (!code.includes('const handleContatoViaSales = async')) {
  const target = 'const handleMoveToGap = async (lead: Lead) => {';
  const replacement = `  const handleContatoViaSales = async (contact: any, origem: string) => {
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
