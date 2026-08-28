import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');

const target = `export interface Lead {`;
const replacement = `export interface SalesContact {
  id: string;
  contactId: string;
  nome: string;
  telefone: string;
  curso: string;
  origem: string;
  createdAt: any;
}

export interface Lead {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/types.ts', code);
