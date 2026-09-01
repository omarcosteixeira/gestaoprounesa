const fs = require('fs');

const code = `import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  MessageSquare,
  Bot,
  LayoutDashboard,
  List,
  X,
  Users,
  Clock,
  TrendingUp
} from "lucide-react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { GapEntry, UserProfile, WhatsAppMessage, BotConfig, CalendarioAcao } from "../types";
import { formatPhone, formatCPF, getWhatsAppUrl } from "../lib/utils";
import * as XLSX from "xlsx";
import { WhatsAppMessageSelector } from "./WhatsAppMessageSelector";
import { replaceMessageVariables } from "../App";

interface GapViewProps {
  gap: GapEntry[];
  onToast: (message: string, type?: "success" | "error") => void;
  profile: UserProfile | null;
  whatsappMessages: WhatsAppMessage[];
  botConfig: BotConfig;
  onSendBot: (tel: string, msg: string, contactName?: string) => void;
  onMassSendBot: (messages: { telefone: string; message: string; nome?: string }[]) => void;
  calendarioAcoes?: CalendarioAcao[];
}

const DOC_LABELS = [
  { key: 'rg', label: 'RG' },
  { key: 'cpfDoc', label: 'CPF' },
  { key: 'diploma', label: 'Diploma' },
  { key: 'enem', label: 'ENEM' },
  { key: 'historico', label: 'Hist.' },
  { key: 'plano', label: 'Plano' },
  { key: 'contrato', label: 'Contr.' },
  { key: 'carta', label: 'Carta' },
];

const STATUS_OPTIONS = [
  "MATRÍCULA GERADA",
  "PENDENTE",
  "AGUARDANDO",
  "DESISTENTE"
];

const getStatusColor = (status: string) => {
  switch(status) {
    case "MATRÍCULA GERADA": return "bg-emerald-100 text-emerald-700";
    case "PENDENTE": return "bg-amber-100 text-amber-700";
    case "AGUARDANDO": return "bg-blue-100 text-blue-700";
    case "DESISTENTE": return "bg-rose-100 text-rose-700";
    default: return "bg-slate-100 text-slate-700";
  }
};

const getStatusColorHex = (status: string) => {
  switch(status) {
    case "MATRÍCULA GERADA": return "#10b981"; // emerald-500
    case "PENDENTE": return "#f59e0b"; // amber-500
    case "AGUARDANDO": return "#3b82f6"; // blue-500
    case "DESISTENTE": return "#f43f5e"; // rose-500
    default: return "#cbd5e1"; // slate-300
  }
};

const normalizeStatus = (matAcad: any) => {
  if (typeof matAcad === 'boolean') return matAcad ? "MATRÍCULA GERADA" : "PENDENTE";
  return matAcad || "PENDENTE";
};

export function GapView({
  gap,
  onToast,
  profile,
  whatsappMessages,
  botConfig,
  onSendBot,
  onMassSendBot,
  calendarioAcoes = [],
}: GapViewProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "lista">("lista");
  
  // Filters
  const [filterNome, setFilterNome] = useState("");
  const [filterCPF, setFilterCPF] = useState("");
  const [filterProduto, setFilterProduto] = useState("");
  const [filterCurso, setFilterCurso] = useState("");
  const [filterPeriodo, setFilterPeriodo] = useState("");
  const [filterMatAcad, setFilterMatAcad] = useState("");
  const [filterGapDocs, setFilterGapDocs] = useState("");

  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GapEntry | null>(null);
  const [massSelectorOpen, setMassSelectorOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GapEntry | null>(null);
  const [formData, setFormData] = useState<Partial<GapEntry>>({});
  const [loading, setLoading] = useState(false);

  const filteredGap = useMemo(() => {
    return gap.filter((item) => {
      const status = normalizeStatus(item.matAcad);
      const docs = item.documentos || {};
      const pendingDocs = DOC_LABELS.filter(d => !docs[d.key]).length > 0;
      
      const matchNome = !filterNome || (item.nome || "").toLowerCase().includes(filterNome.toLowerCase());
      const matchCPF = !filterCPF || (item.cpf || "").includes(filterCPF);
      const matchProduto = !filterProduto || item.produto === filterProduto;
      const matchCurso = !filterCurso || (item.curso || "").toLowerCase().includes(filterCurso.toLowerCase());
      const matchPeriodo = !filterPeriodo || (item.periodo || item.semestre || "").includes(filterPeriodo);
      const matchMatAcad = !filterMatAcad || status === filterMatAcad;
      const matchGapDocs = !filterGapDocs || 
        (filterGapDocs === "Com Pendência" ? pendingDocs : !pendingDocs);

      return matchNome && matchCPF && matchProduto && matchCurso && matchPeriodo && matchMatAcad && matchGapDocs;
    });
  }, [gap, filterNome, filterCPF, filterProduto, filterCurso, filterPeriodo, filterMatAcad, filterGapDocs]);

  const uniqueProdutos = useMemo(() => {
    return Array.from(new Set(gap.map(g => g.produto).filter(Boolean))) as string[];
  }, [gap]);

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedEntries((prev) => [...prev, id]);
    else setSelectedEntries((prev) => prev.filter((i) => i !== id));
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedEntries(filteredGap.map((g) => g.id));
    else setSelectedEntries([]);
  };

  const updateField = async (id: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.GAP, id), {
        [field]: value,
      });
      onToast("Atualizado com sucesso!", "success");
    } catch (e: any) {
      onToast(e.message, "error");
    }
  };

  const toggleDoc = async (item: GapEntry, docKey: string) => {
    const docs = { ...(item.documentos || {}) };
    docs[docKey] = !docs[docKey];
    updateField(item.id, "documentos", docs);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir este registro do GAP?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.GAP, id));
      onToast("Registro excluído!", "success");
    } catch (e: any) {
      onToast(e.message, "error");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(\`Deseja excluir \${selectedEntries.length} registros selecionados?\`)) return;
    try {
      const batch = writeBatch(db);
      selectedEntries.forEach((id) => {
        batch.delete(doc(db, COLLECTIONS.GAP, id));
      });
      await batch.commit();
      onToast(\`\${selectedEntries.length} registros excluídos!\`, "success");
      setSelectedEntries([]);
    } catch (e: any) {
      onToast(e.message, "error");
    }
  };

  const checkDuplicates = () => {
    const cpfMap: Record<string, number> = {};
    const dups = new Set<string>();
    
    gap.forEach(g => {
      if (g.cpf) {
        if (cpfMap[g.cpf]) dups.add(g.cpf);
        cpfMap[g.cpf] = (cpfMap[g.cpf] || 0) + 1;
      }
    });

    if (dups.size > 0) {
      onToast(\`Encontrados CPFs duplicados: \${Array.from(dups).join(", ")}\`, "error");
      setFilterCPF(Array.from(dups)[0]);
    } else {
      onToast("Nenhuma duplicidade encontrada.", "success");
    }
  };

  const handleExport = () => {
    const data = filteredGap.map((g) => {
      const docs = g.documentos || {};
      const status = normalizeStatus(g.matAcad);
      return {
        Nome: g.nome || "",
        CPF: g.cpf || "",
        Telefone: g.telefone || "",
        Produto: g.produto || "",
        "Nº Oportunidade": g.numeroOportunidade || "",
        Curso: g.curso || "",
        Período: g.periodo || g.semestre || "",
        Metodologia: g.metodologia || "",
        "Forma de Ingresso": g.formaIngresso || "",
        "Nº Matrícula": g.numeroMatricula || "",
        "Mat. Acadêmica": status,
        RG: docs.rg ? "Ok" : "Pendente",
        "CPF Doc": docs.cpfDoc ? "Ok" : "Pendente",
        Diploma: docs.diploma ? "Ok" : "Pendente",
        ENEM: docs.enem ? "Ok" : "Pendente",
        Histórico: docs.historico ? "Ok" : "Pendente",
        Plano: docs.plano ? "Ok" : "Pendente",
        Contrato: docs.contrato ? "Ok" : "Pendente",
        Carta: docs.carta ? "Ok" : "Pendente",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GAP");
    XLSX.writeFile(workbook, "GAP_Academico.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          onToast("Arquivo vazio ou formato inválido.", "error");
          return;
        }

        const batch = writeBatch(db);
        let count = 0;

        for (const row of data as any[]) {
          const nome = row.Nome || row.nome || row.NOME;
          if (!nome) continue;

          const newDocRef = doc(collection(db, COLLECTIONS.GAP));
          batch.set(newDocRef, {
            nome,
            cpf: String(row.CPF || row.cpf || ""),
            telefone: String(row.Telefone || row.telefone || row.TELEFONE || ""),
            produto: String(row.Produto || row.produto || row.PRODUTO || ""),
            numeroOportunidade: String(row["Nº Oportunidade"] || row.numeroOportunidade || ""),
            curso: String(row.Curso || row.curso || row.CURSO || ""),
            periodo: String(row.Período || row.periodo || row.semestre || ""),
            metodologia: String(row.Metodologia || row.metodologia || row.METODOLOGIA || ""),
            formaIngresso: String(row["Forma de Ingresso"] || row.formaIngresso || ""),
            numeroMatricula: String(row["Nº Matrícula"] || row.numeroMatricula || ""),
            matAcad: row["Mat. Acadêmica"] || row.matAcad || "PENDENTE",
            createdAt: serverTimestamp(),
          });
          count++;
        }

        await batch.commit();
        onToast(\`\${count} registros importados com sucesso!\`, "success");
      } catch (err: any) {
        onToast("Erro ao importar arquivo: " + err.message, "error");
      }
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.GAP, editingItem.id), {
          ...formData,
        });
        onToast("Registro atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, COLLECTIONS.GAP), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        onToast("Registro criado com sucesso!", "success");
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
    } catch (err: any) {
      onToast("Erro ao salvar: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingItem(null);
    setFormData({
      nome: "",
      cpf: "",
      telefone: "",
      produto: "Graduação",
      numeroOportunidade: "",
      curso: "",
      periodo: "",
      semestre: "",
      metodologia: "SEMIPRESENCIAL",
      formaIngresso: "",
      numeroMatricula: "",
      acaoId: "",
      acao: "",
      matAcad: "PENDENTE",
      documentos: {}
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: GapEntry) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  // Dashboard calculations
  const dashboardStats = useMemo(() => {
    const total = gap.length;
    let ok = 0;
    let pendente = 0;
    let aguardando = 0;
    let desistente = 0;
    let gapDocsPendentes = 0;

    const prodCount: Record<string, number> = {};

    gap.forEach(g => {
      const status = normalizeStatus(g.matAcad);
      if (status === "MATRÍCULA GERADA" || status === "OK") ok++;
      else if (status === "PENDENTE") pendente++;
      else if (status === "AGUARDANDO") aguardando++;
      else if (status === "DESISTENTE") desistente++;

      const docs = g.documentos || {};
      const pendingDocs = DOC_LABELS.filter(d => !docs[d.key]).length > 0;
      if (pendingDocs) gapDocsPendentes++;

      const prod = g.produto || "Graduação";
      prodCount[prod] = (prodCount[prod] || 0) + 1;
    });

    const taxa = total > 0 ? ((ok / total) * 100).toFixed(1) : "0.0";

    return { total, ok, pendente, aguardando, desistente, gapDocsPendentes, taxa, prodCount };
  }, [gap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">GAP Acadêmico</h2>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all \${
              activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
            }\`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab("lista")}
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all \${
              activeTab === "lista" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
            }\`}
          >
            <List size={16} /> Lista de Alunos
          </button>
        </div>
      </div>

      {activeTab === "lista" && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={openNewModal}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-200"
            >
              <Plus size={18} />
              <span>Cadastrar</span>
            </button>
            <label className="bg-white text-blue-600 border border-slate-200 px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-slate-50 transition-all text-sm font-bold cursor-pointer">
              <Upload size={18} />
              <span>Importar</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={checkDuplicates}
              className="bg-purple-50 text-purple-600 border border-purple-100 px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-purple-100 transition-all text-sm font-bold"
            >
              <CheckCircle2 size={18} />
              <span>Verificar Duplicidade</span>
            </button>
            <button
              onClick={handleExport}
              className="bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-slate-50 transition-all text-sm font-bold"
            >
              <Download size={18} />
              <span>Exportar</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Nome..."
              value={filterNome}
              onChange={(e) => setFilterNome(e.target.value)}
              className="flex-1 min-w-[150px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />
            <input
              type="text"
              placeholder="CPF..."
              value={filterCPF}
              onChange={(e) => setFilterCPF(e.target.value)}
              className="flex-1 min-w-[130px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />
            <select
              value={filterProduto}
              onChange={(e) => setFilterProduto(e.target.value)}
              className="flex-1 min-w-[130px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            >
              <option value="">Produto</option>
              {uniqueProdutos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Curso..."
              value={filterCurso}
              onChange={(e) => setFilterCurso(e.target.value)}
              className="flex-1 min-w-[130px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />
            <input
              type="text"
              placeholder="Período..."
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              className="flex-1 min-w-[100px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />
            <select
              value={filterMatAcad}
              onChange={(e) => setFilterMatAcad(e.target.value)}
              className="flex-1 min-w-[150px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            >
              <option value="">Mat. Acadêmica</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterGapDocs}
              onChange={(e) => setFilterGapDocs(e.target.value)}
              className="flex-1 min-w-[130px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
            >
              <option value="">Gap (Docs)</option>
              <option value="Sem Pendência">Sem Pendência</option>
              <option value="Com Pendência">Com Pendência</option>
            </select>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-sm font-bold text-slate-700">
                Total: {filteredGap.length} candidatos
              </span>
              {selectedEntries.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setMassSelectorOpen(true)}
                    className="text-blue-600 font-bold bg-blue-100 px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 hover:bg-blue-200 transition-colors"
                  >
                    <Bot size={14} /> Disparo em Massa ({selectedEntries.length})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="text-rose-600 font-bold bg-rose-100 px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 hover:bg-rose-200 transition-colors"
                  >
                    <Trash2 size={14} /> Excluir ({selectedEntries.length})
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-12 border-b border-slate-100">
                      <input
                        type="checkbox"
                        checked={
                          filteredGap.length > 0 && selectedEntries.length === filteredGap.length
                        }
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                    </th>
                    <th className="px-6 py-4 border-b border-slate-100">Candidato</th>
                    <th className="px-6 py-4 border-b border-slate-100">Curso / Produto</th>
                    <th className="px-6 py-4 border-b border-slate-100">Documentação</th>
                    <th className="px-6 py-4 border-b border-slate-100">Mat. Acad.</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGap.map((item) => {
                    const status = normalizeStatus(item.matAcad);
                    const docs = item.documentos || {};
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedEntries.includes(item.id)}
                            onChange={(e) => toggleSelect(item.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-base mb-1 cursor-pointer hover:text-blue-600" onClick={() => openEditModal(item)}>
                            {item.nome || "-"}
                          </div>
                          {item.cpf && <div className="text-xs text-slate-500">{formatCPF(item.cpf)}</div>}
                          {item.telefone && <div className="text-xs text-slate-500">{formatPhone(item.telefone)}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700 uppercase">{item.curso || "-"}</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>{item.produto || "Graduação"}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>{item.periodo || item.semestre || "2026.3"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {DOC_LABELS.map(docLabel => {
                              const hasDoc = docs[docLabel.key];
                              return (
                                <button
                                  key={docLabel.key}
                                  onClick={() => toggleDoc(item, docLabel.key)}
                                  className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors \${
                                    hasDoc ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  }\`}
                                >
                                  {docLabel.label}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={status}
                            onChange={(e) => updateField(item.id, "matAcad", e.target.value)}
                            className={\`text-xs font-bold px-3 py-2 rounded-xl outline-none appearance-none pr-8 cursor-pointer border border-transparent hover:border-slate-200 transition-colors \${getStatusColor(status)}\`}
                            style={{
                              backgroundImage: \`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")\`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '1.5em 1.5em'
                            }}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.telefone && (
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setSelectorOpen(true);
                                }}
                                className="text-emerald-500 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="WhatsApp"
                              >
                                <MessageSquare size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredGap.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        Nenhum registro encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TOTAL MAT. FINANCEIRA</p>
                <h3 className="text-3xl font-black text-slate-800">{dashboardStats.total}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Users size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">MAT. ACADÊMICA OK</p>
                <h3 className="text-3xl font-black text-slate-800">{dashboardStats.ok}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">GAP (DOCS PENDENTES)</p>
                <h3 className="text-3xl font-black text-slate-800">{dashboardStats.gapDocsPendentes}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <Clock size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TAXA CONV. ACAD</p>
                <h3 className="text-3xl font-black text-slate-800">{dashboardStats.taxa}%</h3>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <CheckCircle2 size={16} />
                </span>
                Distribuição de Matrícula Acadêmica
              </h3>
              <div className="space-y-4">
                {[
                  { label: "OK", count: dashboardStats.ok, color: "bg-emerald-500" },
                  { label: "Pendente", count: dashboardStats.pendente, color: "bg-amber-500" },
                  { label: "Aguardando", count: dashboardStats.aguardando, color: "bg-blue-500" },
                  { label: "Desistente", count: dashboardStats.desistente, color: "bg-rose-500" },
                ].map(stat => {
                  const pct = dashboardStats.total > 0 ? (stat.count / dashboardStats.total) * 100 : 0;
                  return (
                    <div key={stat.label}>
                      <div className="flex justify-between text-sm mb-1 font-bold">
                        <div className="flex items-center gap-2">
                          <span className={\`w-2 h-2 rounded-full \${stat.color}\`}></span>
                          <span className="text-slate-600">{stat.label}</span>
                        </div>
                        <span className="text-slate-800">{stat.count} <span className="text-slate-400 font-normal">({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className={\`h-2.5 rounded-full \${stat.color}\`} style={{ width: \`\${pct}%\` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <LayoutDashboard size={16} />
                </span>
                Distribuição por Produto
              </h3>
              <div className="space-y-4">
                {Object.entries(dashboardStats.prodCount).sort((a,b) => b[1] - a[1]).map(([prod, count]) => {
                  const pct = dashboardStats.total > 0 ? (count / dashboardStats.total) * 100 : 0;
                  return (
                    <div key={prod}>
                      <div className="flex justify-between text-sm mb-1 font-bold">
                        <span className="text-slate-600">{prod}</span>
                        <span className="text-slate-800">{count} <span className="text-slate-400 font-normal">({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-blue-500" style={{ width: \`\${pct}%\` }}></div>
                      </div>
                    </div>
                  )
                })}
                {Object.keys(dashboardStats.prodCount).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">Nenhum dado disponível.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for WhatsApp */}
      <WhatsAppMessageSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        leadName={selectedItem?.nome || ""}
        leadCurso={selectedItem?.curso || ""}
        messages={whatsappMessages.filter((m) => m.tipo === "gap" || m.tipo === "bases")}
        onSelect={(msg) => {
          if (selectedItem?.telefone) {
            window.open(getWhatsAppUrl(selectedItem.telefone, msg), "_blank");
          }
        }}
        botConfig={botConfig}
        onSendBot={(msg, contactName) => {
          if (selectedItem?.telefone) {
            onSendBot(
              selectedItem.telefone,
              Array.isArray(msg) ? msg[0] : msg,
              contactName || selectedItem.nome,
            );
          }
        }}
      />

      <WhatsAppMessageSelector
        isOpen={massSelectorOpen}
        onClose={() => setMassSelectorOpen(false)}
        leadName="Candidatos GAP"
        messages={whatsappMessages.filter((m) => m.tipo === "gap" || m.tipo === "bases")}
        onSelect={() => {}}
        botConfig={botConfig}
        onSendBot={(msgTemplates) => {
          const templates = Array.isArray(msgTemplates) ? msgTemplates : [msgTemplates];
          const selectedObjs = gap.filter((g) => selectedEntries.includes(g.id));

          const messagesPayload = selectedObjs.map((g, idx) => {
            const template = templates[idx % templates.length];
            return {
              telefone: g.telefone || "",
              message: replaceMessageVariables(template, g),
              nome: g.nome,
            };
          });

          onMassSendBot(messagesPayload);
          setMassSelectorOpen(false);
          setSelectedEntries([]);
        }}
        forceBotOnly={true}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl flex flex-col shadow-2xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">
                {editingItem ? "Editar Candidato" : "Novo Candidato"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={formData.nome || ""}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf || ""}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                    placeholder="000.000.000-00"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone || ""}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                    placeholder="(24) 99999-9999"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Produto</label>
                  <select
                    value={formData.produto || "Graduação"}
                    onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                  >
                    <option value="Graduação">Graduação</option>
                    <option value="Pós-graduação">Pós-graduação</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Profissionalizante">Profissionalizante</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">N° Oportunidade</label>
                  <input
                    type="text"
                    value={formData.numeroOportunidade || ""}
                    onChange={(e) => setFormData({ ...formData, numeroOportunidade: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Curso</label>
                  <input
                    type="text"
                    value={formData.curso || ""}
                    onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 uppercase"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Período</label>
                  <input
                    type="text"
                    value={formData.periodo || formData.semestre || ""}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value, semestre: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Semestre</label>
                  <input
                    type="text"
                    value={formData.semestre || ""}
                    onChange={(e) => setFormData({ ...formData, semestre: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Metodologia</label>
                  <input
                    type="text"
                    value={formData.metodologia || ""}
                    onChange={(e) => setFormData({ ...formData, metodologia: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">Forma de Ingresso</label>
                  <input
                    type="text"
                    value={formData.formaIngresso || ""}
                    onChange={(e) => setFormData({ ...formData, formaIngresso: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">N° Matrícula</label>
                  <input
                    type="text"
                    value={formData.numeroMatricula || ""}
                    onChange={(e) => setFormData({ ...formData, numeroMatricula: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">
                    Ação Vinculada (Opcional)
                    <span className="block text-xs text-slate-400 font-normal">Selecionar do Calendário</span>
                  </label>
                  <select
                    value={formData.acaoId || ""}
                    onChange={(e) => setFormData({ ...formData, acaoId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                  >
                    <option value="">Nenhuma ação vinculada</option>
                    {calendarioAcoes?.map(acao => (
                      <option key={acao.id} value={acao.id}>{acao.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-600">
                    <br />
                    <span className="block text-xs text-slate-400 font-normal">Digitar Nome da Ação/Origem</span>
                  </label>
                  <input
                    type="text"
                    value={formData.acao || ""}
                    onChange={(e) => setFormData({ ...formData, acao: e.target.value })}
                    placeholder="Ex: Facebook, Panfletagem, etc."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                  />
                </div>
              </div>
              
              <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`
fs.writeFileSync('src/components/GapView.tsx', code);
console.log("Updated GapView.tsx");
