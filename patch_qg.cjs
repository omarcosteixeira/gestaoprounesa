const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. useState
code = code.replace(
  /const \[newQgLigacao, setNewQgLigacao\] = useState\(\{[\s\S]*?\}\);/,
  `const [newQgLigacao, setNewQgLigacao] = useState<{nome: string, diaSemana: string[], horario: string}>({
    nome: "",
    diaSemana: [],
    horario: "",
  });`
);

// 2. handleAddQgLigacao - clear after add/edit
code = code.replace(
  /setNewQgLigacao\(\{\s*nome: "",\s*diaSemana: "",\s*horario: "",\s*\}\);/g,
  `setNewQgLigacao({
        nome: "",
        diaSemana: [],
        horario: "",
      });`
);

// 3. setEditingQgLigacao(item) -> handle Array or string
code = code.replace(
  /setNewQgLigacao\(\{\s*nome: item\.nome,\s*diaSemana: item\.diaSemana,\s*horario: item\.horario,\s*\}\);/g,
  `setNewQgLigacao({
                                nome: item.nome,
                                diaSemana: Array.isArray(item.diaSemana) ? item.diaSemana : (item.diaSemana ? [item.diaSemana] : []),
                                horario: item.horario,
                              });`
);

// 4. In the form, replace the select with multiple checkboxes
const formSelectRegex = /<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">\s*Dia da Semana\s*<\/label>\s*<select[\s\S]*?<\/select>/;

const checkboxes = `
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Dias da Semana
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"].map((dia) => (
                      <label key={dia} className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={newQgLigacao.diaSemana.includes(dia)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewQgLigacao({ ...newQgLigacao, diaSemana: [...newQgLigacao.diaSemana, dia] });
                            } else {
                              setNewQgLigacao({ ...newQgLigacao, diaSemana: newQgLigacao.diaSemana.filter(d => d !== dia) });
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-xs font-semibold text-slate-700">{dia}</span>
                      </label>
                    ))}
                  </div>
`;

code = code.replace(formSelectRegex, checkboxes);

// 5. Card render: {qg.diaSemana}
code = code.replace(
  /\{qg\.diaSemana\}/g,
  `{Array.isArray(qg.diaSemana) ? qg.diaSemana.join(", ") : qg.diaSemana}`
);

// 6. Table render: {item.diaSemana}
code = code.replace(
  /\{item\.diaSemana\}/g,
  `{Array.isArray(item.diaSemana) ? item.diaSemana.join(", ") : item.diaSemana}`
);

fs.writeFileSync('src/App.tsx', code);
