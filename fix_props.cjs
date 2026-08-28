const fs = require('fs');

function patch(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('metaSM = []')) {
    code = code.replace(
      'export default function MetaSMView({\n  metaSM,\n  onToast,\n}: {\n  metaSM: MetaSM[];',
      'export default function MetaSMView({\n  metaSM = [],\n  onToast,\n}: {\n  metaSM?: MetaSM[];'
    );
    fs.writeFileSync(file, code);
  }
}
patch('src/components/MetaSMView.tsx');

function patchCursos(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('metaCursos = []')) {
    code = code.replace(
      'export default function MetaCursosView({\n  metaCursos,\n  onToast,\n}: {\n  metaCursos: MetaCurso[];',
      'export default function MetaCursosView({\n  metaCursos = [],\n  onToast,\n}: {\n  metaCursos?: MetaCurso[];'
    );
    fs.writeFileSync(file, code);
  }
}
patchCursos('src/components/MetaCursosView.tsx');
