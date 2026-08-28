import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The function is currently defined in the wrong scope. Let's find exactly where it is and move it up.
// It seems it was defined twice, possibly inside some nested scope.

// Strip out ALL handleContatoViaSales definitions
code = code.replace(/const handleContatoViaSales = async \([^)]*\) => \{\s*try \{\s*await addDoc\(collection\(db, COLLECTIONS\.SALES_CONTACTS\), \{[\s\S]*?\}\);\s*onToast\([^)]*\);\s*\} catch \([^)]*\) \{\s*console\.error\([^)]*\);\s*onToast\([^)]*\);\s*\}\s*\};\s*/g, '');

// Re-insert exactly where it belongs (right before handleMoveToGap which is globally scoped within App)
code = code.replace('  const handleMoveToGap = async (lead: Lead) => {', `  const handleContatoViaSales = async (contact: any, origem: string) => {
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

fs.writeFileSync('src/App.tsx', code);
