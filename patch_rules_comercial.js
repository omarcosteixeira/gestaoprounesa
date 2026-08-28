import fs from 'fs';

for (const file of ['firestore.rules', 'firestore-comercial.rules']) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Fix leads allow create
    code = code.replace(
      /allow create: if \(request\.auth == null \|\| canAccessUnit\(request\.resource\.data\.unidade\)\);/g,
      'allow create: if true;'
    );

    // Add forms_config if missing
    if (!code.includes('/public/data/forms_config/')) {
      const dbMatch = file === 'firestore-comercial.rules' ? 'gestaodeleadspro-d4230' : 'gestaopro-761e1';
      const insertStr = `
    match /artifacts/${dbMatch}/public/data/forms_config/{id} {
      allow read: if true;
      allow write: if isPrincipal() || isComercial();
    }
`;
      // Insert right before the last closing brace
      code = code.replace(/  \}\s*\}\s*$/, insertStr + '  }\n}\n');
    }

    fs.writeFileSync(file, code);
  }
}
