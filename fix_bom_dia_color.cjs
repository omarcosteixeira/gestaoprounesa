const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `                            color: (m: keyof BomDiaMetrics) =>
                              card.real &&
                              card.metaDia &&
                              card.real[m] - card.metaDia[m] >= 0
                                ? "text-emerald-600"
                                : "text-rose-600",`,
  `                            color: (m: keyof BomDiaMetrics) => {
                              if (!card.real || !card.metaDia) return "text-slate-600";
                              const val = card.real[m] - card.metaDia[m];
                              return val > 0 ? "text-emerald-600" : (val < 0 ? "text-rose-600" : "text-slate-600");
                            },`
);

code = code.replace(
  `                            color: (m: keyof BomDiaMetrics) =>
                              card.real &&
                              card.anoAnterior &&
                              card.real[m] - card.anoAnterior[m] >= 0
                                ? "text-emerald-600"
                                : "text-rose-600",`,
  `                            color: (m: keyof BomDiaMetrics) => {
                              if (!card.real || !card.anoAnterior) return "text-slate-600";
                              const val = card.real[m] - card.anoAnterior[m];
                              return val > 0 ? "text-emerald-600" : (val < 0 ? "text-rose-600" : "text-slate-600");
                            },`
);

code = code.replace(
  `                            color: (m: keyof BomDiaMetrics) =>
                              card.real &&
                              card.metaFinal &&
                              card.real[m] - card.metaFinal[m] >= 0
                                ? "text-emerald-600"
                                : "text-rose-600",`,
  `                            color: (m: keyof BomDiaMetrics) => {
                              if (!card.real || !card.metaFinal) return "text-slate-600";
                              const val = card.real[m] - card.metaFinal[m];
                              return val > 0 ? "text-emerald-600" : (val < 0 ? "text-rose-600" : "text-slate-600");
                            },`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
