const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  'metaCursos.length > 0',
  '(metaCursos && metaCursos.length > 0)'
);
code = code.replace(
  'metaSM.length > 0',
  '(metaSM && metaSM.length > 0)'
);
fs.writeFileSync('src/App.tsx', code);
