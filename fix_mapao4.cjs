const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `      setFormData({
        modalidade: "Presencial",
        tipoCurso: "GRADUACAO",
        disciplinas: [{ ...defaultDisciplina }],
      });`;
const repl1 = `      setFormData({
        modalidade: "Presencial",
        tipoCurso: "GRADUACAO",
        periodo: "",
        semestre: "",
        disciplinas: [{ ...defaultDisciplina }],
      });`;
code = code.replaceAll(target1, repl1);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
