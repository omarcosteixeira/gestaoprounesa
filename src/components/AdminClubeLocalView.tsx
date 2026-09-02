import React, { useState } from "react";
import { ClubeParceiro, ClubeResgate, UnidadeRegional, UserProfile } from "../types";
import { db, COLLECTIONS, handleFirestoreError, OperationType } from "../firebase";
import { addDoc, updateDoc, deleteDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import {
  Gift, QrCode, CheckSquare,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  Star,
  ExternalLink,
  Phone,
  Building2,
  Calendar,
  Ticket,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  Info,
  Layers,
} from "lucide-react";

interface Props {
  parceiros: ClubeParceiro[];
  resgates: ClubeResgate[];
  unidades?: UnidadeRegional[];
  profile?: UserProfile;
  onToast: (msg: string, type?: "success" | "error") => void;
}

const CATEGORIES = [
  "Alimentação",
  "Saúde & Fitness",
  "Educação & Cursos",
  "Lazer & Entretenimento",
  "Moda & Beleza",
  "Serviços & Tecnologia",
  "Outros",
];

const DEFAULT_LOGOS = [
  { name: "Hamburgueria / Food", url: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&auto=format&fit=crop&q=80" },
  { name: "Academia / Fitness", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=80" },
  { name: "Cinema / Lazer", url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&auto=format&fit=crop&q=80" },
  { name: "Inglês / Cursos", url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&auto=format&fit=crop&q=80" },
  { name: "Farmácia / Saúde", url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80" },
  { name: "Tecnologia / Eletrônicos", url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=80" },
];

const DEFAULT_BANNERS = [
  { name: "Gastronomia", url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80" },
  { name: "Academia Premium", url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80" },
  { name: "Cinema & Cultura", url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80" },
  { name: "Tecnologia", url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80" },
];


function ValidadorVouchers({ resgates, onToast }: { resgates: ClubeResgate[]; onToast: any }) {
  const [codigoBusca, setCodigoBusca] = useState("");
  const [resgateEncontrado, setResgateEncontrado] = useState<ClubeResgate | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [validando, setValidando] = useState(false);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoBusca.trim()) return;
    setBuscando(true);
    const upperCode = codigoBusca.trim().toUpperCase();
    
    const found = resgates.find(r => r.codigoUnicoResgate === upperCode);
    
    setTimeout(() => {
      setResgateEncontrado(found || null);
      if (!found) {
        onToast("Voucher não encontrado ou código inválido.", "error");
      }
      setBuscando(false);
    }, 500);
  };

  const handleValidar = async () => {
    if (!resgateEncontrado?.id) return;
    setValidando(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.CLUBE_RESGATES, resgateEncontrado.id), {
        status: "utilizado",
        dataUtilizacao: serverTimestamp()
      });
      onToast("Voucher validado com sucesso!", "success");
      setResgateEncontrado(prev => prev ? { ...prev, status: "utilizado" } : null);
    } catch (err: any) {
      onToast("Erro ao validar voucher: " + err.message, "error");
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800">Validação de Vouchers</h3>
          <p className="text-sm text-slate-500">
            Digite o <strong>Código Único de Resgate</strong> (6 caracteres) apresentado pelo aluno para verificar a validade e registrar o uso.
          </p>
          <div className="pt-2">
            <button 
              onClick={() => {
                const url = window.location.origin + "/?view=validador-vouchers";
                navigator.clipboard.writeText(url);
                onToast("Link público copiado! Envie para o parceiro validar vouchers sem precisar de senha.", "success");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors text-sm"
            >
              <ExternalLink size={16} />
              Copiar Link de Acesso Público para o Parceiro
            </button>
          </div>
        </div>

        <form onSubmit={handleBuscar} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Ex: A1B2C3"
              value={codigoBusca}
              onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase text-center tracking-[0.2em]"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={buscando || codigoBusca.length < 5}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {resgateEncontrado && (
          <div className="mt-8 border border-slate-200 rounded-2xl p-6 bg-slate-50 animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Resultado da Busca</h4>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold mb-1">Aluno(a)</p>
                  <p className="text-base font-black text-slate-800">{resgateEncontrado.userName}</p>
                  <p className="text-xs text-slate-500">{resgateEncontrado.userEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold mb-1">Parceiro</p>
                  <p className="text-base font-black text-slate-800">{resgateEncontrado.nomeEmpresa}</p>
                  <p className="text-xs font-mono font-bold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">
                    {resgateEncontrado.codigoVoucher}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Data do Resgate</p>
                <p className="text-sm font-bold text-slate-700">
                  {resgateEncontrado.dataResgate?.toDate ? resgateEncontrado.dataResgate.toDate().toLocaleString("pt-BR") : "Data indisponível"}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col items-center">
                {resgateEncontrado.status === "utilizado" ? (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl w-full text-center flex flex-col items-center gap-2">
                    <XCircle size={32} />
                    <div>
                      <p className="font-black text-lg">Voucher já utilizado!</p>
                      <p className="text-sm font-medium">Este voucher não pode ser usado novamente.</p>
                      {resgateEncontrado.dataUtilizacao?.toDate && (
                        <p className="text-xs mt-1 opacity-80">Utilizado em: {resgateEncontrado.dataUtilizacao.toDate().toLocaleString("pt-BR")}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl w-full text-center flex items-center justify-center gap-2">
                      <CheckCircle2 size={24} />
                      <span className="font-black">Voucher Válido e Pendente de Uso</span>
                    </div>
                    <button
                      onClick={handleValidar}
                      disabled={validando}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg cursor-pointer"
                    >
                      <CheckSquare size={24} />
                      {validando ? "Validando..." : "Confirmar Utilização (Baixa)"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export function AdminClubeLocalView({ parceiros, resgates, unidades = [], onToast }: Props) {
  const [activeTab, setActiveTab] = useState<"parceiros" | "validacao">("parceiros");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVOS" | "INATIVOS">("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<ClubeParceiro | null>(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [categoria, setCategoria] = useState<ClubeParceiro["categoria"]>("Alimentação");
  const [descontoBadge, setDescontoBadge] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigoVoucher, setCodigoVoucher] = useState("");
  const [instrucoesUso, setInstrucoesUso] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [destaqueBanner, setDestaqueBanner] = useState(false);
  const [linkParceiro, setLinkParceiro] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [endereco, setEndereco] = useState("");
  const [unidade, setUnidade] = useState("Todas as Unidades");
  const [validade, setValidade] = useState("");
  const [ativo, setAtivo] = useState(true);

  const resetForm = () => {
    setNomeEmpresa("");
    setCategoria("Alimentação");
    setDescontoBadge("20% OFF");
    setDescricao("");
    setCodigoVoucher("");
    setInstrucoesUso("Apresente sua carteirinha digital ou insira o código no checkout.");
    setImagemUrl("");
    setBannerUrl("");
    setDestaqueBanner(false);
    setLinkParceiro("");
    setWhatsappContact("");
    setEndereco("");
    setUnidade("Todas as Unidades");
    setValidade("");
    setAtivo(true);
    setEditingParceiro(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ClubeParceiro) => {
    setEditingParceiro(p);
    setNomeEmpresa(p.nomeEmpresa || "");
    setCategoria(p.categoria || "Alimentação");
    setDescontoBadge(p.descontoBadge || "");
    setDescricao(p.descricao || "");
    setCodigoVoucher(p.codigoVoucher || "");
    setInstrucoesUso(p.instrucoesUso || "");
    setImagemUrl(p.imagemUrl || "");
    setBannerUrl(p.bannerUrl || "");
    setDestaqueBanner(!!p.destaqueBanner);
    setLinkParceiro(p.linkParceiro || "");
    setWhatsappContact(p.whatsappContact || "");
    setEndereco(p.endereco || "");
    setUnidade(p.unidade || "Todas as Unidades");
    setValidade(p.validade || "");
    setAtivo(p.ativo !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim() || !descontoBadge.trim() || !codigoVoucher.trim()) {
      onToast("Preencha o nome da empresa, desconto e código do voucher.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nomeEmpresa: nomeEmpresa.trim(),
        categoria,
        descontoBadge: descontoBadge.trim(),
        descricao: descricao.trim(),
        codigoVoucher: codigoVoucher.trim().toUpperCase(),
        instrucoesUso: instrucoesUso.trim(),
        imagemUrl: imagemUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        destaqueBanner,
        linkParceiro: linkParceiro.trim(),
        whatsappContact: whatsappContact.trim(),
        endereco: endereco.trim(),
        unidade,
        validade: validade.trim(),
        ativo,
        updatedAt: serverTimestamp(),
      };

      if (editingParceiro && editingParceiro.id) {
        await updateDoc(doc(db, COLLECTIONS.CLUBE_PARCEIROS, editingParceiro.id), payload);
        onToast("Parceiro/Voucher atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.CLUBE_PARCEIROS), {
          ...payload,
          totalResgates: 0,
          createdAt: serverTimestamp(),
        });
        onToast("Novo Parceiro/Voucher cadastrado no Clube Local!");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Erro ao salvar parceiro:", err);
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.CLUBE_PARCEIROS);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (p: ClubeParceiro) => {
    if (!p.id) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.CLUBE_PARCEIROS, p.id), {
        ativo: !p.ativo,
        updatedAt: serverTimestamp(),
      });
      onToast(`Voucher de ${p.nomeEmpresa} ${!p.ativo ? "ativado" : "desativado"}.`);
    } catch (err: any) {
      onToast(`Erro ao alterar status: ${err.message}`, "error");
    }
  };

  const handleToggleDestaque = async (p: ClubeParceiro) => {
    if (!p.id) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.CLUBE_PARCEIROS, p.id), {
        destaqueBanner: !p.destaqueBanner,
        updatedAt: serverTimestamp(),
      });
      onToast(`Destaque de banner ${!p.destaqueBanner ? "ativado" : "removido"} para ${p.nomeEmpresa}.`);
    } catch (err: any) {
      onToast(`Erro ao alterar destaque: ${err.message}`, "error");
    }
  };

  const handleDelete = async (p: ClubeParceiro) => {
    if (!p.id) return;
    if (!window.confirm(`Tem certeza que deseja excluir o voucher de "${p.nomeEmpresa}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, COLLECTIONS.CLUBE_PARCEIROS, p.id));
      onToast("Voucher excluído com sucesso.");
    } catch (err: any) {
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  // Filtered List
  const filteredParceiros = parceiros.filter((p) => {
    const matchesSearch =
      (p.nomeEmpresa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codigoVoucher || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.categoria || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "TODAS" || p.categoria === categoryFilter;

    const matchesStatus =
      statusFilter === "TODOS" ||
      (statusFilter === "ATIVOS" && p.ativo !== false) ||
      (statusFilter === "INATIVOS" && p.ativo === false);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalAtivos = parceiros.filter((p) => p.ativo !== false).length;
  const totalBanners = parceiros.filter((p) => p.destaqueBanner && p.ativo !== false).length;
  const totalResgatesCount = resgates.length || parceiros.reduce((acc, curr) => acc + (curr.totalResgates || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2 border border-amber-400/30">
              <Gift size={14} />
              <span>Gestão de Vouchers & Descontos</span>
            </div>
            <h2 className="text-2xl font-black text-white">Administração do Clube Local</h2>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
              Cadastre e gerencie os cupons, parceiros comerciais e banners de destaque que serão exibidos aos alunos no aplicativo.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus size={18} />
            <span>Cadastrar Novo Voucher / Banner</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveTab("parceiros")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-black transition-colors border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "parceiros"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }`}
        >
          <Gift size={18} /> Parceiros e Vouchers
        </button>
        <button
          onClick={() => setActiveTab("validacao")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-black transition-colors border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === "validacao"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }`}
        >
          <QrCode size={18} /> Validação de Vouchers
        </button>
      </div>

      {activeTab === "validacao" ? (
        <ValidadorVouchers resgates={resgates} onToast={onToast} />
      ) : (
        <>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Parceiros Totais</p>
            <p className="text-2xl font-black text-slate-800">{parceiros.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vouchers Ativos</p>
            <p className="text-2xl font-black text-emerald-600">{totalAtivos}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <Star size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Banners Destaque</p>
            <p className="text-2xl font-black text-amber-600">{totalBanners}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <Ticket size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Resgates</p>
            <p className="text-2xl font-black text-indigo-600">{totalResgatesCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome da empresa, código do voucher ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="TODAS">Todas as Categorias</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVOS">Apenas Ativos</option>
            <option value="INATIVOS">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3.5 px-4">Empresa / Parceiro</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">Desconto / Voucher</th>
                <th className="py-3.5 px-4">Unidade / Validade</th>
                <th className="py-3.5 px-4 text-center">Destaque Topo</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Resgates</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParceiros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <Gift size={36} className="mx-auto mb-2 text-slate-300" />
                    Nenhum voucher ou parceiro cadastrado com esses filtros.
                  </td>
                </tr>
              ) : (
                filteredParceiros.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-3">
                        {p.imagemUrl ? (
                          <img
                            src={p.imagemUrl}
                            alt={p.nomeEmpresa}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black flex items-center justify-center text-sm border border-blue-100">
                            {p.nomeEmpresa.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{p.nomeEmpresa}</p>
                          {p.endereco && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{p.endereco}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                        <Tag size={12} className="text-slate-400" />
                        {p.categoria}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 font-black rounded-md text-xs border border-emerald-200">
                          {p.descontoBadge}
                        </span>
                        <div className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-max">
                          {p.codigoVoucher}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="font-bold text-slate-700">{p.unidade || "Todas as Unidades"}</p>
                      {p.validade && <p className="text-[11px] text-slate-400">Válido até: {p.validade}</p>}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleDestaque(p)}
                        title={p.destaqueBanner ? "Remover do banner principal" : "Exibir no banner principal"}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          p.destaqueBanner
                            ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        <Star size={16} fill={p.destaqueBanner ? "currentColor" : "none"} />
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleAtivo(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold cursor-pointer transition-all ${
                          p.ativo !== false
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                        }`}
                      >
                        {p.ativo !== false ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>Inativo</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center font-extrabold text-slate-700">
                      {p.totalResgates || 0}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl font-bold">
                  <Gift size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black">
                    {editingParceiro ? "Editar Voucher / Banner" : "Novo Voucher / Banner do Clube Local"}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Preencha os dados do parceiro e as regras de utilização para os alunos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Nome da Empresa / Parceiro *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Smart Fit, Burger King, Cinema Lumière"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Badge do Desconto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 20% OFF, R$ 50 de Desconto, 1ª Mensalidade Grátis"
                    value={descontoBadge}
                    onChange={(e) => setDescontoBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Código do Voucher / Cupom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ESTACIO20, CLUBEALUNO50"
                    value={codigoVoucher}
                    onChange={(e) => setCodigoVoucher(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Unidade Atendida
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="Todas as Unidades">Todas as Unidades</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.nome}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Validade do Cupom
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 31/12/2026 ou Sem Validade"
                    value={validade}
                    onChange={(e) => setValidade(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição Curta do Benefício
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Desconto exclusivo de 20% em todas as refeições para alunos apresentando a carteirinha da faculdade."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Regras e Instruções de Uso
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Apresente o código no balcão ou insira no aplicativo oficial na etapa de pagamento."
                  value={instrucoesUso}
                  onChange={(e) => setInstrucoesUso(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Logo Image URL & Presets */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Imagem de Logo / Capa (URL)
                  </label>
                  <span className="text-[10px] text-slate-400">Escolha abaixo ou insira o link</span>
                </div>
                <input
                  type="url"
                  placeholder="https://exemplo.com/logo.png"
                  value={imagemUrl}
                  onChange={(e) => setImagemUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {DEFAULT_LOGOS.map((def) => (
                    <button
                      key={def.name}
                      type="button"
                      onClick={() => setImagemUrl(def.url)}
                      className="text-[10px] font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-colors cursor-pointer"
                    >
                      + Preset: {def.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Image URL & Highlight Option */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Banner Promocional de Destaque (URL)
                  </label>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">
                    Carousel do Topo
                  </span>
                </div>
                <input
                  type="url"
                  placeholder="https://exemplo.com/banner-promocional.jpg"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {DEFAULT_BANNERS.map((def) => (
                    <button
                      key={def.name}
                      type="button"
                      onClick={() => {
                        setBannerUrl(def.url);
                        setDestaqueBanner(true);
                      }}
                      className="text-[10px] font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 rounded-lg transition-colors cursor-pointer"
                    >
                      + Preset: {def.name}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={destaqueBanner}
                    onChange={(e) => setDestaqueBanner(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    Exibir este parceiro no Banner Promocional do Topo (Destaque)
                  </span>
                </label>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp do Parceiro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 51999998888"
                    value={whatsappContact}
                    onChange={(e) => setWhatsappContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Site / Instagram do Parceiro
                  </label>
                  <input
                    type="url"
                    placeholder="Ex: https://instagram.com/empresa"
                    value={linkParceiro}
                    onChange={(e) => setLinkParceiro(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Endereço Físico / Localização
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Brasil, 1500 - Centro, Rio de Janeiro - RJ"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Voucher Ativo e Visível para Alunos</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-extrabold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    {loading ? (
                      <span>Salvando...</span>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{editingParceiro ? "Salvar Alterações" : "Cadastrar Voucher"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
