const fs = require('fs');
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

code = code.replace('  MetaSM,\n  MetaCurso, \n  BarChart3,', '  BarChart3,');
code = code.replace('  MetaSM,\n  MetaCurso,\n   BarChart3,', '  BarChart3,');

if (code.includes('import { Lead')) {
  code = code.replace('import { Lead', 'import { Lead, MetaSM, MetaCurso');
} else {
  code = code.replace('import { Lead', 'import { Lead, MetaSM, MetaCurso');
}

fs.writeFileSync('src/components/RelatoriosView.tsx', code);
