const fs = require('fs');

const file = 'src/components/GapView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add uniqueCursos and uniquePeriodos
code = code.replace(
  /const uniqueProdutos = useMemo\(\(\) => \{\n    return Array\.from\(new Set\(gap\.map\(g => g\.produto\)\.filter\(Boolean\)\)\) as string\[\];\n  \}, \[gap\]\);/,
  `const uniqueProdutos = useMemo(() => {
    return Array.from(new Set(gap.map(g => g.produto).filter(Boolean))) as string[];
  }, [gap]);

  const uniqueCursos = useMemo(() => {
    return Array.from(new Set(gap.map(g => g.curso).filter(Boolean))) as string[];
  }, [gap]);

  const uniquePeriodos = useMemo(() => {
    return Array.from(new Set(gap.map(g => g.periodo || g.semestre).filter(Boolean))) as string[];
  }, [gap]);`
);

// Replace the Curso text input with a select
code = code.replace(
  /<input\n\s*type="text"\n\s*placeholder="Curso\.\.\."\n\s*value=\{filterCurso\}\n\s*onChange=\{\(e\) => setFilterCurso\(e\.target\.value\)\}\n\s*className="flex-1 min-w-\[130px\] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"\n\s*\/>/,
  `<select
              value={filterCurso}
              onChange={(e) => setFilterCurso(e.target.value)}
              className="flex-1 min-w-[130px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            >
              <option value="">Curso...</option>
              {uniqueCursos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>`
);

// Replace the Periodo text input with a select
code = code.replace(
  /<input\n\s*type="text"\n\s*placeholder="Período\.\.\."\n\s*value=\{filterPeriodo\}\n\s*onChange=\{\(e\) => setFilterPeriodo\(e\.target\.value\)\}\n\s*className="flex-1 min-w-\[100px\] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"\n\s*\/>/,
  `<select
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              className="flex-1 min-w-[100px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            >
              <option value="">Período...</option>
              {uniquePeriodos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>`
);

fs.writeFileSync(file, code);
console.log('Filters updated');
