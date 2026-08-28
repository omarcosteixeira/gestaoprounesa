import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                  solicitacoesManutencao={solicitacoesManutencao}`;
const replacement = `                  solicitacoesManutencao={solicitacoesManutencao}
                  salesContacts={salesContacts}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
