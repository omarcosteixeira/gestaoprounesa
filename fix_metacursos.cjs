const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const old1 = `<span className="font-bold text-blue-600">{m.metaDia - m.realizado}</span>`;
const new1 = `<span className="font-bold">{(() => {
                      const gap = (m.realizado || 0) - (m.metaDia || 0);
                      return <span className={gap > 0 ? "text-emerald-600" : gap < 0 ? "text-rose-600" : "text-slate-600"}>{gap > 0 ? "+" : ""}{gap}</span>;
                    })()}</span>`;

const old2 = `<span className="font-bold text-emerald-600">{m.metaAA - m.realizado}</span>`;
const new2 = `<span className="font-bold">{(() => {
                      const gap = (m.realizado || 0) - (m.metaAA || 0);
                      return <span className={gap > 0 ? "text-emerald-600" : gap < 0 ? "text-rose-600" : "text-slate-600"}>{gap > 0 ? "+" : ""}{gap}</span>;
                    })()}</span>`;

const old3 = `<span className="font-bold text-purple-600">{m.metaFinal - m.realizado}</span>`;
const new3 = `<span className="font-bold">{(() => {
                      const gap = (m.realizado || 0) - (m.metaFinal || 0);
                      return <span className={gap > 0 ? "text-emerald-600" : gap < 0 ? "text-rose-600" : "text-slate-600"}>{gap > 0 ? "+" : ""}{gap}</span>;
                    })()}</span>`;

code = code.replace(old1, new1);
code = code.replace(old2, new2);
code = code.replace(old3, new3);

fs.writeFileSync('src/App.tsx', code);
console.log("Success Cursos");
