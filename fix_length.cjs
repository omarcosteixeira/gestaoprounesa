const fs = require('fs');

function fix(file, varName) {
  let code = fs.readFileSync(file, 'utf8');
  // Add a fallback for the length check
  code = code.replace(
    `{${varName}.length === 0 && (`,
    `{(!${varName} || ${varName}.length === 0) && (`
  );
  fs.writeFileSync(file, code);
}

fix('src/components/MetaSMView.tsx', 'metaSM');
fix('src/components/MetaCursosView.tsx', 'metaCursos');

