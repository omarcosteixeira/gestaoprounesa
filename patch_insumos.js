import fs from 'fs';
let code = fs.readFileSync('src/components/ControleInsumosView.tsx', 'utf8');

code = code.replace(
  '        if (profile.role === "Gestor Unidade") {\n          if (!profile.unidade || p.unidade !== profile.unidade) {\n            return false;\n          }\n        }',
  ''
);
// Also replacing it more robustly just in case formatting is slightly different
code = code.replace(
  /if \(profile\.role === "Gestor Unidade"\) \{\s*if \(\!profile\.unidade \|\| p\.unidade !== profile\.unidade\) \{\s*return false;\s*\}\s*\}/,
  ''
);

fs.writeFileSync('src/components/ControleInsumosView.tsx', code);
