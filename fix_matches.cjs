const fs = require('fs');

const file = 'src/components/GapView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const matchCurso = !filterCurso \|\| \(item\.curso \|\| ""\)\.toLowerCase\(\)\.includes\(filterCurso\.toLowerCase\(\)\);/,
  `const matchCurso = !filterCurso || item.curso === filterCurso;`
);

code = code.replace(
  /const matchPeriodo = !filterPeriodo \|\| \(item\.periodo \|\| item\.semestre \|\| ""\)\.includes\(filterPeriodo\);/,
  `const matchPeriodo = !filterPeriodo || (item.periodo || item.semestre) === filterPeriodo;`
);

fs.writeFileSync(file, code);
