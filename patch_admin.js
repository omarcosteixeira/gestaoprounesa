import fs from 'fs';
let content = fs.readFileSync('src/components/AdminClubeLocalView.tsx', 'utf-8');

const validadorComponent = `
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
`;

content = content.replace("export function AdminClubeLocalView", validadorComponent + "\n\nexport function AdminClubeLocalView");

content = content.replace(
  `{/* Stats Row */}`,
  `{/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveTab("parceiros")}
          className={\`flex items-center gap-2 px-4 py-3 text-sm font-black transition-colors border-b-2 -mb-[2px] cursor-pointer \${
            activeTab === "parceiros"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }\`}
        >
          <Gift size={18} /> Parceiros e Vouchers
        </button>
        <button
          onClick={() => setActiveTab("validacao")}
          className={\`flex items-center gap-2 px-4 py-3 text-sm font-black transition-colors border-b-2 -mb-[2px] cursor-pointer \${
            activeTab === "validacao"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }\`}
        >
          <QrCode size={18} /> Validação de Vouchers
        </button>
      </div>

      {activeTab === "validacao" ? (
        <ValidadorVouchers resgates={resgates} onToast={onToast} />
      ) : (
        <>
      {/* Stats Row */}`
);

// We need to properly close the tag.
// The file previously ended with:
//         </div>
//       )}
//     </div>
//   );
// }
const suffix = `      )}
    </div>
  );
}`;
const newSuffix = `      )}
      </>
      )}
    </div>
  );
}`;

content = content.replace(suffix, newSuffix);

fs.writeFileSync('src/components/AdminClubeLocalView.tsx', content);
