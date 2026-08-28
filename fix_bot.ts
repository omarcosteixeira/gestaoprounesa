import * as fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const t = `<div className="flex items-center justify-between">
                              <div className="font-bold text-slate-700 text-lg">{botNumber}</div>
                              <span className={\`px-2 py-1 rounded-full text-xs font-bold \${info?.status === 'online' ? 'bg-green-100 text-green-700' : info?.status === 'pairing' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}\`}>
                                 {info?.status?.toUpperCase() || 'DESCONHECIDO'}
                              </span>
                            </div>`;

const repl = `<div className="flex items-center justify-between">
                              <div className="font-bold text-slate-700 text-lg">{botNumber}</div>
                              <div className="flex items-center space-x-2">
                                <span className={\`px-2 py-1 rounded-full text-xs font-bold \${info?.status === 'online' ? 'bg-green-100 text-green-700' : info?.status === 'pairing' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}\`}>
                                   {info?.status?.toUpperCase() || 'DESCONHECIDO'}
                                </span>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(\`Tem certeza que deseja apagar a sessão do bot \${botNumber}?\`)) {
                                      try {
                                        const cleanUrl = botConfig.url?.endsWith('/') ? botConfig.url.slice(0, -1) : botConfig.url;
                                        if (!cleanUrl) return;
                                        const res = await fetch(\`\${cleanUrl}/api/reset\`, {
                                           method: 'POST',
                                           headers: { 'Content-Type': 'application/json' },
                                           body: JSON.stringify({ botNumber })
                                        });
                                        if (res.ok) {
                                          onToast(\`Sessão \${botNumber} apagada.\`);
                                          setTimeout(async () => {
                                            try {
                                              const resStatus = await fetch(\`\${cleanUrl}/api/status\`);
                                              if (resStatus.ok) {
                                                 const data = await resStatus.json();
                                                 setBotStatuses(data.bots || {});
                                              }
                                            } catch(e) {}
                                          }, 1000);
                                        } else {
                                          onToast(\`Erro ao apagar sessão \${botNumber}.\`, 'error');
                                        }
                                      } catch (e) {
                                        onToast('Erro de rede ao apagar sessão', 'error');
                                      }
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 px-2 py-1 bg-red-50 rounded-lg transition"
                                  title="Apagar sessão do Railway"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>`;

code = code.replace(t, repl);
fs.writeFileSync('src/App.tsx', code);
console.log('done');
