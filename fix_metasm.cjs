const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldGapMetaDia = `<p className="text-lg font-black text-blue-700">{m.metaDia - m.realizado}</p>`;
const newGapMetaDia = `<p className="text-lg font-black">{(() => {
                    const gap = m.realizado - (m.metaDia || 0);
                    return <span className={gap > 0 ? "text-emerald-600" : gap < 0 ? "text-rose-600" : "text-slate-600"}>{gap > 0 ? "+" : ""}{gap}</span>;
                  })()}</p>`;

const oldGapAA = `<p className="text-lg font-black text-emerald-700">{m.metaAA - m.realizado}</p>`;
const newGapAA = `<p className="text-lg font-black">{(() => {
                    const gap = m.realizado - (m.metaAA || 0);
                    return <span className={gap > 0 ? "text-emerald-600" : gap < 0 ? "text-rose-600" : "text-slate-600"}>{gap > 0 ? "+" : ""}{gap}</span>;
                  })()}</p>`;

const oldGapFinal = `<p className="text-lg font-black text-purple-700">{m.metaFinal - m.realizado}</p>`;
const newGapFinal = `<p className="text-lg font-black">{(() => {
                    const gap = m.realizado - (m.metaFinal || 0);
                    return <span className={gap > 0 ? "text-emerald-600" : gap < 0 ? "text-rose-600" : "text-slate-600"}>{gap > 0 ? "+" : ""}{gap}</span>;
                  })()}</p>`;

code = code.replace(oldGapMetaDia, newGapMetaDia);
code = code.replace(oldGapAA, newGapAA);
code = code.replace(oldGapFinal, newGapFinal);

fs.writeFileSync('src/App.tsx', code);
console.log("Success SM");
