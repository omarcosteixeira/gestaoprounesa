const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                          {disc.semestre ? \` (\${disc.semestre})\` : ""}`;
code = code.replaceAll(target1, "");

const target2 = `                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Semestre
                          </label>
                          <select
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                            value={disc.semestre || ""}
                            onChange={(e) =>
                              handleChangeDisciplina(
                                idx,
                                "semestre",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">Selecione...</option>
                            <option value="1º">1º</option>
                            <option value="2º">2º</option>
                            <option value="3º">3º</option>
                            <option value="4º">4º</option>
                            <option value="5º">5º</option>
                            <option value="6º">6º</option>
                            <option value="7º">7º</option>
                            <option value="8º">8º</option>
                            <option value="9º">9º</option>
                            <option value="10º">10º</option>
                          </select>
                        </div>`;
code = code.replaceAll(target2, "");

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
