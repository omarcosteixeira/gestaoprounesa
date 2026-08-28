import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                        >
                          <MessageSquare size={14} />
                          <span>WhatsApp</span>
                        </button>
                      )}`;

const replacement1 = target1 + `
                      <button
                        onClick={() => handleContatoViaSales(entry, entry.nomeBase || 'Bases')}
                        className="text-sky-600 font-bold text-sm flex items-center space-x-1 hover:text-sky-700 bg-sky-50 px-2 py-1 rounded-lg ml-2"
                        title="Registrar Contato via Sales"
                      >
                        <PhoneOutgoing size={14} />
                        <span>Sales</span>
                      </button>`;


const target2 = `                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBase(entry.id)}`;

const replacement2 = `                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleContatoViaSales(entry, entry.nomeBase || 'Bases Renovação')}
                      className="text-sky-600 font-bold text-sm flex items-center space-x-1 hover:text-sky-700 bg-sky-50 px-2 py-1 rounded-lg ml-2"
                      title="Registrar Contato via Sales"
                    >
                      <PhoneOutgoing size={14} />
                      <span>Sales</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBase(entry.id)}`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);
fs.writeFileSync('src/App.tsx', code);
