import fs from 'fs';
for (const file of ['firestore.rules', 'firestore-comercial.rules']) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(
      /allow read, write: if isAuthenticated\(\);/g,
      'allow read, update, delete: if isAuthenticated();\n      allow create: if true;'
    );
    fs.writeFileSync(file, code);
  }
}
