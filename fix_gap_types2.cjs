const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(/documentos\?: string \| boolean;/, 'documentos?: any;');
code = code.replace(/matAcad\?: string \| boolean;/, 'matAcad?: any;');
code = code.replace(/export interface ControleConcorrencia \{/, 'export interface GapDocs { [key: string]: boolean; }\n\nexport interface ControleConcorrencia {');

fs.writeFileSync('src/types.ts', code);
console.log("Success");
