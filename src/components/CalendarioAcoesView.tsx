import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  X,
  Send,
  MessageSquare,
  FileText,
} from "lucide-react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { CalendarioAcao, UserProfile, Lead, GapEntry } from "../types";
import * as XLSX from "xlsx";

interface CalendarioAcoesViewProps {
  data: CalendarioAcao[];
  onToast: (message: string, type?: "success" | "error") => void;
  profile: UserProfile;
  initialData?: Partial<CalendarioAcao> | null;
  onClearInitialData?: () => void;
  users: UserProfile[];
  callBotApi?: any;
  leads?: Lead[];
  gap?: GapEntry[];
  onSendWhatsApp?: (tel: string, msg: string) => Promise<void>;
}

export function CalendarioAcoesView({
  data,
  onToast,
  profile,
  initialData,
  onClearInitialData,
  users,
  onSendWhatsApp,
}: CalendarioAcoesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(!!initialData);
  const [editingAcao, setEditingAcao] = useState<CalendarioAcao | null>(null);

  const [formData, setFormData] = useState<Partial<CalendarioAcao>>({
    nome: initialData?.nome || "",
    dataInicio: initialData?.dataInicio || new Date().toISOString().split("T")[0],
    dataFim: initialData?.dataFim || new Date().toISOString().split("T")[0],
    local: initialData?.local || "",
    observacao: initialData?.observacao || "",
    concluida: false,
    metaBoletos: 10,
    metaInscritos: 20,
    valorPromotor: 50,
    promotoresSelecionados: [],
  });

  const filteredAcoes = useMemo(() => {
    return data.filter((a) => {
      return (
        !searchTerm ||
        a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.local.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAcao) {
        await updateDoc(doc(db, COLLECTIONS.CALENDARIO_ACOES, editingAcao.id), {
          ...formData,
        });
        onToast("Ação atualizada com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.CALENDARIO_ACOES), {
          ...formData,
          creatorId: profile.uid,
          creatorRole: profile.role,
          unidade: profile.unidade || "",
          concluida: false,
          createdAt: serverTimestamp(),
        });
        onToast("Ação agendada com sucesso!");
      }
      setIsModalOpen(false);
      setEditingAcao(null);
      if (onClearInitialData) onClearInitialData();
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  const handleToggleConcluida = async (acao: CalendarioAcao) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.CALENDARIO_ACOES, acao.id), {
        concluida: !acao.concluida,
      });
      onToast("Status da ação atualizado!");
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir esta ação do plano de ação?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.CALENDARIO_ACOES, id));
      onToast("Ação excluída com sucesso!");
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  const handleExport = () => {
    const exportData = filteredAcoes.map((a) => ({
      Nome: a.nome,
      "Data Início": a.dataInicio,
      "Data Fim": a.dataFim,
      Local: a.local,
      "Meta Inscritos": a.metaInscritos || 0,
      "Meta Boletos": a.metaBoletos || 0,
      Concluída: a.concluida ? "Sim" : "Não",
      Observação: a.observacao,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PlanoAcoes");
    XLSX.writeFile(workbook, "Plano_de_Acoes.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" size={28} />
            Plano de Ação / Calendário de Eventos
          </h2>
          <p className="text-sm text-slate-500">
            Organize ações externas, panfletagens, parcerias e escalas de promotores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEditingAcao(null);
              setFormData({
                nome: "",
                dataInicio: new Date().toISOString().split("T")[0],
                dataFim: new Date().toISOString().split("T")[0],
                local: "",
                observacao: "",
                concluida: false,
                metaBoletos: 10,
                metaInscritos: 20,
                valorPromotor: 50,
                promotoresSelecionados: [],
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            <span>Nova Ação</span>
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
            placeholder="Buscar por nome da ação ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAcoes.map((acao) => (
          <div
            key={acao.id}
            className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all bg-white ${
              acao.concluida ? "border-emerald-200 bg-emerald-50/20" : "border-slate-100"
            }`}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    acao.concluida ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {acao.concluida ? "Concluída" : "Agendada"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingAcao(acao);
                      setFormData(acao);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(acao.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{acao.nome}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-slate-400" />
                  {acao.local || "Local não informado"}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Período:</span>
                  <span className="font-bold text-slate-700">
                    {acao.dataInicio} {acao.dataFim && acao.dataFim !== acao.dataInicio ? `a ${acao.dataFim}` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Meta Inscritos / Boletos:</span>
                  <span className="font-bold text-blue-600">
                    {acao.metaInscritos || 0} / {acao.metaBoletos || 0}
                  </span>
                </div>
              </div>

              {acao.observacao && (
                <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {acao.observacao}
                </p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleToggleConcluida(acao)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  acao.concluida
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200"
                }`}
              >
                {acao.concluida ? "Reabrir Ação" : "Marcar como Concluída"}
              </button>
            </div>
          </div>
        ))}
        {filteredAcoes.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 italic">
            Nenhuma ação cadastrada no plano.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {editingAcao ? "Editar Ação" : "Nova Ação / Evento"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingAcao(null);
                  if (onClearInitialData) onClearInitialData();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nome da Ação *
                </label>
                <input
                  required
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Panfletagem Shopping"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataInicio || ""}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataFim || ""}
                    onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Local / Endereço *
                </label>
                <input
                  required
                  value={formData.local || ""}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Praça Central, Rua das Flores..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Meta Inscritos
                  </label>
                  <input
                    type="number"
                    value={formData.metaInscritos || 0}
                    onChange={(e) => setFormData({ ...formData, metaInscritos: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Meta Boletos
                  </label>
                  <input
                    type="number"
                    value={formData.metaBoletos || 0}
                    onChange={(e) => setFormData({ ...formData, metaBoletos: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Observações / Detalhes
                </label>
                <textarea
                  rows={3}
                  value={formData.observacao || ""}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Instruções para promotores, horários, material necessário..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
              >
                {editingAcao ? "Salvar Alterações" : "Criar Ação"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
