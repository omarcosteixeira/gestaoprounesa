const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const search = `                        <span className="text-xs font-bold text-slate-800">
                          {diasRestantes}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>`;

const replace = `                        <span className="text-xs font-bold text-slate-800">
                          {diasRestantes}
                        </span>
                      </div>
                      <div className="w-full text-right mt-2 pt-2 border-t border-slate-200/60">
                        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                          Atualizado: {f.createdAt?.seconds ? new Date(f.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : f.createdAt ? new Date(f.createdAt).toLocaleDateString("pt-BR") : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>`;

code = code.replace(search, replace);

fs.writeFileSync('src/App.tsx', code);
console.log("Success Forecasts");
