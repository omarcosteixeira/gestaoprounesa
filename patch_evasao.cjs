const fs = require('fs');
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

// 1. Add statusFilter state
const stateAnchor = `  const [tipoSolicitacaoFilter, setTipoSolicitacaoFilter] = useState("Todos");`;
const stateReplacement = `  const [tipoSolicitacaoFilter, setTipoSolicitacaoFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");`;
if(code.includes(stateAnchor)) {
  code = code.replace(stateAnchor, stateReplacement);
} else {
  console.log("stateAnchor not found");
}

// 2. Add uniqueStatus
const uniquePeriodosAnchor = `  const uniquePeriodos = useMemo(() => {
    const periodos = data
      .map(item => item.periodo)
      .filter((p): p is string => !!p);
    return Array.from(new Set(periodos)).sort();
  }, [data]);`;
const uniquePeriodosReplacement = `  const uniquePeriodos = useMemo(() => {
    const periodos = data
      .map(item => item.periodo)
      .filter((p): p is string => !!p);
    return Array.from(new Set(periodos)).sort();
  }, [data]);

  const uniqueStatus = useMemo(() => {
    const statuses = data
      .map(item => item.status)
      .filter((s): s is string => !!s);
    return Array.from(new Set(statuses)).sort();
  }, [data]);`;
if(code.includes(uniquePeriodosAnchor)) {
  code = code.replace(uniquePeriodosAnchor, uniquePeriodosReplacement);
} else {
  console.log("uniquePeriodosAnchor not found");
}

// 3. Update filtering logic
const filterAnchor = `    if (tipoSolicitacaoFilter !== "Todos") {
      filtered = filtered.filter(item => item.tipoSolicitacao === tipoSolicitacaoFilter);
    }`;
const filterReplacement = `    if (tipoSolicitacaoFilter !== "Todos") {
      filtered = filtered.filter(item => item.tipoSolicitacao === tipoSolicitacaoFilter);
    }

    if (statusFilter !== "Todos") {
      filtered = filtered.filter(item => item.status === statusFilter);
    }`;
if(code.includes(filterAnchor)) {
  code = code.replace(filterAnchor, filterReplacement);
} else {
  console.log("filterAnchor not found");
}

// 4. Update sorting logic
const sortAnchor = `    return filtered.sort((a, b) => {
      // Primary sort: atendimento date (YYYY-MM-DD)
      const atendA = a.atendimento || "";
      const atendB = b.atendimento || "";
      if (atendA !== atendB) {
        return atendB.localeCompare(atendA);
      }
      // Secondary sort: createdAt
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [data, profile, modalidadeFilter, periodoFilter, tipoSolicitacaoFilter, searchTerm, dataInicioFilter, dataFimFilter]);`;
const sortReplacement = `    return filtered.sort((a, b) => {
      // Primary sort: atendimento date (YYYY-MM-DD) + time (HH:mm)
      const atendA = (a.atendimento || "") + (a.horario || "");
      const atendB = (b.atendimento || "") + (b.horario || "");
      if (atendA !== atendB) {
        return atendA.localeCompare(atendB);
      }
      // Secondary sort: createdAt
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [data, profile, modalidadeFilter, periodoFilter, tipoSolicitacaoFilter, statusFilter, searchTerm, dataInicioFilter, dataFimFilter]);`;
if(code.includes(sortAnchor)) {
  code = code.replace(sortAnchor, sortReplacement);
} else {
  console.log("sortAnchor not found");
}

// 5. Update UI
const uiAnchor = `            {/* Tipo de Solicitação Filter */}
            <select
              value={tipoSolicitacaoFilter}
              onChange={(e) => setTipoSolicitacaoFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todos">Todos Tipos</option>
              <option value="Trancamento">Trancamento</option>
              <option value="Cancelamento">Cancelamento</option>
              <option value="Transferência externa">Transferência externa</option>
            </select>
          </div>
        </div>`;
const uiReplacement = `            {/* Tipo de Solicitação Filter */}
            <select
              value={tipoSolicitacaoFilter}
              onChange={(e) => setTipoSolicitacaoFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todos">Todos Tipos</option>
              <option value="Trancamento">Trancamento</option>
              <option value="Cancelamento">Cancelamento</option>
              <option value="Transferência externa">Transferência externa</option>
            </select>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="Todos">Todos Status</option>
              {uniqueStatus.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>`;
if(code.includes(uiAnchor)) {
  code = code.replace(uiAnchor, uiReplacement);
} else {
  console.log("uiAnchor not found");
}

fs.writeFileSync('src/components/EvasaoView.tsx', code, 'utf8');
console.log("Patch completed");
