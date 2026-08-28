import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  MessageSquare,`;
const replacement = `  MessageSquare,\n  PhoneOutgoing,`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
