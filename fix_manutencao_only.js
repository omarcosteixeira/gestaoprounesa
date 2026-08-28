import fs from 'fs';
for (const file of ['firestore.rules', 'firestore-comercial.rules']) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    // Revert everything
    code = code.replace(/allow read, update, delete: if isAuthenticated\(\);\n      allow create: if true;/g, 'allow read, write: if isAuthenticated();');
    
    // Now apply ONLY to solicitacoes_manutencao
    code = code.replace(
      /data\/solicitacoes_manutencao\/{id} {\s*allow read, write: if isAuthenticated\(\);/g,
      'data/solicitacoes_manutencao/{id} {\n      allow read, update, delete: if isAuthenticated();\n      allow create: if true;'
    );

    fs.writeFileSync(file, code);
  }
}
