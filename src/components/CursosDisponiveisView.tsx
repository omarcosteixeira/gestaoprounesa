import React, { useState, useMemo, useRef } from "react";
import { CursoDisponivel, UserProfile } from "../types";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  BookOpen,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "../lib/utils";
// We should import ROLES from App.tsx or redefine. Since App.tsx has it:
import { ROLES } from "../App";
import * as XLSX from "xlsx";

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const importFromExcel = (
  file: File,
  callback: (data: any[]) => void,
) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const bstr = e.target?.result;
    const workbook = XLSX.read(bstr, { type: "binary" });
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    callback(data);
  };
  reader.readAsBinaryString(file);
};

interface CursosDisponiveisViewProps {
  cursos: CursoDisponivel[];
  onToast: (m: string, t?: "success" | "error") => void;
  profile: UserProfile;
}

const METODOLOGIAS = [
  "EAD",
  "Presencial",
  "Semipresencial",
  "Flex",
  "Híbrido",
  "Digital",
];

export function CursosDisponiveisView({
  cursos,
  onToast,
  profile,
}: CursosDisponiveisViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterUnidade, setFilterUnidade] = useState<string[]>([]);
  const [filterMetodologia, setFilterMetodologia] = useState<string[]>([]);
  const [filterCurso, setFilterCurso] = useState<string[]>([]);
  const [filterProduto, setFilterProduto] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Unique values for filters (ignoring case/trimming could be nice, but we'll use exact values)
  const uniqueUnidades = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.nomeUnidade))).sort(),
    [cursos],
  );
  const uniqueMetodologias = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.metodologia))).sort(),
    [cursos],
  );
  const uniqueCursos = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.curso))).sort(),
    [cursos],
  );
  const uniqueProdutos = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.produto))).sort(),
    [cursos],
  );

  const canEdit = true;

  const handleExport = () => {
    const exportData = filteredCursos.map((c) => ({
      Unidade: c.nomeUnidade,
      Produto: c.produto,
      Curso: c.curso,
      Metodologia: c.metodologia,
      Duração: c.duracao,
      Turno: c.turno || "",
    }));
    exportToExcel(exportData, "Cursos_Disponiveis");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importFromExcel(file, async (importData) => {
      try {
        const normalizeProduto = (val: string) => {
          if (!val) return "Graduação";
          const lower = val.trim().toLowerCase();
          if (lower.includes("gradua")) return "Graduação";
          if (lower.includes("tecnic") || lower.includes("técnic")) return "Técnico";
          if (lower.includes("pos") || lower.includes("pós")) return "Pós-graduação";
          return val;
        };

        const normalizeMetodologia = (val: string) => {
          if (!val) return "EAD";
          const lower = val.trim().toLowerCase();
          const found = METODOLOGIAS.find((m) => m.toLowerCase() === lower);
          if (found) return found;
          if (lower === "ead") return "EAD";
          return val;
        };

        const normalizeTurno = (val: string) => {
          if (!val) return "";
          const lower = val.trim().toLowerCase();
          if (lower === "matutino") return "Matutino";
          if (lower === "vespertino") return "Vespertino";
          if (lower === "noturno") return "Noturno";
          if (lower === "integral") return "Integral";
          return val;
        };

        const batch = importData.map((item) => ({
          nomeUnidade: item.Unidade || item.nomeUnidade || "",
          produto: normalizeProduto(item.Produto || item.produto),
          curso: item.Curso || item.curso || "",
          metodologia: normalizeMetodologia(item.Metodologia || item.metodologia),
          duracao: item["Duração"] || item.duracao || "",
          turno: normalizeTurno(item.Turno || item.turno),
          createdAt: new Date().toISOString(),
        }));

        const processBatch = async (items: any[]) => {
          const chunk = items.slice(0, 500);
          const rest = items.slice(500);

          const firestoreBatch = writeBatch(db);
          chunk.forEach((item) => {
            const docRef = doc(collection(db, COLLECTIONS.CURSOS));
            firestoreBatch.set(docRef, item);
          });

          await firestoreBatch.commit();

          if (rest.length > 0) {
            await processBatch(rest);
          }
        };

        await processBatch(batch);
        onToast(`${batch.length} cursos importados com sucesso!`, "success");
      } catch (err: any) {
        console.error("Import error:", err);
        onToast(`Erro na importação: ${err.message}`, "error");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nomeUnidade: formData.get("nomeUnidade") as string,
      produto: formData.get("produto") as
        | "Graduação"
        | "Técnico"
        | "Pós-graduação",
      curso: formData.get("curso") as string,
      metodologia: formData.get("metodologia") as string,
      duracao: formData.get("duracao") as string,
      turno: formData.get("turno") as string,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTIONS.CURSOS, editingId), {
          ...data,
          updatedAt: new Date().toISOString(),
        });
        onToast("Curso atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, COLLECTIONS.CURSOS), {
          ...data,
          createdAt: new Date().toISOString(),
        });
        onToast("Curso adicionado com sucesso!", "success");
      }
      setIsAdding(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      onToast("Erro ao salvar curso", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este curso?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.CURSOS, id));
      onToast("Curso excluído com sucesso!", "success");
    } catch (err) {
      console.error(err);
      onToast("Erro ao excluir curso", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir ${selectedIds.length} curso(s)?`,
      )
    )
      return;
    try {
      const firestoreBatch = writeBatch(db);
      selectedIds.forEach((id) => {
        firestoreBatch.delete(doc(db, COLLECTIONS.CURSOS, id));
      });
      await firestoreBatch.commit();
      onToast(
        `${selectedIds.length} curso(s) excluído(s) com sucesso!`,
        "success",
      );
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      onToast("Erro ao excluir cursos.", "error");
    }
  };

  const filteredCursos = useMemo(() => {
    return cursos.filter((c) => {
      const matchUnidade =
        filterUnidade.length === 0 || filterUnidade.includes(c.nomeUnidade);
      const matchMetodologia =
        filterMetodologia.length === 0 ||
        filterMetodologia.includes(c.metodologia);
      const matchCurso =
        filterCurso.length === 0 || filterCurso.includes(c.curso);
      const matchProduto =
        filterProduto.length === 0 || filterProduto.includes(c.produto);
      
      if (profile.role === "Gestor Unidade") {
        if (!profile.unidade || c.nomeUnidade !== profile.unidade) {
          return false;
        }
      }
      return matchUnidade && matchMetodologia && matchCurso && matchProduto;
  
    });
  }, [cursos, filterUnidade, filterMetodologia, filterCurso, filterProduto]);

  const toggleFilter = (
    setFilter: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ) => {
    setFilter((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((s) => s !== id));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCursos.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const editingCurso = editingId
    ? cursos.find((c) => c.id === editingId)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Cursos Disponíveis
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Consulte os cursos e metologias disponíveis em cada unidade.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <>
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2 shrink-0"
              >
                <Upload size={18} />
                <span>Importar Planilha</span>
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2 shrink-0"
          >
            <Download size={18} />
            <span>Exportar Planilha</span>
          </button>
          {canEdit && !isAdding && (
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2 shrink-0"
            >
              <Plus size={20} />
              <span>Novo Curso</span>
            </button>
          )}
        </div>
      </div>

      {isAdding && canEdit && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
          <button
            onClick={() => {
              setIsAdding(false);
              setEditingId(null);
            }}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <h3 className="text-xl font-bold text-slate-900 mb-6">
            {editingId ? "Editar Curso" : "Cadastrar Novo Curso"}
          </h3>

          <form
            onSubmit={handleSave}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Nome da Unidade <span className="text-red-500">*</span>
              </label>
              <input
                name="nomeUnidade"
                required
                defaultValue={editingCurso?.nomeUnidade}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Polo São Pedro"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Produto <span className="text-red-500">*</span>
              </label>
              <select
                name="produto"
                required
                defaultValue={editingCurso?.produto || "Graduação"}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Graduação">Graduação</option>
                <option value="Técnico">Técnico</option>
                <option value="Pós-graduação">Pós-graduação</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Curso <span className="text-red-500">*</span>
              </label>
              <input
                name="curso"
                required
                defaultValue={editingCurso?.curso}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Administração"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Metodologia <span className="text-red-500">*</span>
              </label>
              <select
                name="metodologia"
                required
                defaultValue={editingCurso?.metodologia || "EAD"}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {METODOLOGIAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Duração <span className="text-red-500">*</span>
              </label>
              <input
                name="duracao"
                required
                defaultValue={editingCurso?.duracao}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 4 anos"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Turno
              </label>
              <input
                name="turno"
                defaultValue={editingCurso?.turno || ""}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Manhã, Noite, Integral..."
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center"
              >
                <CheckCircle2 size={20} className="mr-2" />
                {editingId ? "Salvar Alterações" : "Cadastrar Curso"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center">
          <Search size={18} className="mr-2 text-slate-400" /> Filtros
          Multiseleção
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Unidade */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Unidade
            </span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueUnidades.map((u) => (
                <label
                  key={u}
                  className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterUnidade.includes(u)}
                    onChange={() => toggleFilter(setFilterUnidade, u)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{u}</span>
                </label>
              ))}
              {uniqueUnidades.length === 0 && (
                <span className="text-xs text-slate-400">
                  Nenhuma registrada
                </span>
              )}
            </div>
          </div>

          {/* Produto */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Produto
            </span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueProdutos.map((p) => (
                <label
                  key={p}
                  className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterProduto.includes(p)}
                    onChange={() => toggleFilter(setFilterProduto, p)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{p}</span>
                </label>
              ))}
              {uniqueProdutos.length === 0 && (
                <span className="text-xs text-slate-400">
                  Nenhum registrado
                </span>
              )}
            </div>
          </div>

          {/* Curso */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Curso
            </span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueCursos.map((c) => (
                <label
                  key={c}
                  className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterCurso.includes(c)}
                    onChange={() => toggleFilter(setFilterCurso, c)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{c}</span>
                </label>
              ))}
              {uniqueCursos.length === 0 && (
                <span className="text-xs text-slate-400">
                  Nenhum registrado
                </span>
              )}
            </div>
          </div>

          {/* Metodologia */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Metodologia
            </span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueMetodologias.map((m) => (
                <label
                  key={m}
                  className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterMetodologia.includes(m)}
                    onChange={() => toggleFilter(setFilterMetodologia, m)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{m}</span>
                </label>
              ))}
              {uniqueMetodologias.length === 0 && (
                <span className="text-xs text-slate-400">
                  Nenhuma registrada
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {(filterUnidade.length > 0 ||
          filterProduto.length > 0 ||
          filterCurso.length > 0 ||
          filterMetodologia.length > 0) && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                setFilterUnidade([]);
                setFilterProduto([]);
                setFilterCurso([]);
                setFilterMetodologia([]);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">
            Resultados ({filteredCursos.length})
          </h3>
          {canEdit && selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-lg font-bold flex items-center space-x-2 text-xs transition-colors"
            >
              <Trash2 size={16} />
              <span>Excluir Selecionados ({selectedIds.length})</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                {canEdit && (
                  <th className="px-5 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredCursos.length &&
                        filteredCursos.length > 0
                      }
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-5 py-4">Unidade</th>
                <th className="px-5 py-4">Produto</th>
                <th className="px-5 py-4">Curso</th>
                <th className="px-5 py-4">Metodologia</th>
                <th className="px-5 py-4">Duração</th>
                <th className="px-5 py-4">Turno</th>
                {canEdit && <th className="px-5 py-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredCursos.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  {canEdit && (
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={(e) => toggleSelect(c.id, e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-5 py-4 font-bold text-slate-800">
                    {c.nomeUnidade}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-md text-xs font-bold border",
                        c.produto === "Graduação"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : c.produto === "Técnico"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-purple-50 text-purple-700 border-purple-200",
                      )}
                    >
                      {c.produto}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium">{c.curso}</td>
                  <td className="px-5 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-[4px] text-xs font-bold">
                      {c.metodologia}
                    </span>
                  </td>
                  <td className="px-5 py-4">{c.duracao}</td>
                  <td className="px-5 py-4 text-sm">{c.turno || "-"}</td>
                  {canEdit && (
                    <td className="px-5 py-4 text-right text-slate-400">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setIsAdding(true);
                            setEditingId(c.id);
                          }}
                          className="p-1.5 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredCursos.length === 0 && (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    <BookOpen
                      size={48}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="font-medium text-lg">
                      Nenhum curso encontrado
                    </p>
                    <p className="text-sm mt-1">
                      Ajuste os filtros ou cadastre um novo curso.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
