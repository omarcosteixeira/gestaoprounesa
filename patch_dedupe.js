import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The replacement script accidentally added handleContatoViaSales twice due to duplicated const handleMoveToGap
const target1 = `  const handleContatoViaSales = async (contact: {id: string; nome: string; telefone: string; cursoInteresse?: string; curso?: string}, origem: string) => {
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

  const handleContatoViaSales = async (contact: any, origem: string) => {
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
  };`;
  
code = code.replace(target1, `  const handleContatoViaSales = async (contact: any, origem: string) => {
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
  };`);
  
  
const target2 = `  const handleContatoViaSales = async (contact: {id: string; nome: string; telefone: string; cursoInteresse?: string; curso?: string}, origem: string) => {
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
  };`;

// Just try to aggressively clean up multiple copies of this function in App.tsx
const parts = code.split(target2);
if (parts.length > 2) {
  code = parts.join(''); // Just remove them all and re-insert once
}

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

// Ensure App.tsx correctly maps handleContatoViaSales by exposing it globally or at the top of the component
// Oh wait, handleContatoViaSales was put *inside* some effect or function by mistake.
fs.writeFileSync('src/App.tsx', code);
