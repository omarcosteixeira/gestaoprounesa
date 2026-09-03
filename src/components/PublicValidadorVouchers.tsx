import React, { useState, useEffect } from "react";
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  XCircle, 
  CheckSquare, 
  Building2, 
  User, 
  DollarSign, 
  FileText, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Gift
} from "lucide-react";
import { db, COLLECTIONS } from "../firebase";
import { collection, onSnapshot, updateDoc, doc, serverTimestamp, increment } from "firebase/firestore";
import { ClubeResgate, ClubeEmpresaValidadora } from "../types";

export function PublicValidadorVouchers({ onToast }: { onToast: any }) {
  const [resgates, setResgates] = useState<ClubeResgate[]>([]);
  const [empresasValidadoras, setEmpresasValidadoras] = useState<ClubeEmpresaValidadora[]>([]);
  const [codigoBusca, setCodigoBusca] = useState("");
  const [resgateEncontrado, setResgateEncontrado] = useState<ClubeResgate | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [validando, setValidando] = useState(false);

  // Validation Form state
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState("");
  const [empresaManual, setEmpresaManual] = useState("");
  const [atendenteNome, setAtendenteNome] = useState("");
  const [valorConsumo, setValorConsumo] = useState("");
  const [descontoAplicado, setDescontoAplicado] = useState("");
  const [observacaoUso, setObservacaoUso] = useState("");

  useEffect(() => {
    const unsubResgates = onSnapshot(collection(db, COLLECTIONS.CLUBE_RESGATES), (snap) => {
      setResgates(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClubeResgate));
    });

    const unsubEmpresas = onSnapshot(collection(db, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS), (snap) => {
      setEmpresasValidadoras(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ClubeEmpresaValidadora)
          .filter((e) => e.ativo !== false)
      );
    });

    return () => {
      unsubResgates();
      unsubEmpresas();
    };
  }, []);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = codigoBusca.trim().toUpperCase();
    if (!cleanQuery) return;
    setBuscando(true);

    // Search by full unique code (RES-XXXXX), stripped code (XXXXX), or voucher promo code
    const found = resgates.find((r) => {
      const code = (r.codigoUnicoResgate || "").toUpperCase();
      const codeWithoutPrefix = code.replace("RES-", "");
      const promoCode = (r.codigoVoucher || "").toUpperCase();
      return (
        code === cleanQuery ||
        codeWithoutPrefix === cleanQuery ||
        code === `RES-${cleanQuery}` ||
        promoCode === cleanQuery
      );
    });

    setTimeout(() => {
      setResgateEncontrado(found || null);
      if (!found) {
        onToast("Voucher não encontrado. Verifique o código digitado com o aluno.", "error");
      } else {
        // Pre-select company if matching name
        const matchEmpresa = empresasValidadoras.find(
          (emp) => emp.nomeEmpresa?.toLowerCase() === found.nomeEmpresa?.toLowerCase()
        );
        if (matchEmpresa?.id) {
          setEmpresaSelecionadaId(matchEmpresa.id);
        } else {
          setEmpresaManual(found.nomeEmpresa || "");
        }
      }
      setBuscando(false);
    }, 350);
  };

  const handleValidar = async () => {
    if (!resgateEncontrado?.id) return;
    setValidando(true);
    try {
      const selectedEmpresaObj = empresasValidadoras.find((e) => e.id === empresaSelecionadaId);
      const nomeFinalEmpresa = selectedEmpresaObj?.nomeEmpresa || empresaManual.trim() || resgateEncontrado.nomeEmpresa;

      const payload: Partial<ClubeResgate> = {
        status: "utilizado",
        dataUtilizacao: serverTimestamp(),
        empresaValidadora: nomeFinalEmpresa,
        atendenteNome: atendenteNome.trim() || undefined,
        observacaoUso: observacaoUso.trim() || undefined,
        valorConsumo: valorConsumo ? parseFloat(valorConsumo.replace(",", ".")) : undefined,
        descontoAplicado: descontoAplicado ? parseFloat(descontoAplicado.replace(",", ".")) : undefined,
      };

      await updateDoc(doc(db, COLLECTIONS.CLUBE_RESGATES, resgateEncontrado.id), payload);

      // Increment counter on company if registered
      if (empresaSelecionadaId) {
        try {
          await updateDoc(doc(db, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS, empresaSelecionadaId), {
            totalValidados: increment(1),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn("Não foi possível atualizar contador da empresa:", e);
        }
      }

      onToast("Voucher validado com sucesso!", "success");
      setResgateEncontrado((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
              status: "utilizado",
            }
          : null
      );
    } catch (err: any) {
      onToast("Erro ao validar voucher: " + err.message, "error");
    } finally {
      setValidando(false);
    }
  };

  const handleNovaBusca = () => {
    setCodigoBusca("");
    setResgateEncontrado(null);
    setAtendenteNome("");
    setValorConsumo("");
    setDescontoAplicado("");
    setObservacaoUso("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col p-4 md:p-8 font-sans">
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-10 w-full max-w-2xl space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
              <QrCode size={40} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase tracking-wider mb-2">
                <ShieldCheck size={14} /> Portal do Parceiro
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Validação de Vouchers
              </h1>
            </div>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Digite o <strong>Código Único de Resgate</strong> (ex: <span className="font-mono font-bold text-blue-600">RES-ABC12</span> ou <span className="font-mono font-bold text-blue-600">ABC12</span>) apresentado pelo aluno para verificar e dar baixa.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleBuscar} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              <input
                type="text"
                placeholder="Ex: RES-A1B2C ou A1B2C"
                value={codigoBusca}
                onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
                className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-mono font-bold text-2xl text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white uppercase tracking-[0.2em] text-center transition-all shadow-inner"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={buscando || codigoBusca.trim().length < 3}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {buscando ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    <span>Consultar Voucher</span>
                  </>
                )}
              </button>
              {resgateEncontrado && (
                <button
                  type="button"
                  onClick={handleNovaBusca}
                  className="px-5 py-4 border-2 border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm transition-all"
                >
                  Nova Consulta
                </button>
              )}
            </div>
          </form>

          {/* Search Result */}
          {resgateEncontrado && (
            <div className="border-2 border-slate-200 rounded-3xl p-6 md:p-8 bg-slate-50 shadow-sm animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Ficha do Voucher
                </span>
                <span className="font-mono text-sm font-black bg-blue-100 text-blue-800 px-3 py-1 rounded-xl">
                  {resgateEncontrado.codigoUnicoResgate || resgateEncontrado.codigoVoucher}
                </span>
              </div>

              {/* Student & Benefit Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider mb-1">
                    Aluno(a)
                  </p>
                  <p className="text-base font-black text-slate-800">{resgateEncontrado.userName}</p>
                  <p className="text-xs text-slate-500 truncate">{resgateEncontrado.userEmail}</p>
                  {resgateEncontrado.userUnidade && (
                    <span className="inline-block mt-2 text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                      {resgateEncontrado.userUnidade}
                    </span>
                  )}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider mb-1">
                    Benefício / Parceiro
                  </p>
                  <p className="text-base font-black text-slate-800">{resgateEncontrado.nomeEmpresa}</p>
                  <p className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 inline-block px-2.5 py-0.5 rounded-lg mt-1">
                    Cupom: {resgateEncontrado.codigoVoucher}
                  </p>
                </div>
              </div>

              {/* Status Section */}
              {resgateEncontrado.status === "utilizado" ? (
                <div className="bg-rose-50 border-2 border-rose-200 text-rose-800 p-6 rounded-2xl text-center space-y-2">
                  <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <XCircle size={32} />
                  </div>
                  <h3 className="font-black text-xl">Voucher já utilizado!</h3>
                  <p className="text-sm font-medium text-rose-700">
                    Este voucher já foi validado anteriormente e não pode ser reutilizado.
                  </p>
                  {resgateEncontrado.empresaValidadora && (
                    <p className="text-xs font-bold text-rose-800 pt-2 border-t border-rose-200/60 mt-2">
                      Validado por: <strong>{resgateEncontrado.empresaValidadora}</strong>
                      {resgateEncontrado.atendenteNome ? ` (Atendente: ${resgateEncontrado.atendenteNome})` : ""}
                    </p>
                  )}
                  {resgateEncontrado.dataUtilizacao?.toDate && (
                    <p className="text-xs font-semibold text-rose-600">
                      Data da baixa: {resgateEncontrado.dataUtilizacao.toDate().toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={28} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-black text-base">Voucher Válido e Disponível</h4>
                      <p className="text-xs text-emerald-700">
                        O código confere com a base. Preencha os dados abaixo para registrar o uso.
                      </p>
                    </div>
                  </div>

                  {/* Validation Form Details */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Building2 size={16} className="text-blue-600" />
                      Dados da Validação (Estabelecimento)
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Estabelecimento Validador
                        </label>
                        {empresasValidadoras.length > 0 ? (
                          <select
                            value={empresaSelecionadaId}
                            onChange={(e) => {
                              setEmpresaSelecionadaId(e.target.value);
                              if (e.target.value) setEmpresaManual("");
                            }}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Selecione o estabelecimento...</option>
                            {empresasValidadoras.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.nomeEmpresa} {emp.unidade ? `(${emp.unidade})` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Nome do estabelecimento"
                            value={empresaManual}
                            onChange={(e) => setEmpresaManual(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Nome do Atendente / Caixa
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Carlos (Opcional)"
                          value={atendenteNome}
                          onChange={(e) => setAtendenteNome(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Valor do Consumo (R$) - Opcional
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 85,00"
                          value={valorConsumo}
                          onChange={(e) => setValorConsumo(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Desconto Aplicado (R$) - Opcional
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 15,00"
                          value={descontoAplicado}
                          onChange={(e) => setDescontoAplicado(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Observações (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Mesa 4, consumação combo universitário"
                        value={observacaoUso}
                        onChange={(e) => setObservacaoUso(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleValidar}
                    disabled={validando}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 text-lg cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <CheckSquare size={24} />
                    <span>{validando ? "Validando..." : "Confirmar e Dar Baixa no Voucher"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="py-6 text-center text-xs font-bold text-slate-400">
        Clube Local Estácio — Sistema de Verificação & Validação Segura de Vouchers
      </div>
    </div>
  );
}
