const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Inject state
const dashboardAnchor = '  const [isCustomizing, setIsCustomizing] = useState(false);';
const dashboardReplacement = '  const [isCustomizing, setIsCustomizing] = useState(false);\n  const [linksSearchTerm, setLinksSearchTerm] = useState("");';

if (code.includes(dashboardAnchor)) {
  code = code.replace(dashboardAnchor, dashboardReplacement);
}

// Inject filter and search UI
const renderAnchor = `      {widgets.links && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">Links Úteis</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {links.map((link) => (`;

const renderReplacement = `      {widgets.links && (
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h3 className="text-xl font-bold text-slate-900">Links Úteis</h3>
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Buscar links..."
                value={linksSearchTerm}
                onChange={(e) => setLinksSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {links
              .filter(link => 
                !linksSearchTerm || 
                link.nome.toLowerCase().includes(linksSearchTerm.toLowerCase()) || 
                link.url.toLowerCase().includes(linksSearchTerm.toLowerCase()) || 
                (link.local && link.local.toLowerCase().includes(linksSearchTerm.toLowerCase()))
              )
              .map((link) => (`;

if (code.includes(renderAnchor)) {
  code = code.replace(renderAnchor, renderReplacement);
  console.log("Patched links filter in DashboardView");
} else {
  console.log("Could not find renderAnchor in DashboardView");
}

fs.writeFileSync('src/App.tsx', code, 'utf8');
