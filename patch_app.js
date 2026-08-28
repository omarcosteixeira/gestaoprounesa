import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1
code = code.replace(
  '                          {lead.status === "Convertido" && (\n                            <button\n                              onClick={() => handleMoveToGap(lead)}',
  '                          {lead.status === "Convertido" && !invalidLeadIds.has(lead.id) && (\n                            <button\n                              onClick={() => handleMoveToGap(lead)}'
);

// 2
code = code.replace(
  '      if (status === "Convertido") {\n        // Logic for transferring to GAP',
  '      if (status === "Convertido" && !invalidBaseIds.has(entry.id)) {\n        // Logic for transferring to GAP'
);

// 3
code = code.replace(
  '      if (\n        editFormData.status === "Convertido" &&\n        editingCandidate.status !== "Convertido"\n      ) {',
  '      if (\n        editFormData.status === "Convertido" &&\n        editingCandidate.status !== "Convertido" &&\n        !invalidBaseIds.has(editingCandidate.id)\n      ) {'
);

fs.writeFileSync('src/App.tsx', code);
