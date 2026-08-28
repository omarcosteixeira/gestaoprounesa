const fs = require('fs');
let code = fs.readFileSync('src/components/EvasaoView.tsx', 'utf8');

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
      const atendA = (a.atendimento || "") + " " + (a.horario || "");
      const atendB = (b.atendimento || "") + " " + (b.horario || "");
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
  console.log("sortAnchor still not found");
}

fs.writeFileSync('src/components/EvasaoView.tsx', code, 'utf8');
console.log("Patch 2 completed");
