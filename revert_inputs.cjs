const fs = require('fs');

const file = 'src/components/GapView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<select\n\s*value=\{filterCurso\}\n\s*onChange=\{\(e\) => setFilterCurso\(e\.target\.value\)\}\n\s*className="flex-1 min-w-\[130px\] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"\n\s*>\n\s*<option value="">Curso\.\.\.<\/option>\n\s*\{uniqueCursos\.map\(c => \(\n\s*<option key=\{c\} value=\{c\}>\{c\}<\/option>\n\s*\)\)\}\n\s*<\/select>/,
  `<input
              type="text"
              placeholder="Curso..."
              value={filterCurso}
              onChange={(e) => setFilterCurso(e.target.value)}
              className="flex-1 min-w-[130px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />`
);

code = code.replace(
  /<select\n\s*value=\{filterPeriodo\}\n\s*onChange=\{\(e\) => setFilterPeriodo\(e\.target\.value\)\}\n\s*className="flex-1 min-w-\[100px\] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"\n\s*>\n\s*<option value="">Período\.\.\.<\/option>\n\s*\{uniquePeriodos\.map\(p => \(\n\s*<option key=\{p\} value=\{p\}>\{p\}<\/option>\n\s*\)\)\}\n\s*<\/select>/,
  `<input
              type="text"
              placeholder="Período..."
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              className="flex-1 min-w-[100px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />`
);

fs.writeFileSync(file, code);
console.log("Inputs reverted");
