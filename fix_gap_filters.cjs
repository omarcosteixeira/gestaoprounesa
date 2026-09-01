const fs = require('fs');

const file = 'src/components/GapView.tsx';
let code = fs.readFileSync(file, 'utf8');

// revert matchCurso and matchPeriodo to includes since they should be text inputs
code = code.replace(
  /const matchCurso = !filterCurso \|\| item\.curso === filterCurso;/,
  `const matchCurso = !filterCurso || (item.curso || "").toLowerCase().includes(filterCurso.toLowerCase());`
);

code = code.replace(
  /const matchPeriodo = !filterPeriodo \|\| \(item\.periodo \|\| item\.semestre\) === filterPeriodo;/,
  `const matchPeriodo = !filterPeriodo || (item.periodo || item.semestre || "").toLowerCase().includes(filterPeriodo.toLowerCase());`
);

// fix normalizeStatus to handle case variations
code = code.replace(
  /const normalizeStatus = \(matAcad: any\) => \{\n  if \(typeof matAcad === 'boolean'\) return matAcad \? "MATRÍCULA GERADA" : "PENDENTE";\n  return matAcad \|\| "PENDENTE";\n\};/,
  `const normalizeStatus = (matAcad: any) => {
  if (typeof matAcad === 'boolean') return matAcad ? "MATRÍCULA GERADA" : "PENDENTE";
  if (typeof matAcad === 'string') {
    const upper = matAcad.toUpperCase();
    if (upper.includes("GERADA") || upper === "OK") return "MATRÍCULA GERADA";
    if (upper.includes("PENDENTE")) return "PENDENTE";
    if (upper.includes("AGUARDANDO")) return "AGUARDANDO";
    if (upper.includes("DESISTENTE")) return "DESISTENTE";
    return upper;
  }
  return "PENDENTE";
};`
);

// fix uniqueProdutos to map correctly (uppercase for comparison if needed, but let's just keep as is and use case-insensitive match)
code = code.replace(
  /const matchProduto = !filterProduto \|\| item\.produto === filterProduto;/,
  `const matchProduto = !filterProduto || (item.produto || "").toLowerCase() === filterProduto.toLowerCase();`
);

fs.writeFileSync(file, code);
console.log('Fixed filters');
