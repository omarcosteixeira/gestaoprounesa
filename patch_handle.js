import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleMoveToGap = async (lead: Lead) => {`;
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

` + target;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
