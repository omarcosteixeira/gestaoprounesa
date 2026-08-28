const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `                            calc: (m: keyof BomDiaMetrics) =>
                              card.real && card.metaDia
                                ? card.real[m] - card.metaDia[m]
                                : 0,`,
  `                            calc: (m: keyof BomDiaMetrics) => {
                              if (!card.real || !card.metaDia) return 0;
                              const val = card.real[m] - card.metaDia[m];
                              return val > 0 ? \`+\${val}\` : val;
                            },`
);

code = code.replace(
  `                            calc: (m: keyof BomDiaMetrics) =>
                              card.real && card.anoAnterior
                                ? card.real[m] - card.anoAnterior[m]
                                : 0,`,
  `                            calc: (m: keyof BomDiaMetrics) => {
                              if (!card.real || !card.anoAnterior) return 0;
                              const val = card.real[m] - card.anoAnterior[m];
                              return val > 0 ? \`+\${val}\` : val;
                            },`
);

code = code.replace(
  `                            calc: (m: keyof BomDiaMetrics) =>
                              card.real && card.metaFinal
                                ? card.real[m] - card.metaFinal[m]
                                : 0,`,
  `                            calc: (m: keyof BomDiaMetrics) => {
                              if (!card.real || !card.metaFinal) return 0;
                              const val = card.real[m] - card.metaFinal[m];
                              return val > 0 ? \`+\${val}\` : val;
                            },`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
