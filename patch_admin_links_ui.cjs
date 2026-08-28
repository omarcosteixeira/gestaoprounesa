const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const uiAnchor = `          <h3 className="text-xl font-bold text-slate-900 mb-4">Links Úteis</h3>
          <form onSubmit={handleAddLink} className="flex gap-2 mb-6">
            <input
              placeholder="Nome"
              required
              value={newLink.nome}
              onChange={(e) => setNewLink({ ...newLink, nome: e.target.value })}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <input
              placeholder="URL"
              required
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all"
            >
              <Plus size={20} />
            </button>
          </form>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <span className="text-sm font-bold text-slate-700">
                  {l.nome}
                </span>
                <button
                  onClick={async () => {
                    await deleteDoc(doc(db, COLLECTIONS.LINKS, l.id));
                    onToast("Link removido.");
                  }}
                  className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>`;

const uiReplacement = `          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">Links Úteis</h3>
            {editingLink && (
              <button
                onClick={() => {
                  setEditingLink(null);
                  setNewLink({ nome: "", url: "", local: "" });
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors"
              >
                Cancelar Edição
              </button>
            )}
          </div>
          <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-2 mb-6">
            <input
              placeholder="Nome"
              required
              value={newLink.nome}
              onChange={(e) => setNewLink({ ...newLink, nome: e.target.value })}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <input
              placeholder="URL"
              required
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <input
              placeholder="Local (Opcional)"
              value={newLink.local || ""}
              onChange={(e) => setNewLink({ ...newLink, local: e.target.value })}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all font-bold flex items-center justify-center gap-2"
            >
              {editingLink ? <Save size={20} /> : <Plus size={20} />}
            </button>
          </form>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700">
                    {l.nome}
                  </span>
                  {l.local && (
                    <span className="text-xs text-slate-400 font-medium uppercase mt-1">
                      {l.local}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingLink(l);
                      setNewLink({ nome: l.nome, url: l.url, local: l.local || "" });
                    }}
                    className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-all"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={async () => {
                      await deleteDoc(doc(db, COLLECTIONS.LINKS, l.id));
                      onToast("Link removido.");
                    }}
                    className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>`;

if (code.includes(uiAnchor)) {
  code = code.replace(uiAnchor, uiReplacement);
  console.log("Patched links UI in AdminView");
} else {
  console.log("Could not find uiAnchor in AdminView");
}

fs.writeFileSync('src/App.tsx', code, 'utf8');
