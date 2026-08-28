import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '  relatorios: [\\n    ROLES.ADMIN_MASTER,\\n    ROLES.LIDER_FDV,\\n    ROLES.GESTOR_UNIDADE,\\n    ROLES.GESTOR_COMERCIAL,\\n    ROLES.GESTOR_COMERCIAL_COMERCIAL,\\n  ],',
  '  relatorios: [\\n    ROLES.ADMIN_MASTER,\\n    ROLES.LIDER_FDV,\\n    ROLES.GESTOR_UNIDADE,\\n    ROLES.GESTOR_COMERCIAL,\\n    ROLES.GESTOR_COMERCIAL_COMERCIAL,\\n    ROLES.QG,\\n    ROLES.SALA_MATRICULA,\\n    ROLES.FDV,\\n    ROLES.PROMOTOR,\\n    ROLES.PROMOTOR_RUA,\\n    ROLES.FDV_COMERCIAL,\\n  ],'
);
fs.writeFileSync('src/App.tsx', code);
