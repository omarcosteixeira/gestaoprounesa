import React, { useState, useEffect } from "react";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { Funcionario } from "../types";
import { Plus, Trash2, Download, Upload, Search, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
  uniqueUnidades?: string[];
}

export function AdminFuncionariosView({ onToast, uniqueUnidades = [] }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form State
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<"docente" | "administrativo">("docente");
  const [matricula, setMatricula] = useState("");
  const [unidade, setUnidade] = useState("");

  // Fetch employees
  useEffect(() => {
    const q = collection(db, COLLECTIONS.FUNCIONARIOS);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Funcionario[];

        // Sort in alphabetical order by name
        list.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        setFuncionarios(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar funcionários", error);
        onToast("Erro ao carregar lista de funcionários.", "error");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAddFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !matricula.trim()) {
      onToast("Nome e Matrícula são obrigatórios.", "error");
      return;
    }

    try {
      await addDoc(collection(db, COLLECTIONS.FUNCIONARIOS), {
        nome: nome.trim(),
        email: email.trim(),
        tipo,
        matricula: matricula.trim(),
        unidade,
        createdAt: serverTimestamp(),
      });
      onToast("Funcionário cadastrado com sucesso!", "success");
      setNome("");
      setEmail("");
      setTipo("docente");
      setMatricula("");
      setUnidade("");
    } catch (error) {
      console.error(error);
      onToast("Erro ao cadastrar funcionário.", "error");
    }
  };

  const handleDeleteFuncionario = async (id: string, name: string) => {
    if (
      !window.confirm(`Tem certeza que deseja remover o funcionário ${name}?`)
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, COLLECTIONS.FUNCIONARIOS, id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      onToast("Funcionário removido com sucesso!", "success");
    } catch (error) {
      console.error(error);
      onToast("Erro ao remover funcionário.", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Tem certeza que deseja remover os ${selectedIds.length} funcionários selecionados?`,
      )
    ) {
      return;
    }
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => {
        batch.delete(doc(db, COLLECTIONS.FUNCIONARIOS, id));
      });
      await batch.commit();
      onToast(
        `${selectedIds.length} funcionários removidos com sucesso!`,
        "success",
      );
      setSelectedIds([]);
    } catch (error) {
      console.error("Erro ao remover múltiplos funcionários:", error);
      onToast("Erro ao remover funcionários selecionados.", "error");
    }
  };

  // EXPORT TO EXCEL
  const handleExportExcel = () => {
    if (funcionarios.length === 0) {
      onToast("Não existem dados para exportar.", "error");
      return;
    }

    const dataToExport = funcionarios.map((f) => ({
      "Nome Completo": f.nome,
      "E-mail": f.email || "",
      Tipo: f.tipo === "administrativo" ? "Administrativo" : "Docente",
      Matrícula: f.matricula,
      Unidade: f.unidade || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");

    // Auto-fit column widths
    const max_len = dataToExport.reduce(
      (acc, row) => {
        acc["Nome Completo"] = Math.max(
          acc["Nome Completo"] || 0,
          String(row["Nome Completo"]).length,
        );
        acc["E-mail"] = Math.max(
          acc["E-mail"] || 0,
          String(row["E-mail"]).length,
        );
        acc["Tipo"] = Math.max(acc["Tipo"] || 0, String(row["Tipo"]).length);
        acc["Matrícula"] = Math.max(
          acc["Matrícula"] || 0,
          String(row["Matrícula"]).length,
        );
        return acc;
      },
      { "Nome Completo": 15, "E-mail": 10, Tipo: 10, Matrícula: 10 },
    );

    worksheet["!cols"] = [
      { wch: max_len["Nome Completo"] + 3 },
      { wch: max_len["E-mail"] + 3 },
      { wch: max_len["Tipo"] + 3 },
      { wch: max_len["Matrícula"] + 3 },
    ];

    XLSX.writeFile(
      workbook,
      `Funcionarios_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    onToast("Excel exportado com sucesso!", "success");
  };

  // EXCEL TEMPLATE DOWNLOAD
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Nome Completo": "João da Silva",
        "E-mail": "joao@dominio.com",
        Tipo: "Administrativo",
        Matrícula: "123456",
        Unidade: "Polo São Pedro",
      },
      {
        "Nome Completo": "Maria Oliveira",
        "E-mail": "maria@dominio.com",
        Tipo: "Docente",
        Matrícula: "789012",
        Unidade: "Polo Araruama",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo Importação");

    worksheet["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];

    XLSX.writeFile(workbook, `Modelo_Funcionarios.xlsx`);
    onToast("Modelo baixado com sucesso!");
  };

  // IMPORT FROM EXCEL
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawData || rawData.length === 0) {
          onToast(
            "O arquivo Excel correspondente está vazio ou em formato inválido.",
            "error",
          );
          return;
        }

        // Validate structure
        const firstRow = rawData[0];
        const keys = Object.keys(firstRow);

        // Find columns dynamically by matching key parts or exact headers
        const colNome = keys.find(
          (k) =>
            k.toLowerCase().includes("nome") ||
            k.toLowerCase().includes("funcionario") ||
            k.toLowerCase().includes("funcionário"),
        );
        const colEmail = keys.find(
          (k) =>
            k.toLowerCase().includes("email") ||
            k.toLowerCase().includes("e-mail"),
        );
        const colTipo = keys.find(
          (k) =>
            k.toLowerCase().includes("tipo") ||
            k.toLowerCase().includes("cargo"),
        );
        const colMatricula = keys.find(
          (k) =>
            k.toLowerCase().includes("matr") || k.toLowerCase().includes("id"),
        );
        const colUnidade = keys.find(
          (k) =>
            k.toLowerCase().includes("unidade") || k.toLowerCase().includes("polo"),
        );

        if (!colNome || !colMatricula) {
          onToast(
            "Colunas 'Nome Completo' e 'Matrícula' não foram identificadas no Excel.",
            "error",
          );
          return;
        }

        let importedCount = 0;
        let updatedCount = 0;
        let noChangeCount = 0;
        const batch = writeBatch(db);

        for (const row of rawData) {
          const rawNome = String(row[colNome || ""] || "").trim();
          const rawMatricula = String(row[colMatricula || ""] || "").trim();

          if (!rawNome || !rawMatricula) {
            continue; // Skip invalid lines
          }

          const rawEmail = colEmail ? String(row[colEmail] || "").trim() : "";
          const rawUnidade = colUnidade ? String(row[colUnidade] || "").trim() : "";
          const rawTipoInput = colTipo
            ? String(row[colTipo] || "")
                .trim()
                .toLowerCase()
            : "docente";

          const finalTipo: "docente" | "administrativo" =
            rawTipoInput.includes("adm") ||
            rawTipoInput.includes("setor") ||
            rawTipoInput.includes("gerente") ||
            rawTipoInput.includes("assistente")
              ? "administrativo"
              : "docente";

          // Check if employee with same matricula level is already registered
          const existing = funcionarios.find(
            (f) =>
              String(f.matricula).trim().toLowerCase() ===
              rawMatricula.toLowerCase(),
          );

          if (existing) {
            const updates: any = {};

            // Only assign if currently blank / empty but Excel contains data
            if ((!existing.nome || existing.nome.trim() === "") && rawNome) {
              updates.nome = rawNome;
            }
            if ((!existing.email || existing.email.trim() === "") && rawEmail) {
              updates.email = rawEmail;
            }
            if (!existing.tipo && finalTipo) {
              updates.tipo = finalTipo;
            }
            if ((!existing.unidade || existing.unidade.trim() === "") && rawUnidade) {
              updates.unidade = rawUnidade;
            }

            if (Object.keys(updates).length > 0) {
              const docRef = doc(db, COLLECTIONS.FUNCIONARIOS, existing.id);
              batch.update(docRef, updates);
              updatedCount++;
            } else {
              noChangeCount++;
            }
          } else {
            // New employee creation
            const docRef = doc(collection(db, COLLECTIONS.FUNCIONARIOS));
            batch.set(docRef, {
              nome: rawNome,
              email: rawEmail,
              tipo: finalTipo,
              matricula: rawMatricula,
              unidade: rawUnidade,
              createdAt: serverTimestamp(),
            });
            importedCount++;
          }
        }

        if (importedCount > 0 || updatedCount > 0) {
          await batch.commit();
          let msg = "";
          if (importedCount > 0 && updatedCount > 0) {
            msg = `${importedCount} novos funcionários importados e ${updatedCount} atualizados com dados preenchidos!`;
          } else if (importedCount > 0) {
            msg = `${importedCount} novos funcionários importados com sucesso!`;
          } else {
            msg = `${updatedCount} funcionários atualizados com novos dados preenchidos!`;
          }
          if (noChangeCount > 0) {
            msg += ` (${noChangeCount} já cadastrados e inalterados)`;
          }
          onToast(msg, "success");
        } else {
          if (noChangeCount > 0) {
            onToast(
              `${noChangeCount} funcionários avaliados: todos já estavam cadastrados com campos preenchidos.`,
              "success",
            );
          } else {
            onToast(
              "Nenhum funcionário elegível para importação foi encontrado.",
              "error",
            );
          }
        }
      } catch (err: any) {
        console.error("Erro ao importar funcionários:", err);
        onToast(`Erro ao ler arquivo Excel: ${err.message}`, "error");
      } finally {
        e.target.value = ""; // Clean input
      }
    };

    reader.readAsBinaryString(file);
  };

  const filteredFuncionarios = funcionarios.filter((f) => {
    const search = searchTerm.toLowerCase();
    return (
      (f.nome || "").toLowerCase().includes(search) ||
      (f.matricula || "").toLowerCase().includes(search) ||
      (f.email || "").toLowerCase().includes(search) ||
      (f.tipo === "administrativo" ? "administrativo" : "docente").includes(
        search,
      )
    );
  });

  const allFilteredIds = filteredFuncionarios.map((f) => f.id);
  const isAllSelected =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => selectedIds.includes(id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !allFilteredIds.includes(id)),
      );
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        allFilteredIds.forEach((id) => {
          if (!next.includes(id)) {
            next.push(id);
          }
        });
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Gestão de Funcionários (Insumos)
          </h3>
          <p className="text-sm text-slate-500">
            Cadastre funcionários administrativos e docentes para puxar
            matrícula automaticamente em requisições de Controle de Insumos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            title="Baixar Modelo de Excel para Importação"
          >
            <Download size={14} />
            Modelo Excel
          </button>

          <label className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer">
            <Upload size={14} />
            Importar Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportExcel}
            />
          </label>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <FileDown size={14} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Cadastro Form */}
      <form
        onSubmit={handleAddFuncionario}
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4"
      >
        <h4 className="font-bold text-slate-800 text-sm">
          Cadastrar Novo Funcionário
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              Nome Completo
            </label>
            <input
              type="text"
              required
              placeholder="Ex: João da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              E-mail (Opcional)
            </label>
            <input
              type="email"
              placeholder="Ex: joao@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              Tipo de Funcionário
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="docente">Docente / Professor</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              Matrícula (ID)
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 123456"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              Unidade
            </label>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecione uma Unidade</option>
              {uniqueUnidades.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
          >
            <Plus size={14} />
            Cadastrar
          </button>
        </div>
      </form>

      {/* Listing and search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-2.5 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar por nome, matrícula, tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-in fade-in zoom-in-95 duration-150 self-start sm:self-auto"
                title="Excluir todos os funcionários selecionados"
              >
                <Trash2 size={13} />
                <span>Excluir Selecionados ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <span className="text-xs font-bold text-slate-400 self-center">
            {filteredFuncionarios.length} funcionário(s) encontrado(s)
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Carregando dados...
          </div>
        ) : filteredFuncionarios.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhum funcionário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      title="Selecionar todos os filtrados"
                    />
                  </th>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">E-mail</th>
                  <th className="px-6 py-3">Unidade</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Matrícula</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredFuncionarios.map((f) => {
                  const isSelected = selectedIds.includes(f.id);
                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-slate-50/50 transition-colors ${isSelected ? "bg-blue-50/20" : ""}`}
                    >
                      <td className="px-6 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(f.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-800">
                        {f.nome}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {f.email || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {f.unidade || "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.tipo === "administrativo"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {f.tipo === "administrativo"
                            ? "Administrativo"
                            : "Docente"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600 font-medium">
                        {f.matricula}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteFuncionario(f.id, f.nome)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Remover Funcionário"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
