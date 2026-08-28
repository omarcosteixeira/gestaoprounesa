const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const search = `                <div className="text-xs text-slate-500 font-medium bg-emerald-100/50 px-2 py-1 rounded-md mt-2">
                  {qg.horario}
                </div>
              </div>`;

const replace = `                <div className="text-xs text-slate-500 font-medium bg-emerald-100/50 px-2 py-1 rounded-md mt-2">
                  {qg.horario}
                </div>
                <div className="w-full text-right mt-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                    Atualizado: {qg.createdAt?.seconds ? new Date(qg.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : qg.createdAt ? new Date(qg.createdAt).toLocaleDateString("pt-BR") : "-"}
                  </span>
                </div>
              </div>`;

code = code.replace(search, replace);

fs.writeFileSync('src/App.tsx', code);
console.log("Success QG Ligações");
