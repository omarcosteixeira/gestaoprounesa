const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      {activeTab === "metaDia" && (
        <MetaDiaView metaDia={metaDia} onToast={onToast} />
      )}`;
const replacement = `      {activeTab === "metaDia" && (
        <MetaDiaView metaDia={metaDia} onToast={onToast} />
      )}
      {activeTab === "metaSM" && (
        <MetaSMView metaSM={metaSM} onToast={onToast} />
      )}
      {activeTab === "metaCursos" && (
        <MetaCursosView metaCursos={metaCursos} onToast={onToast} />
      )}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
