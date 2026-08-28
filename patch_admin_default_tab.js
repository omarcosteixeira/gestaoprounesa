import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '  >("usuarios");',
  `  >(profile?.role === "Gestor Unidade" ? "forecast" : "usuarios");`
);

fs.writeFileSync('src/App.tsx', code);
