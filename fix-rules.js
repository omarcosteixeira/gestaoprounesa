const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const collectionsToFix = [
  'qg_ligacoes', 'controle_concorrencia', 'campanhas', 'bom_dia', 'forecast',
  'planner', 'periodo_captacao', 'linksUteis', 'bases'
];

for (const col of collectionsToFix) {
  const regex = new RegExp(`match \\/artifacts\\/gestaopro-761e1\\/public\\/data\\/${col}\\/\\{id\\} \\{\\s*allow read, write: if isPrincipal\\(\\) \\|\\| isComercial\\(\\);\\s*\\}`);
  if (rules.match(regex)) {
    rules = rules.replace(regex, `match /artifacts/gestaopro-761e1/public/data/${col}/{id} {\n      allow read: if isAuthenticated();\n      allow write: if isPrincipal() || isComercial() || isSSA();\n    }`);
  }
}

// For bases which has allow read, create, update: if isPrincipal() || isComercial();
rules = rules.replace(/match \/artifacts\/gestaopro-761e1\/public\/data\/bases\/\{baseId\} \{\s*allow read, create, update: if isPrincipal\(\) \|\| isComercial\(\);\s*allow delete: if isPrincipal\(\) \|\| isComercial\(\);\s*\}/,
  `match /artifacts/gestaopro-761e1/public/data/bases/{baseId} {\n      allow read: if isAuthenticated();\n      allow create, update, delete: if isPrincipal() || isComercial();\n    }`);

fs.writeFileSync('firestore.rules', rules);
