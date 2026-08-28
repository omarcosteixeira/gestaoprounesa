import fs from 'fs';
let code = fs.readFileSync('src/components/CursosDisponiveisView.tsx', 'utf8');

code = code.replace(
  'return matchUnidade && matchMetodologia && matchCurso && matchProduto;',
  `
      if (profile.role === "Gestor Unidade") {
        if (!profile.unidade || c.nomeUnidade !== profile.unidade) {
          return false;
        }
      }
      return matchUnidade && matchMetodologia && matchCurso && matchProduto;
  `
);
// Also need to add profile to the dependency array of useMemo
code = code.replace(
  '], [cursos, filterUnidade, filterMetodologia, filterCurso, filterProduto]);',
  '], [cursos, filterUnidade, filterMetodologia, filterCurso, filterProduto, profile]);'
);

fs.writeFileSync('src/components/CursosDisponiveisView.tsx', code);
