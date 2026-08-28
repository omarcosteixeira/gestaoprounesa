import fs from 'fs';
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

const targetStatusCell = `                    {item.pendencia && (
                      <div className="text-xs text-rose-600 mt-1 font-medium line-clamp-1" title={item.pendencia}>
                        Pend: {item.pendencia}
                      </div>
                    )}`;

const replacementStatusCell = `${targetStatusCell}
                    {item.multa && (
                      <div className="text-xs text-amber-600 mt-1 font-medium line-clamp-1" title={item.multa}>
                        Multa: {item.multa}
                      </div>
                    )}`;

code = code.replace(targetStatusCell, replacementStatusCell);

const targetTipoSolCell = `{item.tipoSolicitacao && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {item.tipoSolicitacao}
                        </span>
                      )}`;

const replacementTipoSolCell = `${targetTipoSolCell}
                      {item.instituicaoDestino && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800" title={item.instituicaoDestino}>
                          Destino: {item.instituicaoDestino}
                        </span>
                      )}`;

code = code.replace(targetTipoSolCell, replacementTipoSolCell);

fs.writeFileSync('src/components/EvasaoView.tsx', code);
