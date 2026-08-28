const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  'metaSM: true,',
  'metaSM: true,\n    metaCursos: true,'
);
fs.writeFileSync('src/App.tsx', code);

