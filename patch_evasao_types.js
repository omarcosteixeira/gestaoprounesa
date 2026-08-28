import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');

const replacement = `
  parcelamento?: string;
  instituicaoDestino?: string;
  multa?: string;
`;
code = code.replace(/\s*parcelamento\?: string;/, replacement);

fs.writeFileSync('src/types.ts', code);
