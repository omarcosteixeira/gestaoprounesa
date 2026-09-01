const fs = require('fs');

const file = 'src/components/GapView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the component implementation
const newCode = `import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Send,
  MessageSquare,
  Bot,
  Filter,
  X,
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

export function GapView({
  gap,
  onToast,
  profile,
  whatsappMessages,
  botConfig,
  onSendBot,
  onMassSendBot,
}: GapViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
      const matchSearch =
        !searchTerm ||
        (item.nome && item.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.telefone && item.telefone.includes(searchTerm)) ||
        (item.cpf && item.cpf.includes(searchTerm)) ||
        (item.curso && item.curso.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus =
        !statusFilter || (item.matAcad ? "Matriculado" : "Pendente") === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [gap, searchTerm, statusFilter]);

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedEntries((prev) => [...prev, id]);
    else setSelectedEntries((prev) => prev.filter((i) => i !== id));
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedEntries(filteredGap.map((g) => g.id));
    else setSelectedEntries([]);
  };

  const handleToggleMatAcad = async (item: GapEntry) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.GAP, item.id), {
        matAcad: !item.matAcad,
      });
      onToast("Status de matrícula acadêmica atualizado!", "success");
    } catch (e: any) {
      onToast(e.message, "error");
    }
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

  const handleExport = () => {
    const data = filteredGap.map((g) => ({
      Nome: g.nome || "",
      Telefone: g.telefone || "",
      CPF: g.cpf || "",
      Curso: g.curso || "",
      Produto: g.produto || "",
      Metodologia: g.metodologia || "",
      Semestre: g.semestre || "",
      "Forma de Ingresso": g.formaIngresso || "",
      "Mat. Acadêmica": g.matAcad ? "Sim" : "Não",
    }));
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
            telefone: String(row.Telefone || row.telefone || row.TELEFONE || ""),
            cpf: String(row.CPF || row.cpf || ""),
            curso: String(row.Curso || row.curso || row.CURSO || ""),
            produto: String(row.Produto || row.produto || row.PRODUTO || ""),
            metodologia: String(row.Metodologia || row.metodologia || row.METODOLOGIA || ""),
            semestre: String(row.Semestre || row.semestre || row.SEMESTRE || ""),
            formaIngresso: String(row["Forma de Ingresso"] || row.formaIngresso || ""),
            matAcad: row["Mat. Acadêmica"] === "Sim" || row.matAcad === true,
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
      telefone: "",
      cpf: "",
      curso: "",
      metodologia: "",
      produto: "",
      semestre: "",
      formaIngresso: "",
      matAcad: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: GapEntry) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">GAP Acadêmico</h2>
          <p className="text-sm text-slate-500">
            Acompanhamento de documentos e matrículas acadêmicas dos candidatos convertidos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openNewModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            <span>Novo Registro</span>
          </button>
          
          <label className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-blue-100 transition-all text-sm font-bold cursor-pointer">
            <Upload size={18} />
            <span>Importar</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
          </label>

          <button
            onClick={handleExport}
            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-slate-200 transition-all text-sm font-bold"
          >
            <Download size={18} />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="">Todos os Status</option>
          <option value="Matriculado">Matriculado</option>
          <option value="Pendente">Pendente</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-700">
            Total: {filteredGap.length} candidatos
          </span>
          {selectedEntries.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setMassSelectorOpen(true)}
                className="text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              >
                <Bot size={14} /> Disparo em Massa ({selectedEntries.length})
              </button>
              <button
                onClick={handleBulkDelete}
                className="text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Excluir ({selectedEntries.length})
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={
                      filteredGap.length > 0 && selectedEntries.length === filteredGap.length
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-6 py-4">Candidato</th>
                <th className="px-6 py-4">Curso / Metodologia</th>
                <th className="px-6 py-4">Forma de Ingresso</th>
                <th className="px-6 py-4 text-center">Matrícula Acadêmica</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGap.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedEntries.includes(item.id)}
                      onChange={(e) => toggleSelect(item.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{item.nome || "-"}</div>
                    <div className="text-xs text-slate-500">{formatPhone(item.telefone || "")}</div>
                    {item.cpf && (
                      <div className="text-xs text-slate-400">{formatCPF(item.cpf)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{item.curso || "-"}</div>
                    <div className="text-xs text-slate-500">{item.metodologia || item.produto || "-"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">{item.formaIngresso || "-"}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleMatAcad(item)}
                      className={\`px-3 py-1.5 rounded-full text-xs font-bold transition-all \${
                        item.matAcad
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      }\`}
                    >
                      {item.matAcad ? "Matriculado (OK)" : "Pendente"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.telefone && (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setSelectorOpen(true);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="WhatsApp"
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredGap.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum registro encontrado no GAP.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingItem ? "Editar Registro" : "Novo Registro GAP"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Nome do Candidato *</label>
                  <input
                    required
                    type="text"
                    value={formData.nome || ""}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone || ""}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="24999999999"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf || ""}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Curso</label>
                  <input
                    type="text"
                    value={formData.curso || ""}
                    onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Metodologia</label>
                  <input
                    type="text"
                    value={formData.metodologia || ""}
                    onChange={(e) => setFormData({ ...formData, metodologia: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Produto</label>
                  <input
                    type="text"
                    value={formData.produto || ""}
                    onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Semestre</label>
                  <input
                    type="text"
                    value={formData.semestre || ""}
                    onChange={(e) => setFormData({ ...formData, semestre: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Forma de Ingresso</label>
                  <input
                    type="text"
                    value={formData.formaIngresso || ""}
                    onChange={(e) => setFormData({ ...formData, formaIngresso: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="matAcad"
                    checked={formData.matAcad || false}
                    onChange={(e) => setFormData({ ...formData, matAcad: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <label htmlFor="matAcad" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Matrícula Acadêmica (OK)
                  </label>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
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

fs.writeFileSync(file, newCode);
console.log('Successfully wrote GapView.tsx');
