import React, { useState, useMemo } from "react";
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
  PhoneOutgoing,
  Mail,
  Bot,
  Filter,
  X,
  Database,
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
import { BaseEntry, UserProfile, WhatsAppMessage, BotConfig } from "../types";
import { formatPhone, formatCPF, getWhatsAppUrl } from "../lib/utils";
import * as XLSX from "xlsx";
import { WhatsAppMessageSelector } from "./WhatsAppMessageSelector";
import { replaceMessageVariables } from "../App";

interface BasesRenovacaoViewProps {
  bases: BaseEntry[];
  onToast: (message: string, type?: "success" | "error") => void;
  profile: UserProfile | null;
  whatsappMessages: WhatsAppMessage[];
  botConfig: BotConfig;
  onSendBot: (tel: string, msg: string, contactName?: string) => void;
  onMassSendBot: (messages: { telefone: string; message: string; nome?: string }[]) => void;
}

export function BasesRenovacaoView({
  bases,
  onToast,
  profile,
  whatsappMessages,
  botConfig,
  onSendBot,
  onMassSendBot,
}: BasesRenovacaoViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BaseEntry | null>(null);
  const [massSelectorOpen, setMassSelectorOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    cpf: "",
    curso: "",
    semestre: "",
    nomeBase: "Base Líquida",
  });

  const filteredBases = useMemo(() => {
    return bases.filter((item) => {
      const matchSearch =
        !searchTerm ||
        (item.nome && item.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.telefone && item.telefone.includes(searchTerm)) ||
        (item.cpf && item.cpf.includes(searchTerm)) ||
        (item.curso && item.curso.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = !statusFilter || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bases, searchTerm, statusFilter]);

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedEntries((prev) => [...prev, id]);
    else setSelectedEntries((prev) => prev.filter((i) => i !== id));
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedEntries(filteredBases.map((b) => b.id));
    else setSelectedEntries([]);
  };

  const handleContatoViaSales = async (contact: any, origem: string) => {
    try {
      await addDoc(collection(db, COLLECTIONS.SALES_CONTACTS), {
        contactId: contact.id,
        nome: contact.nome,
        telefone: contact.telefone,
        curso: contact.cursoInteresse || contact.curso || "Não informado",
        origem,
        createdAt: serverTimestamp(),
      });
      onToast("Contato via Sales registrado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      onToast("Erro ao registrar Contato via Sales.", "error");
    }
  };

  const handleContatoViaWhats = async (contact: any, origem: string) => {
    try {
      await addDoc(collection(db, COLLECTIONS.WHATS_CONTACTS), {
        contactId: contact.id || '',
        nome: contact.nome || 'Não informado',
        telefone: contact.telefone || 'Não informado',
        curso: contact.cursoInteresse || contact.curso || 'Não informado',
        origem,
        createdAt: serverTimestamp(),
      });
      onToast("Envio via Whats registrado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      onToast("Erro ao registrar Envio via Whats.", "error");
    }
  };

  const handleContatoViaMalaDireta = async (contact: any, origem: string) => {
    try {
      await addDoc(collection(db, COLLECTIONS.MALA_DIRETA_CONTACTS), {
        contactId: contact.id || '',
        nome: contact.nome || 'Não informado',
        telefone: contact.telefone || 'Não informado',
        curso: contact.cursoInteresse || contact.curso || 'Não informado',
        origem,
        createdAt: serverTimestamp(),
      });
      onToast("Envio via Mala Direta registrado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      onToast("Erro ao registrar Envio via Mala Direta.", "error");
    }
  };

  const handleStatusChange = async (id: string, status: any) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.BASES_RENOVACAO, id), { status });
      onToast("Status atualizado!");
    } catch (e: any) {
      onToast(e.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir este registro da Base Líquida?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.BASES_RENOVACAO, id));
      onToast("Registro excluído!");
    } catch (e: any) {
      onToast(e.message, "error");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Deseja excluir ${selectedEntries.length} registros selecionados?`)) return;
    try {
      const batch = writeBatch(db);
      selectedEntries.forEach((id) => {
        batch.delete(doc(db, COLLECTIONS.BASES_RENOVACAO, id));
      });
      await batch.commit();
      onToast(`${selectedEntries.length} registros excluídos!`, "success");
      setSelectedEntries([]);
    } catch (e: any) {
      onToast(e.message, "error");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, COLLECTIONS.BASES_RENOVACAO), {
        ...formData,
        cpf: formData.cpf.replace(/\D/g, ""),
        telefone: formData.telefone.replace(/\D/g, ""),
        status: "Pendente",
        produto: "Graduação",
        unidade: profile?.unidade || "",
        createdAt: serverTimestamp(),
      });
      onToast("Registro adicionado com sucesso!", "success");
      setShowAddModal(false);
      setFormData({
        nome: "",
        telefone: "",
        email: "",
        cpf: "",
        curso: "",
        semestre: "",
        nomeBase: "Base Líquida",
      });
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  const handleExport = () => {
    const data = filteredBases.map((b) => ({
      Nome: b.nome,
      Telefone: b.telefone,
      CPF: b.cpf || "",
      Email: b.email || "",
      Curso: b.curso,
      Semestre: b.semestre || "",
      Status: b.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaseLiquida");
    XLSX.writeFile(workbook, "Base_Liquida.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-blue-600" size={24} />
            Base Líquida (Renovação)
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhamento e contato com alunos da base líquida
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            <span>Novo Aluno</span>
          </button>
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
            placeholder="Buscar por nome, telefone, CPF, curso..."
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
          <option value="Pendente">Pendente</option>
          <option value="Interessado">Interessado</option>
          <option value="Convertido">Convertido</option>
          <option value="Sem retorno">Sem retorno</option>
          <option value="Não tem interesse">Não tem interesse</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-700">
            Total: {filteredBases.length} registros
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
                      filteredBases.length > 0 && selectedEntries.length === filteredBases.length
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Curso / Semestre</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBases.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedEntries.includes(item.id)}
                      onChange={(e) => toggleSelect(item.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{item.nome}</div>
                    <div className="text-xs text-slate-500">{formatPhone(item.telefone)}</div>
                    {item.cpf && (
                      <div className="text-xs text-slate-400">{formatCPF(item.cpf)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{item.curso}</div>
                    <div className="text-xs text-slate-500">{item.semestre || "-"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={item.status || "Pendente"}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Interessado">Interessado</option>
                      <option value="Convertido">Convertido</option>
                      <option value="Sem retorno">Sem retorno</option>
                      <option value="Não tem interesse">Não tem interesse</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {item.telefone && (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setSelectorOpen(true);
                          }}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="WhatsApp"
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleContatoViaSales(item, item.nomeBase ? `Base Líquida - ${item.nomeBase}` : 'Base Líquida')}
                        className="inline-flex items-center space-x-1 text-sky-600 font-bold text-xs hover:text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Registrar Contato via Sales"
                      >
                        <PhoneOutgoing size={14} />
                        <span>Sales</span>
                      </button>
                      <button
                        onClick={() => handleContatoViaWhats(item, item.nomeBase ? `Base Líquida - ${item.nomeBase}` : 'Base Líquida')}
                        className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-xs hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Registrar Envio via Whats"
                      >
                        <Send size={14} />
                        <span>Envio Whats</span>
                      </button>
                      <button
                        onClick={() => handleContatoViaMalaDireta(item, item.nomeBase ? `Base Líquida - ${item.nomeBase}` : 'Base Líquida')}
                        className="inline-flex items-center space-x-1 text-amber-600 font-bold text-xs hover:text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Registrar Envio via Mala Direta"
                      >
                        <Mail size={14} />
                        <span>Envio Mala Direta</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-rose-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum registro na base de renovação.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Adicionar à Base Líquida</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <input
                placeholder="Nome do Aluno *"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                placeholder="Telefone / WhatsApp *"
                required
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                placeholder="CPF"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                placeholder="Curso"
                required
                value={formData.curso}
                onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                placeholder="Semestre (Ex: 2025.1)"
                value={formData.semestre}
                onChange={(e) => setFormData({ ...formData, semestre: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}

      <WhatsAppMessageSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        leadName={selectedItem?.nome || ""}
        leadCurso={selectedItem?.curso || ""}
        messages={whatsappMessages.filter((m) => m.tipo === "bases" || m.tipo === "historico")}
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
        leadName="Alunos Base Líquida"
        messages={whatsappMessages.filter((m) => m.tipo === "bases" || m.tipo === "historico")}
        onSelect={() => {}}
        botConfig={botConfig}
        onSendBot={(msgTemplates) => {
          const templates = Array.isArray(msgTemplates) ? msgTemplates : [msgTemplates];
          const selectedObjs = bases.filter((b) => selectedEntries.includes(b.id));
          const messagesPayload = selectedObjs.map((b, idx) => {
            const template = templates[idx % templates.length];
            return {
              telefone: b.telefone || "",
              message: replaceMessageVariables(template, b),
              nome: b.nome,
            };
          });
          onMassSendBot(messagesPayload);
          setMassSelectorOpen(false);
          setSelectedEntries([]);
        }}
        forceBotOnly={true}
      />
    </div>
  );
}
