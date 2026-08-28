const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const search = `                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase">Semestre {m.semestre}</p>
                  <p className="text-lg font-black text-slate-900">{m.realizado}</p>
                  <p className="text-xs text-slate-400">Realizado SM</p>
                </div>`;

const replace = `                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Semestre {m.semestre}</p>
                    <p className="text-lg font-black text-slate-900">{m.realizado}</p>
                    <p className="text-xs text-slate-400">Realizado SM</p>
                  </div>
                  <div className="w-full text-right mt-2 pt-2 border-t border-slate-200">
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                      Atualizado: {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : m.createdAt ? new Date(m.createdAt).toLocaleDateString("pt-BR") : "-"}
                    </p>
                  </div>
                </div>`;

code = code.replace(search, replace);

fs.writeFileSync('src/App.tsx', code);
console.log("Success Meta SM dates");
