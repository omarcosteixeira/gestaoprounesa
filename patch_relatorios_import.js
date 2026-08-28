import fs from 'fs';
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

code = code.replace(
  'import { InsumosDashboard } from "./InsumosDashboard";',
  'import { InsumosDashboard } from "./InsumosDashboard";\nimport { RelatorioSales } from "./RelatorioSales";'
);

code = code.replace(
  '        {activeTab === "metaDia" && (',
  '        {activeTab === "sales" && (\n          <RelatorioSales salesContacts={salesContacts} />\n        )}\n\n        {activeTab === "metaDia" && ('
);

fs.writeFileSync('src/components/RelatoriosView.tsx', code);
