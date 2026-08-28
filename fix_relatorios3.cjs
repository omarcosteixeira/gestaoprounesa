const fs = require('fs');

let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

if (!code.includes('MetaSM,')) {
  code = code.replace(
    '} from "../types";',
    '  MetaSM,\n  MetaCurso\n} from "../types";'
  );
  fs.writeFileSync('src/components/RelatoriosView.tsx', code);
}
