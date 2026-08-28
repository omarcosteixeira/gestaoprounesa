import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// uniqueStatuses
code = code.replace(
  /"Não Interessado",\s*"Convertido",\s*\];/,
  '"Não Interessado",\n    "Convertido",\n    "Contato via Sales",\n  ];'
);

// statusGroups (Leads)
code = code.replace(
  /"Não Interessado": 0,\s*};\s*filteredLeads.forEach/,
  '"Não Interessado": 0,\n      "Contato via Sales": 0,\n    };\n    filteredLeads.forEach'
);

// statusGroups (Bases)
code = code.replace(
  /"Sem retorno": 0,\s*};\s*bases.forEach/,
  '"Sem retorno": 0,\n      "Contato via Sales": 0,\n    };\n    bases.forEach'
);

// stats styling in Leads
code = code.replace(
  /s\.name === "Sem retorno" && "bg-slate-400",/g,
  's.name === "Sem retorno" && "bg-slate-400",\n                            s.name === "Contato via Sales" && "bg-purple-400",'
);

// stats styling in Bases
code = code.replace(
  /s\.name === "Sem retorno" && "bg-orange-400",/g,
  's.name === "Sem retorno" && "bg-orange-400",\n                              s.name === "Contato via Sales" && "bg-purple-400",'
);

// Table select in Leads
code = code.replace(
  /lead\.status === "Sem retorno"\s*\?\s*"bg-slate-100 text-slate-600"/,
  'lead.status === "Sem retorno"\n                                    ? "bg-slate-100 text-slate-600"\n                                    : lead.status === "Contato via Sales" ? "bg-purple-100 text-purple-600"'
);

// Table select in Bases
code = code.replace(
  /entry\.status === "Sem retorno" &&\s*"bg-orange-100 text-orange-600",/g,
  'entry.status === "Sem retorno" &&\n                            "bg-orange-100 text-orange-600",\n                          entry.status === "Contato via Sales" &&\n                            "bg-purple-100 text-purple-600",'
);

// All <option> replacements
code = code.replace(
  /<option value="Sem retorno">Sem retorno<\/option>/g,
  '<option value="Sem retorno">Sem retorno</option>\n<option value="Contato via Sales">Contato via Sales</option>'
);

fs.writeFileSync('src/App.tsx', code);
