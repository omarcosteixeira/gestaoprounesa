import fs from 'fs';
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

// Replace Pendência input with select
code = code.replace(
  /<label className="block text-sm font-bold text-slate-700 mb-1">Pendência<\/label>\s*<input\s*type="text"\s*value=\{formData\.pendencia \|\| ""\}\s*onChange=\{e => setFormData\(\{\.\.\.formData, pendencia: e\.target\.value\}\)\}\s*className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"\s*\/>/g,
  `<label className="block text-sm font-bold text-slate-700 mb-1">Pendência</label>
                    <select
                      value={formData.pendencia || ""}
                      onChange={e => setFormData({...formData, pendencia: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>`
);

// Add Instituição Destino if Transferência externa
const targetTipoSol = `                      <option value="Transferência externa">Transferência externa</option>
                    </select>
                  </div>`;
const replacementTipoSol = `${targetTipoSol}
                  {formData.tipoSolicitacao === 'Transferência externa' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Instituição Destino</label>
                      <input
                        type="text"
                        value={formData.instituicaoDestino || ""}
                        onChange={e => setFormData({...formData, instituicaoDestino: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}`;
code = code.replace(targetTipoSol, replacementTipoSol);

// Add Multa after Pendência
const targetPendencia = `                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Resultado</label>`;
const replacementPendencia = `                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Multa</label>
                    <select
                      value={formData.multa || ""}
                      onChange={e => setFormData({...formData, multa: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Resultado</label>`;
code = code.replace(targetPendencia, replacementPendencia);

fs.writeFileSync('src/components/EvasaoView.tsx', code);
