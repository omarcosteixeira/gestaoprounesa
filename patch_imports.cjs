const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');
if (!code.includes('import MetaSMView')) {
  code = code.replace(
    'import CRMView from "./components/CRMView";',
    `import CRMView from "./components/CRMView";\nimport MetaSMView from "./components/MetaSMView";\nimport MetaCursosView from "./components/MetaCursosView";`
  );
  fs.writeFileSync('src/App.tsx', code);
}

let code2 = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');
if (!code2.includes('MetaSM,')) {
  code2 = code2.replace(
    'import {',
    'import {\n  MetaSM,\n  MetaCurso,'
  );
  fs.writeFileSync('src/components/RelatoriosView.tsx', code2);
}
