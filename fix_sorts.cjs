const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Fix metaCursos sort
  code = code.replace(
    /metaCursos\.sort\(\(a,b\) => b\.semestre\.localeCompare\(a\.semestre\) \|\| a\.curso\.localeCompare\(b\.curso\)\)/g,
    'metaCursos.sort((a,b) => (b.semestre || "").localeCompare(a.semestre || "") || (a.curso || "").localeCompare(b.curso || ""))'
  );
  
  // Fix metaSM sort
  code = code.replace(
    /metaSM\.sort\(\(a,b\) => b\.semestre\.localeCompare\(a\.semestre\)\)/g,
    'metaSM.sort((a,b) => (b.semestre || "").localeCompare(a.semestre || ""))'
  );

  code = code.replace(
    /\[\.\.\.metaSM\]\.sort\(\(a,b\) => a\.semestre\.localeCompare\(b\.semestre\)\)/g,
    '[...metaSM].sort((a,b) => (a.semestre || "").localeCompare(b.semestre || ""))'
  );
  
  fs.writeFileSync(filePath, code);
}

fixFile('src/components/MetaCursosView.tsx');
fixFile('src/components/MetaSMView.tsx');
fixFile('src/App.tsx');
fixFile('src/components/RelatoriosView.tsx');
