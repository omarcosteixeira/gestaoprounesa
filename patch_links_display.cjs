const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const renderAnchor = `              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
              >
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ExternalLink size={18} />
                </div>
                <span className="font-bold text-slate-700 truncate">
                  {link.nome}
                </span>
              </a>`;

const renderReplacement = `              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
              >
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                  <ExternalLink size={18} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-slate-700 truncate">
                    {link.nome}
                  </span>
                  {link.local && (
                    <span className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">
                      {link.local}
                    </span>
                  )}
                </div>
              </a>`;

if (code.includes(renderAnchor)) {
  code = code.replace(renderAnchor, renderReplacement);
  console.log("Patched links display in DashboardView");
} else {
  console.log("Could not find renderAnchor in DashboardView");
}

fs.writeFileSync('src/App.tsx', code, 'utf8');
