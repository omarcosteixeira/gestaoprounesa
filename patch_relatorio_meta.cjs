const fs = require('fs');
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

// Add state variables
code = code.replace(
  'const [ligacoesSearchTerm, setLigacoesSearchTerm] = useState("");',
  'const [ligacoesSearchTerm, setLigacoesSearchTerm] = useState("");\n  const [metaDiaDataInicio, setMetaDiaDataInicio] = useState("");\n  const [metaDiaDataFim, setMetaDiaDataFim] = useState("");'
);

// Update useMemo for metaDiaStats
const anchor1 = `  const metaDiaStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];`;

const replacement1 = `  const metaDiaStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];`;

const anchor2 = `    const allTime = reduceMeta(metaDia);
    const weekly = reduceMeta(metaDia.filter(m => m.data >= oneWeekAgo));
    const monthly = reduceMeta(metaDia.filter(m => m.data >= oneMonthAgo));

    return { allTime, weekly, monthly };
  }, [metaDia]);`;

const replacement2 = `    const allTime = reduceMeta(metaDia);
    const weekly = reduceMeta(metaDia.filter(m => m.data >= oneWeekAgo));
    const monthly = reduceMeta(metaDia.filter(m => m.data >= oneMonthAgo));

    let filteredForCustom = metaDia;
    if (metaDiaDataInicio) {
      filteredForCustom = filteredForCustom.filter(m => m.data >= metaDiaDataInicio);
    }
    if (metaDiaDataFim) {
      filteredForCustom = filteredForCustom.filter(m => m.data <= metaDiaDataFim);
    }
    const custom = reduceMeta(filteredForCustom);

    return { allTime, weekly, monthly, custom };
  }, [metaDia, metaDiaDataInicio, metaDiaDataFim]);`;

code = code.replace(anchor2, replacement2);

// Add the filter UI and the custom period in the view
const anchor3 = `        {activeTab === "metaDia" && (
          <div className="space-y-12">
            {[
              { title: "Geral (Todo o Período)", stats: metaDiaStats.allTime },
              { title: "Mensal (Últimos 30 Dias)", stats: metaDiaStats.monthly },
              { title: "Semanal (Últimos 7 Dias)", stats: metaDiaStats.weekly }
            ].map(section => (`;

const replacement3 = `        {activeTab === "metaDia" && (
          <div className="space-y-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">Filtro Customizado</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="date"
                    value={metaDiaDataInicio}
                    onChange={e => setMetaDiaDataInicio(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1"
                  />
                  <span className="text-slate-400">até</span>
                  <input
                    type="date"
                    value={metaDiaDataFim}
                    onChange={e => setMetaDiaDataFim(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1"
                  />
                </div>
                {(metaDiaDataInicio || metaDiaDataFim) && (
                  <button
                    onClick={() => { setMetaDiaDataInicio(""); setMetaDiaDataFim(""); }}
                    className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {[
              { title: "Personalizado", stats: metaDiaStats.custom },
              { title: "Geral (Todo o Período)", stats: metaDiaStats.allTime },
              { title: "Mensal (Últimos 30 Dias)", stats: metaDiaStats.monthly },
              { title: "Semanal (Últimos 7 Dias)", stats: metaDiaStats.weekly }
            ].map(section => (`;

code = code.replace(anchor3, replacement3);

fs.writeFileSync('src/components/RelatoriosView.tsx', code, 'utf8');
console.log("Successfully patched relatorios meta dia.");
