import fs from 'fs';
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

code = code.replace(
  /"Pendência": item\.pendencia \|\| "",/g,
  '"Pendência": item.pendencia || "",\n      "Multa": item.multa || "",\n      "Instituição Destino": item.instituicaoDestino || "",'
);

code = code.replace(
  /pendencia: String\(row\["Pendência"\] \|\| ""\),/g,
  'pendencia: String(row["Pendência"] || ""),\n            multa: String(row["Multa"] || ""),\n            instituicaoDestino: String(row["Instituição Destino"] || row["Instituição destino"] || ""),'
);

// Clear form after submit, just to be sure
code = code.replace(
  /pendencia: "",/g,
  'pendencia: "",\n      multa: "",\n      instituicaoDestino: "",'
);

fs.writeFileSync('src/components/EvasaoView.tsx', code);
