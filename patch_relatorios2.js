import fs from 'fs';
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

// Add PhoneOutgoing to lucide-react imports if not there
if (!code.includes('PhoneOutgoing')) {
  code = code.replace('TrendingUp,', 'TrendingUp,\n  PhoneOutgoing,');
}

code = code.replace(
  '{ id: "crescimento", label: "Crescimento", icon: TrendingUp },',
  '{ id: "crescimento", label: "Crescimento", icon: TrendingUp },\n          { id: "sales", label: "Sales (WhatsApp)", icon: PhoneOutgoing },'
);

code = code.replace(
  '            {activeTab === "crescimento" && <TrendingUp className="text-blue-600" />}',
  '            {activeTab === "crescimento" && <TrendingUp className="text-blue-600" />}\n            {activeTab === "sales" && <PhoneOutgoing className="text-blue-600" />}'
);

code = code.replace(
  'activeTab === "metaDia" ? "Meta Dia" : "Pedidos de Cursos"}',
  'activeTab === "metaDia" ? "Meta Dia" : activeTab === "sales" ? "Contato via Sales" : "Pedidos de Cursos"}'
);

fs.writeFileSync('src/components/RelatoriosView.tsx', code);
