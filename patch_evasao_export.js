import fs from 'fs';
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

const fields = `
      "Tipo de Solicitação": item.tipoSolicitacao || "",
      "Observação": item.observacao || "",
      "Parcela Leve": item.parcelaLeve || "",
      "Mensalidades": item.mensalidades || "",
      "Parcelamento": item.parcelamento || ""
`;

code = code.replace(
  /\s*"Tipo de Solicitação": item\.tipoSolicitacao \|\| "",\s*"Observação": item\.observacao \|\| ""/,
  fields
);

fs.writeFileSync('src/components/EvasaoView.tsx', code);
