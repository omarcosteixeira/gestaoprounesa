const fs = require('fs');

let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

// First revert the bad import
code = code.replace(
  'import {\n  MetaSM,\n  MetaCurso,\n  LineChart,',
  'import {\n  LineChart,'
);

code = code.replace(
  'import {\n  MetaSM,\n  MetaCurso,\n  Search,',
  'import {\n  Search,'
);

code = code.replace(
  'import {\n  MetaSM,\n  MetaCurso,\n  ChevronDown,',
  'import {\n  ChevronDown,'
);

// Then add to correct place
if (code.includes('import { Lead, SolicitacaoFolga')) {
  code = code.replace(
    'import { Lead, SolicitacaoFolga',
    'import { Lead, SolicitacaoFolga, MetaSM, MetaCurso'
  );
} else if (code.includes('import { Lead')) {
  code = code.replace(
    'import { Lead',
    'import { Lead, MetaSM, MetaCurso'
  );
} else {
  // Just add it
  code = code.replace(
    'import { COLLECTIONS } from "../firebase";',
    'import { COLLECTIONS } from "../firebase";\nimport { MetaSM, MetaCurso } from "../types";'
  );
}

fs.writeFileSync('src/components/RelatoriosView.tsx', code);
