import fs from 'fs';
let code = fs.readFileSync('src/components/ControleInsumosView.tsx', 'utf8');

code = code.replace(
  /<div className="flex flex-wrap gap-1\.5 p-1 bg-slate-150 rounded-2xl w-full sm:w-fit">[\s\S]*?{activeTab === "compras" &&/g,
  (match) => {
    return match
      .replace('<button\n          onClick={() => setActiveTab("pedidos")}', '{profile.role !== "Gestor Unidade" && <button\n          onClick={() => setActiveTab("pedidos")}')
      .replace('<span>Controle de Pedidos</span>\n        </button>', '<span>Controle de Pedidos</span>\n        </button>}')
      .replace('<button\n          onClick={() => setActiveTab("estoque")}', '{profile.role !== "Gestor Unidade" && <button\n          onClick={() => setActiveTab("estoque")}')
      .replace('<span>Estoque (Itens)</span>\n        </button>', '<span>Estoque (Itens)</span>\n        </button>}')
      .replace('<button\n          onClick={() => setActiveTab("compras")}', '{profile.role !== "Gestor Unidade" && <button\n          onClick={() => setActiveTab("compras")}')
      .replace('<span>Ordens de Compra</span>\n        </button>', '<span>Ordens de Compra</span>\n        </button>}');
  }
);

fs.writeFileSync('src/components/ControleInsumosView.tsx', code);
