import * as fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetRow = `<td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{entry.nome}</span>
                      <span className="text-xs text-slate-500">{entry.curso}</span>
                    </div>
                  </td>`;

const replRow = `<td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{entry.nome}</span>
                      <span className="text-xs text-slate-500">{entry.curso}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        {entry.telefone && <span className="text-[10px] text-slate-400 font-bold">{entry.telefone}</span>}
                        {entry.semestre && <span className="text-[10px] text-blue-500 font-bold px-2 py-0.5 bg-blue-50 rounded-full">{entry.semestre}</span>}
                      </div>
                    </div>
                  </td>`;

code = code.split(targetRow).join(replRow);
fs.writeFileSync('src/App.tsx', code);
console.log('done');
