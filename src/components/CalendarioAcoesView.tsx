import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Building2,
  Check,
  ChevronDown,
  Image as ImageIcon,
  DollarSign,
  Target,
  FileText,
  Eye,
  ExternalLink,
} from "lucide-react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { CalendarioAcao, UserProfile, Lead, GapEntry, EmpresaParceira } from "../types";
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
  onSendNotification?: (textToSearch: string, taskTitle: string, taskType: string) => void;
  empresasParceiras?: EmpresaParceira[];
}

export function CalendarioAcoesView({
  data,
  onToast,
  profile,
  initialData,
  onClearInitialData,
  users,
  leads = [],
  gap = [],
  onSendNotification,
  empresasParceiras = [],
}: CalendarioAcoesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "agendada" | "concluida">("todos");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "Ação" | "Visita">("todos");
  const [isModalOpen, setIsModalOpen] = useState(!!initialData);
  const [editingAcao, setEditingAcao] = useState<CalendarioAcao | null>(null);

  // Colaboradores dropdown popover
  const [isColaboradoresOpen, setIsColaboradoresOpen] = useState(false);
  const colaboradoresRef = useRef<HTMLDivElement>(null);

  // Lightbox for photos
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CalendarioAcao>>({
    nome: "",
    tipoAtividade: "Ação",
    empresaParceiraId: "",
    empresaParceiraNome: "",
    dataInicio: new Date().toISOString().split("T")[0],
    dataFim: new Date().toISOString().split("T")[0],
    horario: "",
    local: "",
    observacao: "",
    concluida: false,
    metaBoletos: 0,
    metaInscritos: 0,
    valorPromotor: 0,
    valorOrcado: 0,
    precisaPromotor: false,
    promotoresSelecionados: [],
    colaboradoresIds: [],
    colaboradoresNomes: [],
    leadsFeitos: undefined,
    boletosFeitos: undefined,
  });

  const [fotos, setFotos] = useState<string[]>(["", "", ""]);

  // Handle outside click for colaboradores dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colaboradoresRef.current && !colaboradoresRef.current.contains(event.target as Node)) {
        setIsColaboradoresOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Compute linked leads & boletos for an action
  const getLinkedStats = (acaoId?: string, acaoNome?: string) => {
    if (!acaoId && !acaoNome) return { leadsCount: 0, boletosCount: 0 };
    const cleanNome = (acaoNome || "").trim().toLowerCase();
    const linkedLeads = (leads || []).filter((l) => {
      if (acaoId && l.acaoId === acaoId) return true;
      if (cleanNome && l.acao && l.acao.trim().toLowerCase() === cleanNome) return true;
      return false;
    });
    const leadsCount = linkedLeads.length;
    const boletosFromLeads = linkedLeads.filter(
      (l) => l.status === "Convertido" || (l as any).converted || (l as any).statusBoleto === "Pago"
    ).length;
    const boletosFromGap = (gap || []).filter((g) => acaoId && g.acaoId === acaoId).length;
    const boletosCount = boletosFromLeads + boletosFromGap;
    return { leadsCount, boletosCount };
  };

  // Promoters available
  const promotoresDisponiveis = useMemo(() => {
    const list = users.filter((u) => {
      const role = (u.role || "").toLowerCase();
      return role.includes("promotor") || (u.email || "").toLowerCase().includes("promotor");
    });
    return list.length > 0 ? list : users;
  }, [users]);

  // Collaborators available
  const colaboradoresDisponiveis = useMemo(() => {
    const list = users.filter((u) => {
      const role = (u.role || "").toLowerCase();
      return !role.includes("promotor");
    });
    return list.length > 0 ? list : users;
  }, [users]);

  // Load initialData when passed from outside
  useEffect(() => {
    if (initialData) {
      setEditingAcao(null);
      setFormData({
        nome: initialData.nome || "",
        tipoAtividade: initialData.tipoAtividade || "Ação",
        empresaParceiraId: initialData.empresaParceiraId || "",
        empresaParceiraNome: initialData.empresaParceiraNome || "",
        dataInicio: initialData.dataInicio || new Date().toISOString().split("T")[0],
        dataFim: initialData.dataFim || initialData.dataInicio || new Date().toISOString().split("T")[0],
        horario: initialData.horario || "",
        local: initialData.local || "",
        observacao: initialData.observacao || "",
        concluida: false,
        metaBoletos: initialData.metaBoletos ?? 0,
        metaInscritos: initialData.metaInscritos ?? 0,
        valorPromotor: initialData.valorPromotor ?? 0,
        valorOrcado: initialData.valorOrcado ?? 0,
        precisaPromotor: initialData.precisaPromotor ?? false,
        promotoresSelecionados: initialData.promotoresSelecionados || [],
        colaboradoresIds: initialData.colaboradoresIds || [],
        colaboradoresNomes: initialData.colaboradoresNomes || [],
        leadsFeitos: initialData.leadsFeitos,
        boletosFeitos: initialData.boletosFeitos,
      });
      setFotos([
        initialData.fotos?.[0] || "",
        initialData.fotos?.[1] || "",
        initialData.fotos?.[2] || "",
      ]);
      setIsModalOpen(true);
    }
  }, [initialData]);

  const openCreateModal = () => {
    setEditingAcao(null);
    setFormData({
      nome: "",
      tipoAtividade: "Ação",
      empresaParceiraId: "",
      empresaParceiraNome: "",
      dataInicio: new Date().toISOString().split("T")[0],
      dataFim: new Date().toISOString().split("T")[0],
      horario: "",
      local: "",
      observacao: "",
      concluida: false,
      metaBoletos: 0,
      metaInscritos: 0,
      valorPromotor: 0,
      valorOrcado: 0,
      precisaPromotor: false,
      promotoresSelecionados: [],
      colaboradoresIds: [],
      colaboradoresNomes: [],
      leadsFeitos: undefined,
      boletosFeitos: undefined,
    });
    setFotos(["", "", ""]);
    setIsModalOpen(true);
  };

  const openEditModal = (acao: CalendarioAcao) => {
    setEditingAcao(acao);
    setFormData({
      ...acao,
      tipoAtividade: acao.tipoAtividade || "Ação",
      empresaParceiraId: acao.empresaParceiraId || "",
      empresaParceiraNome: acao.empresaParceiraNome || "",
      horario: acao.horario || "",
      metaBoletos: acao.metaBoletos ?? 0,
      metaInscritos: acao.metaInscritos ?? 0,
      valorPromotor: acao.valorPromotor ?? 0,
      valorOrcado: acao.valorOrcado ?? 0,
      precisaPromotor: acao.precisaPromotor ?? false,
      promotoresSelecionados: acao.promotoresSelecionados || [],
      colaboradoresIds:
        acao.colaboradoresIds && acao.colaboradoresIds.length > 0
          ? acao.colaboradoresIds
          : acao.colaboradorId
          ? [acao.colaboradorId]
          : [],
      colaboradoresNomes:
        acao.colaboradoresNomes && acao.colaboradoresNomes.length > 0
          ? acao.colaboradoresNomes
          : acao.colaboradorNome
          ? [acao.colaboradorNome]
          : [],
      leadsFeitos: acao.leadsFeitos,
      boletosFeitos: acao.boletosFeitos,
    });
    setFotos([acao.fotos?.[0] || "", acao.fotos?.[1] || "", acao.fotos?.[2] || ""]);
    setIsModalOpen(true);
  };

  const filteredAcoes = useMemo(() => {
    return data.filter((a) => {
      const matchesSearch =
        !searchTerm ||
        a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.empresaParceiraNome && a.empresaParceiraNome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.observacao && a.observacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.colaboradoresNomes && a.colaboradoresNomes.some((n) => n.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesStatus =
        statusFilter === "todos"
          ? true
          : statusFilter === "concluida"
          ? a.concluida
          : !a.concluida;

      const matchesTipo =
        tipoFilter === "todos" ? true : (a.tipoAtividade || "Ação") === tipoFilter;

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [data, searchTerm, statusFilter, tipoFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.local || !formData.dataInicio) {
      onToast("Preencha todos os campos obrigatórios (*)", "error");
      return;
    }

    try {
      const finalFotos = fotos.map((f) => f.trim()).filter(Boolean);
      const linkedStats = getLinkedStats(editingAcao?.id, formData.nome);

      const finalLeadsFeitos =
        formData.leadsFeitos !== undefined && formData.leadsFeitos !== null
          ? Number(formData.leadsFeitos)
          : linkedStats.leadsCount;

      const finalBoletosFeitos =
        formData.boletosFeitos !== undefined && formData.boletosFeitos !== null
          ? Number(formData.boletosFeitos)
          : linkedStats.boletosCount;

      const payload: Partial<CalendarioAcao> = {
        nome: (formData.nome || "").trim(),
        tipoAtividade: formData.tipoAtividade || "Ação",
        empresaParceiraId: formData.empresaParceiraId || "",
        empresaParceiraNome: formData.empresaParceiraNome || "",
        dataInicio: formData.dataInicio || new Date().toISOString().split("T")[0],
        dataFim: formData.dataFim || formData.dataInicio || new Date().toISOString().split("T")[0],
        horario: formData.horario || "",
        local: (formData.local || "").trim(),
        observacao: (formData.observacao || "").trim(),
        colaboradoresIds: formData.colaboradoresIds || [],
        colaboradoresNomes: formData.colaboradoresNomes || [],
        colaboradorId: formData.colaboradoresIds?.[0] || "",
        colaboradorNome: formData.colaboradoresNomes?.join(", ") || "",
        metaBoletos: Number(formData.metaBoletos) || 0,
        metaInscritos: Number(formData.metaInscritos) || 0,
        valorPromotor: Number(formData.valorPromotor) || 0,
        valorOrcado: Number(formData.valorOrcado) || 0,
        precisaPromotor: Boolean(formData.precisaPromotor),
        promotoresSelecionados: formData.precisaPromotor
          ? formData.promotoresSelecionados || []
          : [],
        leadsFeitos: finalLeadsFeitos,
        boletosFeitos: finalBoletosFeitos,
        fotos: finalFotos,
      };

      if (editingAcao) {
        await updateDoc(doc(db, COLLECTIONS.CALENDARIO_ACOES, editingAcao.id), {
          ...payload,
        });
        onToast("Ação atualizada com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.CALENDARIO_ACOES), {
          ...payload,
          creatorId: profile.uid,
          creatorRole: profile.role,
          unidade: profile.unidade || "",
          concluida: false,
          createdAt: serverTimestamp(),
        });
        onToast("Ação agendada com sucesso!");
        if (onSendNotification) {
          const textToSearch = `${payload.nome} ${payload.local} ${payload.observacao} ${payload.colaboradoresNomes?.join(" ")}`;
          onSendNotification(textToSearch, payload.nome || "Ação", "Plano de Ação");
        }
      }
      setIsModalOpen(false);
      setEditingAcao(null);
      if (onClearInitialData) onClearInitialData();
    } catch (err: any) {
      onToast(err.message || "Erro ao salvar ação", "error");
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

  const toggleCollaborator = (user: UserProfile) => {
    const currentIds = formData.colaboradoresIds || [];
    const currentNomes = formData.colaboradoresNomes || [];
    const isSelected = currentIds.includes(user.uid);

    if (isSelected) {
      setFormData({
        ...formData,
        colaboradoresIds: currentIds.filter((id) => id !== user.uid),
        colaboradoresNomes: currentNomes.filter((name) => name !== (user.name || user.email)),
      });
    } else {
      setFormData({
        ...formData,
        colaboradoresIds: [...currentIds, user.uid],
        colaboradoresNomes: [...currentNomes, user.name || user.email],
      });
    }
  };

  const togglePromoter = (promotorUid: string) => {
    const current = formData.promotoresSelecionados || [];
    if (current.includes(promotorUid)) {
      setFormData({
        ...formData,
        promotoresSelecionados: current.filter((uid) => uid !== promotorUid),
      });
    } else {
      setFormData({
        ...formData,
        promotoresSelecionados: [...current, promotorUid],
      });
    }
  };

  const handleFotoChange = (index: number, val: string) => {
    const next = [...fotos];
    next[index] = val;
    setFotos(next);
  };

  const handleExport = () => {
    const exportData = filteredAcoes.map((a) => {
      const stats = getLinkedStats(a.id, a.nome);
      return {
        Nome: a.nome,
        Tipo: a.tipoAtividade || "Ação",
        "Empresa Parceira": a.empresaParceiraNome || "Nenhuma",
        "Data Início": a.dataInicio,
        "Data Fim": a.dataFim,
        Horário: a.horario || "",
        Local: a.local,
        "Colaboradores Responsáveis":
          a.colaboradoresNomes?.join(", ") || a.colaboradorNome || "",
        "Meta Inscritos": a.metaInscritos || 0,
        "Meta Boletos": a.metaBoletos || 0,
        "Leads Feitos": a.leadsFeitos !== undefined ? a.leadsFeitos : stats.leadsCount,
        "Boletos Feitos": a.boletosFeitos !== undefined ? a.boletosFeitos : stats.boletosCount,
        "Precisa Promotores": a.precisaPromotor ? "Sim" : "Não",
        "Promotores Escalados": (a.promotoresSelecionados || [])
          .map((uid) => users.find((u) => u.uid === uid)?.name || uid)
          .join(", "),
        "Valor Diária": a.valorPromotor || 0,
        "Valor Orçado Total": a.valorOrcado || 0,
        Concluída: a.concluida ? "Sim" : "Não",
        Observação: a.observacao || "",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PlanoAcoes");
    XLSX.writeFile(workbook, "Plano_de_Acao.xlsx");
  };

  const modalLinkedStats = getLinkedStats(editingAcao?.id, formData.nome);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" size={28} />
            Plano de Ação / Calendário de Eventos
          </h2>
          <p className="text-sm text-slate-500">
            Organize ações externas, visitas a empresas, panfletagens e escalas de promotores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-100 cursor-pointer"
          >
            <Plus size={18} />
            <span>Nova Ação</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-slate-200 transition-all text-sm font-bold cursor-pointer"
          >
            <Download size={18} />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome da ação, local, empresa ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="Ação">Ação</option>
            <option value="Visita">Visita</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="agendada">Agendadas</option>
            <option value="concluida">Concluídas</option>
          </select>
        </div>
      </div>

      {/* Grid of Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAcoes.map((acao) => {
          const stats = getLinkedStats(acao.id, acao.nome);
          const totalLeads = acao.leadsFeitos !== undefined ? acao.leadsFeitos : stats.leadsCount;
          const totalBoletos = acao.boletosFeitos !== undefined ? acao.boletosFeitos : stats.boletosCount;

          return (
            <div
              key={acao.id}
              className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all bg-white hover:shadow-md ${
                acao.concluida ? "border-emerald-200 bg-emerald-50/20" : "border-slate-100"
              }`}
            >
              <div className="space-y-4">
                {/* Badges & Actions */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        acao.concluida
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {acao.concluida ? "Concluída" : "Agendada"}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        (acao.tipoAtividade || "Ação") === "Visita"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {acao.tipoAtividade || "Ação"}
                    </span>
                    {acao.empresaParceiraNome && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                        <Building2 size={12} />
                        <span className="max-w-[120px] truncate">{acao.empresaParceiraNome}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(acao)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(acao.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Title & Location */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{acao.nome}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1.5">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{acao.local || "Local não informado"}</span>
                  </p>
                  {acao.horario && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>{acao.horario}</span>
                    </p>
                  )}
                </div>

                {/* Details Box */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Período:</span>
                    <span className="font-bold text-slate-700">
                      {acao.dataInicio}{" "}
                      {acao.dataFim && acao.dataFim !== acao.dataInicio ? `a ${acao.dataFim}` : ""}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Meta Inscritos / Boletos:</span>
                    <span className="font-bold text-slate-700">
                      {acao.metaInscritos || 0} / {acao.metaBoletos || 0}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Realizado (Leads / Boletos):</span>
                    <span className="font-bold text-blue-600">
                      {totalLeads} / {totalBoletos}
                    </span>
                  </div>

                  {(acao.valorOrcado || 0) > 0 && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">Valor Orçado:</span>
                      <span className="font-bold text-emerald-600">
                        R$ {Number(acao.valorOrcado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {acao.precisaPromotor && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">Promotores:</span>
                      <span className="font-semibold text-slate-700">
                        {acao.promotoresSelecionados?.length || 0} escalado(s)
                      </span>
                    </div>
                  )}
                </div>

                {/* Colaboradores Responsáveis */}
                {acao.colaboradoresNomes && acao.colaboradoresNomes.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Users size={12} />
                      Resp:
                    </span>
                    {acao.colaboradoresNomes.map((colab, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {colab}
                      </span>
                    ))}
                  </div>
                )}

                {/* Observações */}
                {acao.observacao && (
                  <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {acao.observacao}
                  </p>
                )}

                {/* Photos thumbnails */}
                {acao.fotos && acao.fotos.filter(Boolean).length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    {acao.fotos.filter(Boolean).map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewPhotoUrl(url)}
                        className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-500 hover:scale-105 transition-all relative group cursor-pointer"
                        title="Ver foto"
                      >
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye size={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleToggleConcluida(acao)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    acao.concluida
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100"
                  }`}
                >
                  {acao.concluida ? "Reabrir Ação" : "Marcar como Concluída"}
                </button>
              </div>
            </div>
          );
        })}

        {filteredAcoes.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 italic bg-white rounded-3xl border border-slate-100">
            Nenhuma ação encontrada no plano de ação.
          </div>
        )}
      </div>

      {/* Modal - Cadastro e Regras Igual Antes */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-slate-900">
                {editingAcao ? "Editar Ação" : "Nova Ação / Visita"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingAcao(null);
                  if (onClearInitialData) onClearInitialData();
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Nome da Ação / Visita * */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nome da Ação / Visita *
                </label>
                <input
                  required
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  placeholder="Nome da Ação ou Visita"
                />
              </div>

              {/* Tipo de Atividade * & Empresa Vinculada (Opcional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tipo de Atividade *
                  </label>
                  <select
                    value={formData.tipoAtividade || "Ação"}
                    onChange={(e) =>
                      setFormData({ ...formData, tipoAtividade: e.target.value as "Ação" | "Visita" })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                  >
                    <option value="Ação">Ação</option>
                    <option value="Visita">Visita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Empresa Vinculada (Opcional)
                  </label>
                  <select
                    value={formData.empresaParceiraId || ""}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = empresasParceiras.find((ep) => ep.id === empId);
                      setFormData({
                        ...formData,
                        empresaParceiraId: empId,
                        empresaParceiraNome: emp ? emp.nome : "",
                        local: !formData.local && emp?.endereco ? emp.endereco : formData.local,
                        observacao:
                          !formData.observacao && emp?.responsavel
                            ? `Responsável: ${emp.responsavel}${emp.telefone ? ` | Tel: ${emp.telefone}` : ""}`
                            : formData.observacao,
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                  >
                    <option value="">Nenhuma (Não vincular)</option>
                    {empresasParceiras.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Início * & Data Fim * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataInicio || ""}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataFim || ""}
                    onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Horário</label>
                <input
                  type="time"
                  value={formData.horario || ""}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  placeholder="--:--"
                />
              </div>

              {/* Local * */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Local *</label>
                <input
                  required
                  value={formData.local || ""}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  placeholder="Local ou endereço da ação"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={formData.observacao || ""}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  placeholder="Detalhes, orientações ou regras da ação..."
                />
              </div>

              {/* Colaboradores / FDVs Responsáveis */}
              <div ref={colaboradoresRef} className="relative">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Colaboradores / FDVs Responsáveis
                </label>
                <button
                  type="button"
                  onClick={() => setIsColaboradoresOpen(!isColaboradoresOpen)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <span className="truncate text-slate-700">
                    {formData.colaboradoresNomes && formData.colaboradoresNomes.length > 0
                      ? formData.colaboradoresNomes.join(", ")
                      : "Selecione os colaboradores..."}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      isColaboradoresOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isColaboradoresOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 max-h-56 overflow-y-auto space-y-1">
                    {colaboradoresDisponiveis.map((u) => {
                      const isSelected = formData.colaboradoresIds?.includes(u.uid);
                      return (
                        <div
                          key={u.uid}
                          onClick={() => toggleCollaborator(u)}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-800 font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              readOnly
                              checked={!!isSelected}
                              className="rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                            />
                            <span>{u.name || u.email}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {u.role || "Colaborador"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Meta de Boletos da Ação & Meta de Inscritos da Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Meta de Boletos da Ação
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.metaBoletos ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, metaBoletos: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Meta de Inscritos da Ação
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.metaInscritos ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, metaInscritos: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Card: Valor Diária Personalizado (R$) & Valor Orçado Total (R$) */}
              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Valor Diária Personalizado (R$)
                    </label>
                    <p className="text-[11px] text-slate-400 mb-1.5">
                      (Será calculado auto p/ 4h, 6h, 8h ou 10h)
                    </p>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.valorPromotor ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, valorPromotor: Number(e.target.value) })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Valor Orçado Total (R$)
                    </label>
                    <div className="mt-4 sm:mt-5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.valorOrcado ?? 0}
                        onChange={(e) =>
                          setFormData({ ...formData, valorOrcado: Number(e.target.value) })
                        }
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Precisa de Promotores? */}
              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-2xl space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.precisaPromotor}
                    onChange={(e) =>
                      setFormData({ ...formData, precisaPromotor: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">
                      Precisa de Promotores?
                    </span>
                    <span className="block text-xs text-slate-400">
                      Ative para atribuir promotores na ação
                    </span>
                  </div>
                </label>

                {/* Sub-seção: Selecione os promotores escalados */}
                {formData.precisaPromotor && (
                  <div className="pt-3 border-t border-slate-200/60 space-y-2">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      SELECIONE OS PROMOTORES ESCALADOS:
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {promotoresDisponiveis.map((promotor) => {
                        const isSelected = formData.promotoresSelecionados?.includes(promotor.uid);
                        const initial = (promotor.name || promotor.email || "P")
                          .charAt(0)
                          .toUpperCase();
                        return (
                          <div
                            key={promotor.uid}
                            onClick={() => togglePromoter(promotor.uid)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/40 text-blue-900 shadow-sm"
                                : "border-slate-100 bg-white hover:border-slate-200 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                                {initial}
                              </div>
                              <span className="text-sm font-semibold">
                                {promotor.name || promotor.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs italic text-slate-400 font-medium">
                                Promotor
                              </span>
                              {isSelected && <Check size={16} className="text-blue-600" />}
                            </div>
                          </div>
                        );
                      })}
                      {promotoresDisponiveis.length === 0 && (
                        <p className="text-xs text-slate-400 italic">
                          Nenhum promotor cadastrado no sistema.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RESULTADOS DA AÇÃO (OPCIONAL) */}
              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-700 tracking-wider">
                  RESULTADOS DA AÇÃO (OPCIONAL)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Leads Feitos
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Automático: ${modalLinkedStats.leadsCount}`}
                      value={
                        formData.leadsFeitos !== undefined && formData.leadsFeitos !== null
                          ? formData.leadsFeitos
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          leadsFeitos: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Total vinculados no sistema: {modalLinkedStats.leadsCount}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Boletos Feitos
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Automático: ${modalLinkedStats.boletosCount}`}
                      value={
                        formData.boletosFeitos !== undefined && formData.boletosFeitos !== null
                          ? formData.boletosFeitos
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          boletosFeitos: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Total vinculados no sistema: {modalLinkedStats.boletosCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fotos (até 3 URLs) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Fotos (até 3 URLs)
                </label>
                <input
                  type="url"
                  placeholder="URL da Foto 1"
                  value={fotos[0] || ""}
                  onChange={(e) => handleFotoChange(0, e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                />
                <input
                  type="url"
                  placeholder="URL da Foto 2"
                  value={fotos[1] || ""}
                  onChange={(e) => handleFotoChange(1, e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                />
                <input
                  type="url"
                  placeholder="URL da Foto 3"
                  value={fotos[2] || ""}
                  onChange={(e) => handleFotoChange(2, e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAcao(null);
                    if (onClearInitialData) onClearInitialData();
                  }}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100 transition-all text-sm cursor-pointer"
                >
                  {editingAcao ? "Salvar Alterações" : "Criar Ação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for Photos */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-3xl p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Prévia da Foto"
              className="max-h-[80vh] w-auto rounded-2xl object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
