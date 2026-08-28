const fs = require('fs');

function fix(file, varName) {
  let code = fs.readFileSync(file, 'utf8');
  // Add a fallback for the array spread in case it is undefined
  code = code.replace(
    `[...${varName}]`,
    `[...(${varName} || [])]`
  );
  fs.writeFileSync(file, code);
}

fix('src/components/MetaSMView.tsx', 'metaSM');
fix('src/components/MetaCursosView.tsx', 'metaCursos');

