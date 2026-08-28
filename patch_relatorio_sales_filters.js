import fs from 'fs';
let code = fs.readFileSync('src/components/RelatorioSales.tsx', 'utf8');

// Add states for curso and origem filters
code = code.replace(
  '  const [endDate, setEndDate] = useState("");',
  '  const [endDate, setEndDate] = useState("");\n  const [cursoFilter, setCursoFilter] = useState("");\n  const [origemFilter, setOrigemFilter] = useState("");'
);

// Update filteredData logic to include these filters
code = code.replace(
  '      if (endDate && date > new Date(endDate + "T23:59:59")) return false;\n      return true;',
  '      if (endDate && date > new Date(endDate + "T23:59:59")) return false;\n      if (cursoFilter && contact.curso !== cursoFilter) return false;\n      if (origemFilter && contact.origem !== origemFilter) return false;\n      return true;'
);

// Calculate unique list of courses and origens before filtering
const targetUnique = `  const filteredData = useMemo(() => {`;
const replacementUnique = `  const uniqueCursos = useMemo(() => Array.from(new Set(salesContacts.map(c => c.curso || 'Não informado'))).sort(), [salesContacts]);
  const uniqueOrigens = useMemo(() => Array.from(new Set(salesContacts.map(c => c.origem || 'Desconhecido'))).sort(), [salesContacts]);

  const filteredData = useMemo(() => {`;
code = code.replace(targetUnique, replacementUnique);

// Add the filter elements to UI
const targetUI = `        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 h-[42px]"
        >`;
const replacementUI = `        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Curso
          </label>
          <select
            value={cursoFilter}
            onChange={(e) => setCursoFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Todos os Cursos</option>
            {uniqueCursos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Origem (Base)
          </label>
          <select
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Todas as Bases</option>
            {uniqueOrigens.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setCursoFilter("");
            setOrigemFilter("");
          }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 h-[42px]"
        >`;
code = code.replace(targetUI, replacementUI);

code = code.replace('useMemo(() => {', 'useMemo(() => { // 1'); // avoid replacing wrong useMemo by making it unique in previous regex if needed... actually string replace replaces first occurrence, which is fine. Oh wait, useMemo is replaced above safely. 
// I'll just write the file.

fs.writeFileSync('src/components/RelatorioSales.tsx', code);
