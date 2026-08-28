const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const defaultTarget = `  const defaultDisciplina = {
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
const defaultReplacement = `  const defaultDisciplina = {
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
  
code = code.replaceAll(defaultTarget, defaultReplacement);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
