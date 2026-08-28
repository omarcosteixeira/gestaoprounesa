const fs = require('fs');
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

code = code.replace(
  '  SalesContact\n  MetaSM,',
  '  SalesContact,\n  MetaSM,'
);

fs.writeFileSync('src/components/RelatoriosView.tsx', code);
