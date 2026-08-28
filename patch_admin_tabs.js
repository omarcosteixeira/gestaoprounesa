import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-200 pb-4 mb-6 scrollbar-hide">
        {[
          { id: "usuarios", label: "Usuários", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "funcionarios", label: "Funcionários (Insumos)", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "folgas", label: "Folgas e Férias", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)", "Gestor Unidade"] },
          { id: "bomDia", label: "Bom Dia Captação", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "forecast", label: "Forecast", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)", "Gestor Unidade"] },
          { id: "metaDia", label: "Meta Dia", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "qgLigacoes", label: "QG Ligações", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "planner", label: "Planner da Semana", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "periodo", label: "Período da Captação", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "whatsapp", label: "Gestão WhatsApp", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "treinamento", label: "Treinamento Bot", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "links", label: "Links Úteis", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)", "Gestor Unidade"] },
          { id: "logo", label: "Logotipo do Login", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)"] },
          { id: "formularios", label: "Formulários", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)", "Gestor Unidade"] },
          { id: "crescimentoAnual", label: "Crescimento Anual", roles: ["Admin Master", "Líder/FDV", "Gestor Comercial", "Gerente Comercial (Comercial)", "Gestor Unidade"] },
          { id: "backup", label: "Backup e Segurança", roles: ["Admin Master"] },
        ].filter(t => !t.roles || t.roles.includes(profile?.role || "")).map((tab) => (
`;

code = code.replace(
  /<div className="flex overflow-x-auto space-x-2 border-b border-slate-200 pb-4 mb-6 scrollbar-hide">\s*\{\[\s*\{ id: "usuarios"[\s\S]*?\]\.map\(\(tab\) => \(/,
  replacement.trim()
);

fs.writeFileSync('src/App.tsx', code);
