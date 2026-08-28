import fs from 'fs';
let code = fs.readFileSync('src/firebase.ts', 'utf8');

const target = `import firebaseConfigPrincipalRaw from '../firebase-applet-config.json';`;
code = code.replace(target, '');
fs.writeFileSync('src/firebase.ts', code);
