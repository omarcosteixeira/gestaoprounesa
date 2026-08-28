const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `                        <span
                          className={\`text-xs font-bold \${gapFech >= 0 ? "text-emerald-600" : "text-rose-600"}\`}
                        >
                          {gapFech >= 0 ? "+" : ""}
                          {gapFech}
                        </span>`,
  `                        <span
                          className={\`text-xs font-bold \${gapFech > 0 ? "text-emerald-600" : gapFech < 0 ? "text-rose-600" : "text-slate-600"}\`}
                        >
                          {gapFech > 0 ? "+" : ""}
                          {gapFech}
                        </span>`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
