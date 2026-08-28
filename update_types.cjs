const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const oldMeta = `export interface MetaCurso {
  id: string;
  semestre: string;
  curso: string;
  metaAA: number;
  metaDia: number;
  metaFinal: number;
  realizado: number;
  createdAt?: any;
}`;

const newMeta = `export interface MetaCursoMetrics {
  metaAA: number;
  metaDia: number;
  metaFinal: number;
  realizado: number;
}

export interface MetaCurso {
  id: string;
  semestre: string;
  curso: string;
  inscritos?: MetaCursoMetrics;
  financeiro?: MetaCursoMetrics;
  academico?: MetaCursoMetrics;
  // Legacy fields
  metaAA?: number;
  metaDia?: number;
  metaFinal?: number;
  realizado?: number;
  createdAt?: any;
}`;

code = code.replace(oldMeta, newMeta);
fs.writeFileSync('src/types.ts', code);
console.log("Updated types.ts");
