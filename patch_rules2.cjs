const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  /match \/artifacts\/gestaopro-761e1\/public\/data\/fies_prouni\/\{entryId\} \{\s*allow get, list: if isAuthenticated\(\) && \(isMasterUser\(\) \|\| isComercial\(\) \|\| canAccessUnit\(resource\.data\.unidade\)\);\s*allow create, update: if \(isMasterUser\(\) \|\| isComercial\(\) \|\| isLider\(\) \|\| isSalaMatricula\(\) \|\| isSSA\(\)\) && \(isMasterUser\(\) \|\| isComercial\(\) \|\| canAccessUnit\(request\.resource\.data\.unidade\)\);\s*allow delete: if isMasterUser\(\) \|\| isComercial\(\) \|\| isLider\(\);\s*\}/,
  `match /artifacts/gestaopro-761e1/public/data/fies_prouni/{entryId} {
      allow get, list: if isAuthenticated() && (isMasterUser() || isComercial() || isSSA() || canAccessUnit(resource.data.unidade));
      allow create, update: if (isMasterUser() || isComercial() || isLider() || isSalaMatricula() || isSSA()) && (isMasterUser() || isComercial() || isSSA() || canAccessUnit(request.resource.data.unidade));
      allow delete: if isMasterUser() || isComercial() || isLider() || isSSA();
    }`
);

code = code.replace(
  /match \/artifacts\/gestaopro-761e1\/public\/data\/fies_prouni_vagas\/\{entryId\} \{\s*allow get, list: if isAuthenticated\(\) && \(isMasterUser\(\) \|\| isComercial\(\) \|\| canAccessUnit\(resource\.data\.unidade\)\);\s*allow create, update: if \(isMasterUser\(\) \|\| isComercial\(\) \|\| isLider\(\) \|\| isSalaMatricula\(\) \|\| isSSA\(\)\) && \(isMasterUser\(\) \|\| isComercial\(\) \|\| canAccessUnit\(request\.resource\.data\.unidade\)\);\s*allow delete: if isMasterUser\(\) \|\| isComercial\(\) \|\| isLider\(\);\s*\}/,
  `match /artifacts/gestaopro-761e1/public/data/fies_prouni_vagas/{entryId} {
      allow get, list: if isAuthenticated() && (isMasterUser() || isComercial() || isSSA() || canAccessUnit(resource.data.unidade));
      allow create, update: if (isMasterUser() || isComercial() || isLider() || isSalaMatricula() || isSSA()) && (isMasterUser() || isComercial() || isSSA() || canAccessUnit(request.resource.data.unidade));
      allow delete: if isMasterUser() || isComercial() || isLider() || isSSA();
    }`
);

fs.writeFileSync('firestore.rules', code, 'utf8');
console.log("Patched firestore.rules regex");
