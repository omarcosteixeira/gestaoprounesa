import React, { useState, useEffect } from "react";
import { QrCode, Search, CheckCircle2, XCircle, CheckSquare } from "lucide-react";
import { db, COLLECTIONS } from "../firebase";
import { collection, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { ClubeResgate } from "../types";

export function PublicValidadorVouchers({ onToast }: { onToast: any }) {
  const [resgates, setResgates] = useState<ClubeResgate[]>([]);
  const [codigoBusca, setCodigoBusca] = useState("");
  const [resgateEncontrado, setResgateEncontrado] = useState<ClubeResgate | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [validando, setValidando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.CLUBE_RESGATES), (snap) => {
      setResgates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClubeResgate)));
    });
    return () => unsub();
  }, []);

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
    <div className="min-h-screen bg-slate-50 flex flex-col p-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 w-full max-w-2xl space-y-8">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Validação de Vouchers</h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Digite o <strong>Código Único de Resgate</strong> apresentado pelo aluno para verificar a validade e registrar o uso.
            </p>
          </div>

          <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              <input
                type="text"
                placeholder="Ex: A1B2C3"
                value={codigoBusca}
                onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
                className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-mono font-bold text-2xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white uppercase tracking-[0.3em] text-center"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={buscando || codigoBusca.length < 5}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg text-lg cursor-pointer flex-shrink-0"
            >
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {resgateEncontrado && (
            <div className="mt-8 border-2 border-slate-100 rounded-3xl p-8 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Resultado da Busca</h4>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Aluno(a)</p>
                    <p className="text-lg font-black text-slate-800">{resgateEncontrado.userName}</p>
                    <p className="text-sm text-slate-500">{resgateEncontrado.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Parceiro / Benefício</p>
                    <p className="text-lg font-black text-slate-800">{resgateEncontrado.nomeEmpresa}</p>
                    <p className="text-sm font-mono font-bold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-lg mt-1">
                      {resgateEncontrado.codigoVoucher}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Data do Resgate</p>
                  <p className="text-sm font-bold text-slate-700">
                    {resgateEncontrado.dataResgate?.toDate ? resgateEncontrado.dataResgate.toDate().toLocaleString("pt-BR") : "Data indisponível"}
                  </p>
                </div>

                <div className="pt-6 border-t-2 border-slate-100 flex flex-col items-center">
                  {resgateEncontrado.status === "utilizado" ? (
                    <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 p-6 rounded-2xl w-full text-center flex flex-col items-center gap-3">
                      <XCircle size={48} />
                      <div>
                        <p className="font-black text-xl">Voucher já utilizado!</p>
                        <p className="text-sm font-medium mt-1">Este voucher não pode ser usado novamente.</p>
                        {resgateEncontrado.dataUtilizacao?.toDate && (
                          <p className="text-xs mt-2 font-bold opacity-75">
                            Utilizado em: {resgateEncontrado.dataUtilizacao.toDate().toLocaleString("pt-BR")}
                          </p>
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
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 text-xl cursor-pointer hover:-translate-y-1 active:translate-y-0"
                      >
                        <CheckSquare size={28} />
                        {validando ? "Validando..." : "Confirmar Utilização"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="py-6 text-center">
        <p className="text-sm font-bold text-slate-400">Sistema de Validação — Clube Local</p>
      </div>
    </div>
  );
}
