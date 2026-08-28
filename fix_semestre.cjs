const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const defaultDisciplina = {
    codDisc: "",
    disciplina: "",
    dia: "Segunda-feira",
    horario: "",
    turma: "",
    tipoDisciplina: "PRESENCIAL",
    professor: "",
    matricula: "",
    observacao: "",
    linkAula: "",
  };`;
const repl1 = `  const defaultDisciplina = {
    codDisc: "",
    disciplina: "",
    dia: "Segunda-feira",
    horario: "",
    turma: "",
    semestre: "",
    tipoDisciplina: "PRESENCIAL",
    professor: "",
    matricula: "",
    observacao: "",
    linkAula: "",
  };`;
code = code.replace(target1, repl1);
fs.writeFileSync('src/App.tsx', code);
console.log("Success");
