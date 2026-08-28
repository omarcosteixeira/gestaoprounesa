const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const search = `                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>`;

const replace = `                  </table>
                </div>
                <div className="bg-slate-100 p-2 text-right">
                  <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                    Atualizado: {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : m.createdAt ? new Date(m.createdAt).toLocaleDateString("pt-BR") : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>`;

code = code.replace(search, replace);

fs.writeFileSync('src/App.tsx', code);
console.log("Success Meta Cursos dates");
