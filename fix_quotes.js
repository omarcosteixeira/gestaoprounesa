import fs from 'fs';
let code = fs.readFileSync('src/components/RelatorioSales.tsx', 'utf8');

code = code.replace(
  /label=\{\(\{ name, percent \}\) => \\\`\\\\\$\{name\} \(\\\\\$\{\(percent \* 100\)\.toFixed\(0\)\\}%\)\\\`\}/,
  'label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}'
);

code = code.replace(/\\\`/g, '`');
code = code.replace(/\\\\\$/g, '$');

fs.writeFileSync('src/components/RelatorioSales.tsx', code);
