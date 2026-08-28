const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Replace metaCursos.sort(...) with [...metaCursos].sort(...)
  code = code.replace(/\{metaCursos\.sort\(/g, '{[...metaCursos].sort(');
  
  // Replace metaSM.sort(...) with [...metaSM].sort(...)
  code = code.replace(/\{metaSM\.sort\(/g, '{[...metaSM].sort(');

  // In RelatoriosView:
  code = code.replace(/metaCursos\n\s*\.filter/g, '[...metaCursos]\n                        .filter');
  
  fs.writeFileSync(filePath, code);
}

fixFile('src/components/MetaCursosView.tsx');
fixFile('src/components/MetaSMView.tsx');
fixFile('src/App.tsx');
fixFile('src/components/RelatoriosView.tsx');

