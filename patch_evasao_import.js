import fs from 'fs';
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

const fields = `
            tipoSolicitacao: String(row["Tipo de Solicitação"] || row["Tipo de solicitação"] || ""),
            observacao: String(row["Observação"] || ""),
            parcelaLeve: String(row["Parcela Leve"] || row["parcelaLeve"] || ""),
            mensalidades: String(row["Mensalidades"] || row["mensalidades"] || ""),
            parcelamento: String(row["Parcelamento"] || row["parcelamento"] || ""),
`;

code = code.replace(
  /\s*tipoSolicitacao: String\(row\["Tipo de Solicitação"\] \|\| row\["Tipo de solicitação"\] \|\| ""\),\s*observacao: String\(row\["Observação"\] \|\| ""\),/,
  fields
);

fs.writeFileSync('src/components/EvasaoView.tsx', code);
