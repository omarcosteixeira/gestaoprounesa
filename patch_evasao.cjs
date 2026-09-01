const fs = require('fs');
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

code = code.replace(
  `    const isRestricted = 
      profile?.role !== "Admin Master" && 
      profile?.role !== "Gestor Comercial" && 
      profile?.role !== "Gerente Comercial (Comercial)" &&
      !["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"].includes(profile?.email || "");`,
  `    const isPrincipalServer = ((localStorage.getItem("servidor_selected") as string) || "principal") === "principal";
    const isRestricted = 
      (!isPrincipalServer || profile?.role !== "SSA") &&
      profile?.role !== "Admin Master" && 
      profile?.role !== "Gestor Comercial" && 
      profile?.role !== "Gerente Comercial (Comercial)" &&
      !["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"].includes(profile?.email || "");`
);

fs.writeFileSync('src/components/EvasaoView.tsx', code);
console.log("Patched EvasaoView.tsx");
