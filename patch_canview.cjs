const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `    if (
      profile.email === "canaldonutri@gmail.com" ||
      profile.email === "marcos.teixeira@estacio.br" ||
      profile.role === "Admin Master"
    ) {
      return true;
    }`,
  `    if (
      profile.email === "canaldonutri@gmail.com" ||
      profile.email === "marcos.teixeira@estacio.br" ||
      profile.role === "Admin Master"
    ) {
      return true;
    }
    
    // Explicitly allow SSA on principal server for requested tabs
    if (profile.role === "SSA" && (localStorage.getItem("servidor_selected") || "principal") === "principal") {
      if (["fiesProuni", "mapao", "campanhas", "cursos", "evasao"].includes(view)) {
        return true;
      }
    }`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched canView in App.tsx");
