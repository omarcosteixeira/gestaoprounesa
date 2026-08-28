const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const anchor = `{editingMetaDia
                  ? "Editar Registro de Meta Dia"
                  : "Adicionar Novo Registro de Meta Dia"}
              </h3>
              {editingMetaDia && (`;

const replacement = `{editingMetaDia
                  ? "Editar Registro de Meta Dia"
                  : "Adicionar Novo Registro de Meta Dia"}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dataToExport = metaDia.map((m) => ({
                      Data: m.data,
                      "A.A Presencial": m.aaPresencial,
                      "Meta Presencial": m.ytdPresencial,
                      "Realizado Presencial": m.realizadoPresencial,
                      "A.A Semipresencial": m.aaSemipresencial,
                      "Meta Semipresencial": m.ytdSemipresencial,
                      "Realizado Semipresencial": m.realizadoSemipresencial,
                      "A.A Digital": m.aaDigital,
                      "Meta Digital": m.ytdDigital,
                      "Realizado Digital": m.realizadoDigital,
                      "A.A Técnico": m.aaTecnico || 0,
                      "Meta Técnico": m.ytdTecnico || 0,
                      "Realizado Técnico": m.realizadoTecnico || 0,
                      "A.A Pós-Graduação": m.aaPosGraduacao || 0,
                      "Meta Pós-Graduação": m.ytdPosGraduacao || 0,
                      "Realizado Pós-Graduação": m.realizadoPosGraduacao || 0,
                    }));
                    exportToExcel(dataToExport, "Meta_Dia_Admin");
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Download size={14} /> Exportar
                </button>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload size={14} /> Importar
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      importFromExcel(file, async (data) => {
                        let imported = 0;
                        for (const row of data) {
                          try {
                            if (!row["Data"]) continue;
                            const docData = {
                              data: row["Data"],
                              aaPresencial: Number(row["A.A Presencial"]) || 0,
                              ytdPresencial: Number(row["Meta Presencial"]) || 0,
                              realizadoPresencial: Number(row["Realizado Presencial"]) || 0,
                              aaSemipresencial: Number(row["A.A Semipresencial"]) || 0,
                              ytdSemipresencial: Number(row["Meta Semipresencial"]) || 0,
                              realizadoSemipresencial: Number(row["Realizado Semipresencial"]) || 0,
                              aaDigital: Number(row["A.A Digital"]) || 0,
                              ytdDigital: Number(row["Meta Digital"]) || 0,
                              realizadoDigital: Number(row["Realizado Digital"]) || 0,
                              aaTecnico: Number(row["A.A Técnico"]) || 0,
                              ytdTecnico: Number(row["Meta Técnico"]) || 0,
                              realizadoTecnico: Number(row["Realizado Técnico"]) || 0,
                              aaPosGraduacao: Number(row["A.A Pós-Graduação"]) || 0,
                              ytdPosGraduacao: Number(row["Meta Pós-Graduação"]) || 0,
                              realizadoPosGraduacao: Number(row["Realizado Pós-Graduação"]) || 0,
                              createdAt: serverTimestamp(),
                            };
                            await addDoc(collection(db, COLLECTIONS.META_DIA), docData);
                            imported++;
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        showToast(imported + " registros importados!", "success");
                      });
                      e.target.value = ""; // reset
                    }}
                  />
                </label>
              </div>
              {editingMetaDia && (`;

if (code.includes(anchor)) {
    code = code.replace(anchor, replacement);
    fs.writeFileSync('src/App.tsx', code, 'utf8');
    console.log("Successfully patched App.tsx meta dia import/export.");
} else {
    console.log("Anchor not found in App.tsx!");
}
