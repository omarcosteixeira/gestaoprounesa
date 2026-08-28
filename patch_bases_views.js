import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = '  const [formData, setFormData] = useState({';
const replacement1 = `  const handleContatoViaSales = async (contact: any, origem: string) => {
    try {
      await addDoc(collection(db, COLLECTIONS.SALES_CONTACTS), {
        contactId: contact.id,
        nome: contact.nome,
        telefone: contact.telefone,
        curso: contact.cursoInteresse || contact.curso || "Não informado",
        origem,
        createdAt: serverTimestamp(),
      });
      onToast("Contato via Sales registrado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      onToast("Erro ao registrar Contato via Sales.", "error");
    }
  };
  
` + target1;

// This will apply to both BasesView and BasesRenovacaoView since they both start with formData
code = code.replace(/  const \[formData, setFormData\] = useState\(\{/g, replacement1);

fs.writeFileSync('src/App.tsx', code);
