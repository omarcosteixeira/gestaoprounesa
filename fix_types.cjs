const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const mapaoTarget = `export interface MapaoAcademicoEntry {
  id: string;
  modalidade: string;
  curso: string;
  periodo: string;
  tipoCurso: 'GRADUACAO' | 'TECNICO';
  disciplinas: MapaoDisciplina[];
  createdAt: any;
}`;
const mapaoReplacement = `export interface MapaoAcademicoEntry {
  id: string;
  modalidade: string;
  curso: string;
  periodo: string;
  semestre?: string;
  tipoCurso: 'GRADUACAO' | 'TECNICO';
  disciplinas: MapaoDisciplina[];
  createdAt: any;
}`;
code = code.replace(mapaoTarget, mapaoReplacement);

const gapTarget = `export interface GapEntry {
  id: string;
  modalidade: string;
  curso: string;
  periodo: string;
  tipoCurso: 'GRADUACAO' | 'TECNICO';
  gaps: any[];
  createdAt: any;
}`;
const gapReplacement = `export interface GapEntry {
  id: string;
  modalidade: string;
  curso: string;
  periodo: string;
  semestre?: string;
  tipoCurso: 'GRADUACAO' | 'TECNICO';
  gaps: any[];
  createdAt: any;
}`;
if (code.includes(gapTarget)) {
    code = code.replace(gapTarget, gapReplacement);
} else {
    // try a fuzzy match
    code = code.replace(/export interface GapEntry \{[\s\S]*?createdAt: any;\n\}/g, gapReplacement);
}

fs.writeFileSync('src/types.ts', code);
console.log("Success");
