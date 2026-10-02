import React, { useState, useMemo, useRef } from "react";
import { CursoDisponivel, UserProfile, MetodologiaInfo } from "../types";
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
  Image as ImageIcon,
  User as UserIcon,
} from "lucide-react";
import { cn, matchesUnit } from "../lib/utils";
import { motion } from "motion/react";
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

  // New Fields
  const [imagens, setImagens] = useState<string[]>([]);
  const [metodologias, setMetodologias] = useState<MetodologiaInfo[]>([]);
  const [possuiCoordenador, setPossuiCoordenador] = useState(false);
  const [coordNome, setCoordNome] = useState("");
  const [coordDesc, setCoordDesc] = useState("");
  const [coordFoto, setCoordFoto] = useState("");
  const [coordLattes, setCoordLattes] = useState("");
  const [coordContato, setCoordContato] = useState("");

  // Filters
  const [filterUnidade, setFilterUnidade] = useState<string[]>([]);
  const [filterMetodologia, setFilterMetodologia] = useState<string[]>([]);
  const [filterCurso, setFilterCurso] = useState<string[]>([]);
  const [filterProduto, setFilterProduto] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleEdit = (c: CursoDisponivel) => {
    setEditingId(c.id);
    setIsAdding(true);
    setImagens(c.imagens || []);
    setMetodologias(c.metodologias || (c.metodologia ? [{ nome: c.metodologia, observacao: c.observacoes || "" }] : []));
    setPossuiCoordenador(c.possuiCoordenador || false);
    setCoordNome(c.coordenador?.nome || "");
    setCoordDesc(c.coordenador?.descricao || "");
    setCoordFoto(c.coordenador?.fotoUrl || "");
    setCoordLattes(c.coordenador?.lattes || "");
    setCoordContato(c.coordenador?.contato || "");
  };

  const handleResetForm = () => {
    setEditingId(null);
    setIsAdding(false);
    setImagens([]);
    setMetodologias([]);
    setPossuiCoordenador(false);
    setCoordNome("");
    setCoordDesc("");
    setCoordFoto("");
    setCoordLattes("");
    setCoordContato("");
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const coordData = possuiCoordenador ? {
      nome: coordNome,
      descricao: coordDesc,
      fotoUrl: coordFoto,
      lattes: coordLattes,
      contato: coordContato
    } : null;

    const data = {
      nomeUnidade: (formData.get("nomeUnidade") as string || "").trim(),
      produto: formData.get("produto") as
        | "Graduação"
        | "Técnico"
        | "Pós-graduação",
      curso: (formData.get("curso") as string || "").trim(),
      metodologia: metodologias.length > 0 ? metodologias[0].nome : (formData.get("metodologia") as string || "EAD"),
      metodologias,
      duracao: (formData.get("duracao") as string || "").trim(),
      turno: (formData.get("turno") as string || "").trim(),
      descricao: (formData.get("descricao") as string || "").trim(),
      observacoes: (formData.get("observacoes") as string || "").trim(),
      imagens: imagens.filter(img => img.trim() !== ""),
      possuiCoordenador,
      coordenador: coordData,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTIONS.CURSOS, editingId), {
          ...data,
          updatedAt: new Date().toISOString(),
        });
        onToast("Curso atualizado no catálogo!", "success");
      } else {
        await addDoc(collection(db, COLLECTIONS.CURSOS), {
          ...data,
          createdAt: new Date().toISOString(),
        });
        onToast("Curso adicionado ao catálogo!", "success");
      }
      handleResetForm();
    } catch (err) {
      console.error(err);
      onToast("Erro ao salvar curso", "error");
    }
  };

  const handleAddImageUrl = () => {
    if (imagens.length < 3) {
      setImagens([...imagens, ""]);
    }
  };

  const handleImageChange = (index: number, val: string) => {
    const newImgs = [...imagens];
    newImgs[index] = val;
    setImagens(newImgs);
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
      
      if (profile?.role === "Gestor Unidade") {
        const hasSpecificUnit =
          profile.unidade &&
          profile.unidade.trim() &&
          !profile.unidade.toLowerCase().includes("todas") &&
          !profile.unidade.toLowerCase().includes("regional");

        if (hasSpecificUnit && !matchesUnit(c.nomeUnidade, profile.unidade)) {
          return false;
        }
      }
      return matchUnidade && matchMetodologia && matchCurso && matchProduto;
  
    });
  }, [cursos, filterUnidade, filterMetodologia, filterCurso, filterProduto, profile]);

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

  const handleExport = () => {
    const exportData = filteredCursos.map((c) => ({
      Unidade: c.nomeUnidade,
      Produto: c.produto,
      Curso: c.curso,
      Metodologia: c.metodologia,
      Duração: c.duracao,
      Turno: c.turno || "",
    }));
    exportToExcel(exportData, "Catalogo_Digital");
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

        const rawBatch = importData.map((item) => ({
          nomeUnidade: String(item.Unidade || item.nomeUnidade || "").trim(),
          produto: normalizeProduto(item.Produto || item.produto),
          curso: String(item.Curso || item.curso || "").trim(),
          metodologia: normalizeMetodologia(item.Metodologia || item.metodologia),
          duracao: String(item["Duração"] || item.duracao || "").trim(),
          turno: normalizeTurno(item.Turno || item.turno),
          possuiCoordenador: false,
          createdAt: new Date().toISOString(),
        }));

        let skippedCount = 0;
        const validBatch: any[] = [];
        const seenKeys = new Set<string>();

        for (const item of rawBatch) {
          if (!item.nomeUnidade || !item.curso) continue;
          const key = `${item.nomeUnidade.toLowerCase()}|${item.produto.toLowerCase()}|${item.curso.toLowerCase()}|${item.metodologia.toLowerCase()}|${item.turno.toLowerCase()}`;
          const isDup =
            cursos.some(
              (c) =>
                `${(c.nomeUnidade || "").toLowerCase()}|${(c.produto || "").toLowerCase()}|${(c.curso || "").toLowerCase()}|${(c.metodologia || "").toLowerCase()}|${(c.turno || "").toLowerCase()}` ===
                key
            ) || seenKeys.has(key);

          if (isDup) {
            skippedCount++;
          } else {
            seenKeys.add(key);
            validBatch.push(item);
          }
        }

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

        if (validBatch.length > 0) {
          await processBatch(validBatch);
        }
        
        onToast(
          `${validBatch.length} cursos importados com sucesso!${skippedCount > 0 ? ` (${skippedCount} duplicatas ignoradas)` : ""}`,
          "success"
        );
      } catch (err: any) {
        console.error("Import error:", err);
        onToast(`Erro na importação: ${err.message}`, "error");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const uniqueUnidadesList = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.nomeUnidade))).sort(),
    [cursos],
  );
  const uniqueMetodologiasList = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.metodologia))).sort(),
    [cursos],
  );
  const uniqueCursosList = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.curso))).sort(),
    [cursos],
  );
  const uniqueProdutosList = useMemo(
    () => Array.from(new Set(cursos.map((c) => c.produto))).sort(),
    [cursos],
  );

  const editingCurso = editingId
    ? cursos.find((c) => c.id === editingId)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
            Catálogo Digital
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie o catálogo de cursos, descrições e coordenadores da unidade.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/catalogodigital"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <BookOpen size={18} />
            <span>Ver Revista Digital</span>
          </a>
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
              <span>Importar</span>
            </button>
          </>
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2 shrink-0"
          >
            <Download size={18} />
            <span>Exportar</span>
          </button>
          {!isAdding && (
            <button
              onClick={() => {
                handleResetForm();
                setIsAdding(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2 shrink-0"
            >
              <Plus size={20} />
              <span>Novo Curso</span>
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative">
          <button
            onClick={handleResetForm}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Plus className="text-blue-600" />
            {editingId ? "Editar Curso no Catálogo" : "Cadastrar no Catálogo Digital"}
          </h3>

          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Unidade <span className="text-red-500">*</span>
                </label>
                <input
                  name="nomeUnidade"
                  required
                  defaultValue={editingCurso?.nomeUnidade}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: Polo São Pedro"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Produto <span className="text-red-500">*</span>
                </label>
                <select
                  name="produto"
                  required
                  defaultValue={editingCurso?.produto || "Graduação"}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="Graduação">Graduação</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Pós-graduação">Pós-graduação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Curso <span className="text-red-500">*</span>
                </label>
                <input
                  name="curso"
                  required
                  defaultValue={editingCurso?.curso}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: Administração"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Duração <span className="text-red-500">*</span>
                </label>
                <input
                  name="duracao"
                  required
                  defaultValue={editingCurso?.duracao}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: 4 anos"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Turno
                </label>
                <input
                  name="turno"
                  defaultValue={editingCurso?.turno || ""}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: Manhã, Noite, Integral..."
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-8">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Metodologias Disponíveis <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMetodologias([...metodologias, { nome: "EAD", observacao: "" }])}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  + Adicionar Metodologia
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metodologias.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-3 bg-slate-50 p-5 rounded-2xl relative border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setMetodologias(metodologias.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-rose-600 shadow-sm"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Metodologia</label>
                        <select
                          value={m.nome}
                          onChange={(e) => {
                            const newM = [...metodologias];
                            newM[idx].nome = e.target.value;
                            setMetodologias(newM);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        >
                          {METODOLOGIAS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Observação / Como funciona</label>
                        <input
                          value={m.observacao}
                          onChange={(e) => {
                            const newM = [...metodologias];
                            newM[idx].observacao = e.target.value;
                            setMetodologias(newM);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Encontros semanais..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {metodologias.length === 0 && (
                  <p className="text-sm text-rose-500 font-bold italic p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    ⚠️ Adicione pelo menos uma metodologia para este curso.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Descrição do Curso
                </label>
                <textarea
                  name="descricao"
                  rows={4}
                  defaultValue={editingCurso?.descricao}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  placeholder="Descreva os diferenciais do curso..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Observações / Info Adicional
                </label>
                <textarea
                  name="observacoes"
                  rows={4}
                  defaultValue={editingCurso?.observacoes}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  placeholder="Ex: Nota no MEC, Estágios, etc..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Imagens do Curso (Máximo 3 URLs)
                </label>
                {imagens.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Adicionar Imagem
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {imagens.map((img, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={img}
                      onChange={(e) => handleImageChange(idx, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder={`URL da Imagem ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setImagens(imagens.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {imagens.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Nenhuma imagem adicionada.</p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <div className="flex items-center space-x-3 mb-6">
                <input
                  type="checkbox"
                  id="possuiCoordenador"
                  checked={possuiCoordenador}
                  onChange={(e) => setPossuiCoordenador(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="possuiCoordenador" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Este curso possui coordenador responsável?
                </label>
              </div>

              {possuiCoordenador && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Nome do Coordenador</label>
                    <input
                      value={coordNome}
                      onChange={(e) => setCoordNome(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">URL da Foto</label>
                    <input
                      value={coordFoto}
                      onChange={(e) => setCoordFoto(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Link do Lattes</label>
                    <input
                      value={coordLattes}
                      onChange={(e) => setCoordLattes(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Contato de Atendimento</label>
                    <input
                      value={coordContato}
                      onChange={(e) => setCoordContato(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="WhatsApp ou E-mail"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Breve Biografia</label>
                    <textarea
                      value={coordDesc}
                      onChange={(e) => setCoordDesc(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-1 flex items-center uppercase tracking-widest text-xs"
              >
                <CheckCircle2 size={20} className="mr-2" />
                {editingId ? "Salvar Alterações" : "Adicionar ao Catálogo"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center">
          <Search size={18} className="mr-2 text-slate-400" /> Filtros
          Multiseleção
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueUnidadesList.map((u) => (
                <label key={u} className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterUnidade.includes(u)}
                    onChange={() => toggleFilter(setFilterUnidade, u)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{u}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueProdutosList.map((p) => (
                <label key={p} className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterProduto.includes(p)}
                    onChange={() => toggleFilter(setFilterProduto, p)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Curso</span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueCursosList.map((c) => (
                <label key={c} className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterCurso.includes(c)}
                    onChange={() => toggleFilter(setFilterCurso, c)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{c}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metodologia</span>
            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
              {uniqueMetodologiasList.map((m) => (
                <label key={m} className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterMetodologia.includes(m)}
                    onChange={() => toggleFilter(setFilterMetodologia, m)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{m}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {(filterUnidade.length > 0 || filterProduto.length > 0 || filterCurso.length > 0 || filterMetodologia.length > 0) && (
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">
            Catálogo de Cursos ({filteredCursos.length})
          </h3>
          {selectedIds.length > 0 && (
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
                <th className="px-5 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredCursos.length && filteredCursos.length > 0}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-5 py-4">Unidade</th>
                <th className="px-5 py-4">Produto</th>
                <th className="px-5 py-4">Curso</th>
                <th className="px-5 py-4">Metodologias</th>
                <th className="px-5 py-4 text-center">Imagens</th>
                <th className="px-5 py-4 text-center">Coord.</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredCursos.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={(e) => toggleSelect(c.id, e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800">{c.nomeUnidade}</td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-black uppercase border",
                      c.produto === "Graduação" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      c.produto === "Técnico" ? "bg-orange-50 text-orange-700 border-orange-200" :
                      "bg-purple-50 text-purple-700 border-purple-200",
                    )}>
                      {c.produto}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium">{c.curso}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(c.metodologias || [{ nome: c.metodologia, observacao: "" }]).map((m, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold border border-slate-200">
                          {m.nome}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center -space-x-2">
                      {(c.imagens || []).length > 0 ? (
                        c.imagens?.map((img, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                            <img src={img} alt="Curso" className="w-full h-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300"><ImageIcon size={16} /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {c.possuiCoordenador ? (
                      <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-xs" title={c.coordenador?.nome}>
                        <UserIcon size={14} />
                        <span>Sim</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">Não</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(c)}
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
                </tr>
              ))}
              {filteredCursos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="font-medium text-lg">Nenhum curso encontrado</p>
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
