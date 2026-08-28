import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /"Não tem interesse"\s*\|\s*"Sem retorno",\s*}\);/g,
  '"Não tem interesse"\n      | "Sem retorno"\n      | "Contato via Sales",\n  });'
);

fs.writeFileSync('src/App.tsx', code);
