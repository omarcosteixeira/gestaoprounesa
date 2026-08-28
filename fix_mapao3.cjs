const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add Semester field to formData state and toggleExpand
const stateTarget = `  const [formData, setFormData] = useState<Partial<MapaoAcademicoEntry>>({
    modalidade: "Presencial",
    tipoCurso: "GRADUACAO",
    periodo: "",
    disciplinas: [{ ...defaultDisciplina }],
  });
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});`;

const stateReplacement = `  const [formData, setFormData] = useState<Partial<MapaoAcademicoEntry>>({
    modalidade: "Presencial",
    tipoCurso: "GRADUACAO",
    periodo: "",
    semestre: "",
    disciplinas: [{ ...defaultDisciplina }],
  });
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  
  // Filters
  const [filterCurso, setFilterCurso] = useState("");
  const [filterPeriodo, setFilterPeriodo] = useState("");
  const [filterSemestre, setFilterSemestre] = useState("");
  const [filterTipoCurso, setFilterTipoCurso] = useState("");`;

code = code.replace(stateTarget, stateReplacement);

// 2. Add Semestre input field after Período
const formTarget = `                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                    Período
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    value={formData.periodo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, periodo: e.target.value })
                    }
                    required
                  />
                </div>
                <div>`;

const formReplacement = `                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                    Período
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    value={formData.periodo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, periodo: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                    Semestre
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    value={formData.semestre || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, semestre: e.target.value })
                    }
                    required
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
                </div>
                <div>`;

code = code.replace(formTarget, formReplacement);

// 3. Filter mapao array
const mapaoMapTarget = `      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mapao.map((entry) => {`;
const mapaoMapReplacement = `      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por Curso"
            value={filterCurso}
            onChange={(e) => setFilterCurso(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filtrar por Período"
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-48 shrink-0">
          <select
            value={filterSemestre}
            onChange={(e) => setFilterSemestre(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Qualquer Semestre</option>
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
        </div>
        <div className="w-full md:w-48 shrink-0">
          <select
            value={filterTipoCurso}
            onChange={(e) => setFilterTipoCurso(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Qualquer Tipo</option>
            <option value="GRADUACAO">GRADUAÇÃO</option>
            <option value="TECNICO">TÉCNICO</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mapao.filter((entry) => {
          const matchCurso = !filterCurso || entry.curso?.toLowerCase().includes(filterCurso.toLowerCase());
          const matchPeriodo = !filterPeriodo || entry.periodo?.toLowerCase().includes(filterPeriodo.toLowerCase());
          const matchSemestre = !filterSemestre || entry.semestre === filterSemestre;
          const matchTipo = !filterTipoCurso || entry.tipoCurso === filterTipoCurso;
          return matchCurso && matchPeriodo && matchSemestre && matchTipo;
        }).map((entry) => {`;
        
code = code.replace(mapaoMapTarget, mapaoMapReplacement);

// Display Semester in the Card Header
const titleSectionTarget = `                  <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                    {entry.curso}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {entry.periodo}
                  </p>
                </div>`;
const titleSectionReplacement = `                  <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                    {entry.curso}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {entry.periodo} {entry.semestre ? \` - \${entry.semestre}\` : ""}
                  </p>
                </div>`;
                
code = code.replace(titleSectionTarget, titleSectionReplacement);

// Set editing entry fields
const editSetDataTarget = `                        onClick={() => {
                          setEditingEntry(entry);
                          setFormData({
                            ...entry,
                            disciplinas:
                              disciplinasList.length > 0
                                ? disciplinasList
                                : [{ ...defaultDisciplina }],
                          });`;

const editSetDataReplacement = `                        onClick={() => {
                          setEditingEntry(entry);
                          setFormData({
                            ...entry,
                            semestre: entry.semestre || "",
                            disciplinas:
                              disciplinasList.length > 0
                                ? disciplinasList
                                : [{ ...defaultDisciplina }],
                          });`;

code = code.replace(editSetDataTarget, editSetDataReplacement);


fs.writeFileSync('src/App.tsx', code);
console.log("Success");
