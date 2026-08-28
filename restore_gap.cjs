const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(/export interface GapEntry \{[\s\S]*?createdAt: any;\n\}/g, `export interface GapEntry {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  produto: string;
  numeroOportunidade: string;
  curso: string;
  semestre?: string;
  metodologia: string;
  formaIngresso: string;
  periodo: string;
  numeroMatricula: string;
  matAcad: string;
  documentos: string;
  acaoId?: string;
  acao?: any;
  status: string;
  createdAt: any;
}`);

fs.writeFileSync('src/types.ts', code);
console.log("Success");
