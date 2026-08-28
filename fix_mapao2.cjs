const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetState = `  const [formData, setFormData] = useState<Partial<MapaoAcademicoEntry>>({
    modalidade: "Presencial",
    tipoCurso: "GRADUACAO",
    periodo: "",
    disciplinas: [{ ...defaultDisciplina }],
  });`;
const newState = `  const [formData, setFormData] = useState<Partial<MapaoAcademicoEntry>>({
    modalidade: "Presencial",
    tipoCurso: "GRADUACAO",
    periodo: "",
    disciplinas: [{ ...defaultDisciplina }],
  });
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };`;

code = code.replace(targetState, newState);

const targetFormTurma = `                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Turma
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                            value={disc.turma}
                            onChange={(e) =>
                              handleChangeDisciplina(
                                idx,
                                "turma",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </div>`;

const newFormTurmaAndSemestre = `                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Turma
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                            value={disc.turma}
                            onChange={(e) =>
                              handleChangeDisciplina(
                                idx,
                                "turma",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            Semestre
                          </label>
                          <select
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                            value={disc.semestre || ""}
                            onChange={(e) =>
                              handleChangeDisciplina(
                                idx,
                                "semestre",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">Selecione...</option>
                            <option value="1º">1º</option>
                            <option value="2º">2º</option>
                            <option value="3º">3º</option>
                            <option value="4º">4º</option>
                            <option value="5º">5º</option>
                            <option value="6º">6º</option>
                            <option value="7º">7º</option>
                            <option value="8º">8º</option>
                            <option value="9º">9º</option>
                            <option value="10º">10º</option>
                          </select>
                        </div>`;
code = code.replace(targetFormTurma, newFormTurmaAndSemestre);


const targetMapStart = `      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mapao.map((entry) => {
          const disciplinasList = entry.disciplinas || [];
          return (
            <motion.div`;

const targetMapReplace = `      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mapao.map((entry) => {
          const disciplinasList = entry.disciplinas || [];
          const isExpanded = expandedCards[entry.id];
          return (
            <motion.div`;

code = code.replace(targetMapStart, targetMapReplace);

const targetTitleSection = `              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                  {entry.curso}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {entry.periodo}
                </p>
              </div>

              <div className="flex-1 space-y-3 mt-2">`;
const titleReplacement = `              <div className="flex justify-between items-center gap-4 cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                    {entry.curso}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {entry.periodo}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(entry.id);
                  }}
                  className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full text-slate-500 transition-colors shrink-0"
                >
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {isExpanded && (
              <div className="flex-1 space-y-3 mt-2">`;
code = code.replace(targetTitleSection, titleReplacement);

const targetClosingDiv = `                {disciplinasList.length === 0 && (
                  <div className="bg-slate-50 border border-slate-100 border-dashed rounded-2xl py-8 flex flex-col items-center justify-center text-slate-400">
                    <GraduationCap size={24} className="mb-2 opacity-50" />
                    <p className="text-xs italic">Nenhuma disciplina cadastrada.</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>`;
const closingReplacement = `                {disciplinasList.length === 0 && (
                  <div className="bg-slate-50 border border-slate-100 border-dashed rounded-2xl py-8 flex flex-col items-center justify-center text-slate-400">
                    <GraduationCap size={24} className="mb-2 opacity-50" />
                    <p className="text-xs italic">Nenhuma disciplina cadastrada.</p>
                  </div>
                )}
              </div>
              )}
            </motion.div>
          );
        })}
      </div>`;
code = code.replace(targetClosingDiv, closingReplacement);

const targetCardTurma = `<span className="text-[10px] font-bold">
                          {disc.turma || "-"}
                        </span>`;
const cardTurmaReplacement = `<span className="text-[10px] font-bold">
                          {disc.turma || "-"}
                          {disc.semestre ? \` (\${disc.semestre})\` : ""}
                        </span>`;
code = code.replace(targetCardTurma, cardTurmaReplacement);


fs.writeFileSync('src/App.tsx', code);
console.log("Success");
