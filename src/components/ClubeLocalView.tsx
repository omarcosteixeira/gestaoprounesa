import React, { useState } from "react";
import { ClubeParceiro, ClubeResgate, UserProfile } from "../types";
import { db, COLLECTIONS, handleFirestoreError, OperationType } from "../firebase";
import { addDoc, updateDoc, doc, collection, serverTimestamp, increment } from "firebase/firestore";
import {
  Gift,
  Search,
  Tag,
  Star,
  ExternalLink,
  Phone,
  Building2,
  Calendar,
  Ticket,
  Copy,
  Check,
  X,
  Sparkles,
  QrCode,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Flame,
} from "lucide-react";

interface Props {
  parceiros: ClubeParceiro[];
  resgates?: ClubeResgate[];
  profile?: UserProfile | null;
  onToast: (msg: string, type?: "success" | "error") => void;
}

const CATEGORIES = [
  "Todos",
  "Alimentação",
  "Saúde & Fitness",
  "Educação & Cursos",
  "Lazer & Entretenimento",
  "Moda & Beleza",
  "Serviços & Tecnologia",
];

export function ClubeLocalView({ parceiros, resgates = [], profile, onToast }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedUnidade, setSelectedUnidade] = useState("Todas as Unidades");
  const [selectedParceiro, setSelectedParceiro] = useState<ClubeParceiro | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemedSuccess, setRedeemedSuccess] = useState(false);

  // Active partners only for student view
  const activeParceiros = parceiros.filter((p) => p.ativo !== false);

  // Featured banners
  const featuredParceiros = activeParceiros.filter((p) => p.destaqueBanner);

  // Filtered partners
  const filteredParceiros = activeParceiros.filter((p) => {
    const matchesSearch =
      (p.nomeEmpresa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codigoVoucher || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descontoBadge || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descricao || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "Todos" || p.categoria === selectedCategory;

    const matchesUnidade =
      selectedUnidade === "Todas as Unidades" ||
      !p.unidade ||
      p.unidade === "Todas as Unidades" ||
      p.unidade === selectedUnidade ||
      (profile?.unidade && p.unidade === profile.unidade);

    return matchesSearch && matchesCategory && matchesUnidade;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    onToast("Código do voucher copiado!", "success");
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleOpenVoucher = (p: ClubeParceiro) => {
    setSelectedParceiro(p);
    setCopiedCode(false);
    setRedeemedSuccess(false);
  };

  const handleConfirmResgate = async () => {
    if (!selectedParceiro || !selectedParceiro.id) return;
    setRedeeming(true);

    try {
      const uniqueCode = `RES-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Save redemption record
      await addDoc(collection(db, COLLECTIONS.CLUBE_RESGATES), {
        parceiroId: selectedParceiro.id,
        nomeEmpresa: selectedParceiro.nomeEmpresa,
        codigoVoucher: selectedParceiro.codigoVoucher,
        userId: profile?.uid || "anon",
        userName: profile?.name || "Aluno Estácio",
        userEmail: profile?.email || "aluno@estacio.br",
        userUnidade: profile?.unidade || "Não informada",
        codigoUnicoResgate: uniqueCode,
        dataResgate: serverTimestamp(),
      });

      // Update counter on partner
      await updateDoc(doc(db, COLLECTIONS.CLUBE_PARCEIROS, selectedParceiro.id), {
        totalResgates: increment(1),
      });

      setRedeemedSuccess(true);
      onToast("Voucher resgatado com sucesso! Apresente o código ou QR Code no estabelecimento.");
    } catch (err: any) {
      console.error("Erro ao resgatar voucher:", err);
      onToast(`Erro ao resgatar: ${err.message}`, "error");
    } finally {
      setRedeeming(false);
    }
  };

  // Carousel navigation
  const nextBanner = () => {
    if (featuredParceiros.length === 0) return;
    setCurrentBannerIndex((prev) => (prev + 1) % featuredParceiros.length);
  };

  const prevBanner = () => {
    if (featuredParceiros.length === 0) return;
    setCurrentBannerIndex((prev) => (prev - 1 + featuredParceiros.length) % featuredParceiros.length);
  };

  const activeBanner = featuredParceiros[currentBannerIndex] || featuredParceiros[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero Carousel */}
      {featuredParceiros.length > 0 ? (
        <div className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-xl min-h-[220px] md:min-h-[280px] flex items-center text-white border border-slate-800">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-700 blur-xs scale-105"
            style={{
              backgroundImage: `url(${
                activeBanner.bannerUrl ||
                activeBanner.imagemUrl ||
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80"
              })`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10" />

          <div className="relative z-20 p-6 md:p-10 w-full max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
              <Flame size={14} className="fill-slate-950" />
              <span>Destaque Exclusivo Clube Local</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {activeBanner.nomeEmpresa}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500 text-white font-black rounded-xl text-sm md:text-base shadow-sm">
                {activeBanner.descontoBadge}
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-slate-200 font-bold rounded-xl text-xs border border-white/20">
                {activeBanner.categoria}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-300 line-clamp-2 max-w-xl">
              {activeBanner.descricao || "Aproveite descontos especiais preparados exclusivamente para nossos alunos e parceiros."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleOpenVoucher(activeBanner)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs md:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
              >
                <Ticket size={18} />
                <span>Resgatar Desconto</span>
              </button>
            </div>
          </div>

          {/* Carousel Arrows */}
          {featuredParceiros.length > 1 && (
            <div className="absolute right-4 bottom-4 z-30 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
              <button
                onClick={prevBanner}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 px-1">
                {currentBannerIndex + 1}/{featuredParceiros.length}
              </span>
              <button
                onClick={nextBanner}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Default Welcome Banner if no featured banner */
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-extrabold border border-amber-400/30 uppercase tracking-wider">
              <Gift size={14} />
              <span>Clube de Benefícios & Vantagens</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Clube Local — Descontos Exclusivos
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Economize em academias, restaurantes, cinemas, cursos e estabelecimentos parceiros próximos de você. Apresente seu voucher ou cupom digital e aproveite!
            </p>
          </div>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por estabelecimento, palavra-chave ou desconto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Unit selector filter */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Building2 size={16} className="text-slate-400 hidden sm:inline" />
            <select
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:border-blue-500 w-full md:w-auto"
            >
              <option value="Todas as Unidades">Todas as Unidades</option>
              {profile?.unidade && <option value={profile.unidade}>Minha Unidade: {profile.unidade}</option>}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Voucher Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParceiros.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <Gift size={48} className="mx-auto mb-3 text-slate-300" />
            <h3 className="text-base font-extrabold text-slate-700">Nenhum voucher encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Tente alterar os termos de pesquisa ou selecionar outra categoria. Novos parceiros são adicionados frequentemente!
            </p>
          </div>
        ) : (
          filteredParceiros.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group"
            >
              {/* Card Header Image / Cover */}
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                {p.imagemUrl || p.bannerUrl ? (
                  <img
                    src={p.imagemUrl || p.bannerUrl}
                    alt={p.nomeEmpresa}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-white font-black text-3xl">
                    {p.nomeEmpresa.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                {/* Top Badge Overlay */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="px-3 py-1 bg-emerald-500 text-white font-black text-xs rounded-full shadow-md uppercase tracking-wider">
                    {p.descontoBadge}
                  </span>

                  {p.destaqueBanner && (
                    <span className="p-1.5 bg-amber-400 text-slate-950 rounded-full shadow-md" title="Em Destaque">
                      <Star size={14} className="fill-slate-950" />
                    </span>
                  )}
                </div>

                {/* Company Name Overlay */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded backdrop-blur-xs">
                    {p.categoria}
                  </span>
                  <h3 className="text-lg font-black text-white mt-1 line-clamp-1">{p.nomeEmpresa}</h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {p.descricao || "Aproveite esta condição especial apresentando o cupom exclusivo para alunos e colaboradores."}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  {p.unidade && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={13} className="text-blue-500 shrink-0" />
                      <span className="truncate">{p.unidade}</span>
                    </div>
                  )}

                  {p.validade && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>Válido até: {p.validade}</span>
                    </div>
                  )}
                </div>

                {/* Button Action */}
                <button
                  onClick={() => handleOpenVoucher(p)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Ticket size={16} />
                  <span>Ver Voucher & Usar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Voucher Modal */}
      {selectedParceiro && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-6 text-white text-center">
              <button
                onClick={() => setSelectedParceiro(null)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 bg-white rounded-2xl mx-auto shadow-lg p-2 mb-3 flex items-center justify-center overflow-hidden border-2 border-white/20">
                {selectedParceiro.imagemUrl ? (
                  <img
                    src={selectedParceiro.imagemUrl}
                    alt={selectedParceiro.nomeEmpresa}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-2xl font-black text-blue-900">
                    {selectedParceiro.nomeEmpresa.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <span className="inline-block px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full uppercase tracking-wider mb-1">
                {selectedParceiro.descontoBadge}
              </span>

              <h2 className="text-xl font-black text-white">{selectedParceiro.nomeEmpresa}</h2>
              <p className="text-xs text-blue-200 mt-0.5">{selectedParceiro.categoria}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Voucher Code Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-blue-200 text-center space-y-2">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Código do Voucher
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black text-blue-900 tracking-wider">
                    {selectedParceiro.codigoVoucher}
                  </span>
                  <button
                    onClick={() => handleCopyCode(selectedParceiro.codigoVoucher)}
                    className={`p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      copiedCode
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                    }`}
                  >
                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedCode ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>
              </div>

              {/* Digital QR Pass simulation */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-4 rounded-2xl text-white space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck size={14} />
                    Passe Digital de Aluno
                  </span>
                  <span className="font-mono text-[11px]">Estácio Clube</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Beneficiário</p>
                    <p className="text-xs font-extrabold text-white truncate max-w-[200px]">
                      {profile?.name || "Aluno Estácio"}
                    </p>
                    <p className="text-[10px] text-slate-300 truncate max-w-[200px]">
                      {profile?.email || "aluno@estacio.br"}
                    </p>
                  </div>

                  <div className="p-2 bg-white rounded-xl shrink-0">
                    <QrCode size={48} className="text-slate-950" />
                  </div>
                </div>
              </div>

              {/* Details & Rules */}
              <div className="space-y-3 text-xs text-slate-600">
                {selectedParceiro.descricao && (
                  <div>
                    <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                      Sobre a Oferta
                    </p>
                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedParceiro.descricao}</p>
                  </div>
                )}

                {selectedParceiro.instrucoesUso && (
                  <div>
                    <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                      Instruções de Uso
                    </p>
                    <p className="bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-200">
                      {selectedParceiro.instrucoesUso}
                    </p>
                  </div>
                )}

                {selectedParceiro.endereco && (
                  <div className="flex items-start gap-2 pt-1 text-slate-600">
                    <MapPin size={15} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{selectedParceiro.endereco}</span>
                  </div>
                )}
              </div>

              {/* External Links */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {selectedParceiro.whatsappContact && (
                  <a
                    href={`https://wa.me/55${selectedParceiro.whatsappContact.replace(/\D/g, "")}?text=Olá! Sou aluno da Estácio e gostaria de usar meu cupom de desconto.`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Phone size={14} />
                    <span>Falar no WhatsApp</span>
                  </a>
                )}

                {selectedParceiro.linkParceiro && (
                  <a
                    href={selectedParceiro.linkParceiro}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    <span>Acessar Site / Redes</span>
                  </a>
                )}
              </div>

              {/* Confirm Use Button */}
              <div className="pt-2">
                {redeemedSuccess ? (
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl font-extrabold text-xs text-center flex items-center justify-center gap-2">
                    <Check size={18} />
                    <span>Uso Registrado com Sucesso!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmResgate}
                    disabled={redeeming}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Ticket size={16} />
                    <span>{redeeming ? "Registrando..." : "Confirmar e Registrar Uso deste Voucher"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
