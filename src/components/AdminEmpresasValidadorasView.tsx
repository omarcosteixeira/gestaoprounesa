import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  MapPin, 
  Key, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  TrendingUp, 
  Users
} from "lucide-react";
import { db, COLLECTIONS, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { ClubeEmpresaValidadora, UnidadeRegional } from "../types";

interface Props {
  unidades?: UnidadeRegional[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminEmpresasValidadorasView({ unidades = [], onToast }: Props) {
  const [empresas, setEmpresas] = useState<ClubeEmpresaValidadora[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVAS" | "INATIVAS">("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<ClubeEmpresaValidadora | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelTelefone, setResponsavelTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [unidade, setUnidade] = useState("");
  const [codigoAcesso, setCodigoAcesso] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS),
      (snap) => {
        setEmpresas(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClubeEmpresaValidadora)
        );
      },
      (err) => {
        console.error("Erro ao carregar empresas validadoras:", err);
      }
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setNomeEmpresa("");
    setCnpj("");
    setResponsavelNome("");
    setResponsavelTelefone("");
    setEndereco("");
    setUnidade(unidades[0]?.nome || "Todas as Unidades");
    setCodigoAcesso(Math.random().toString(36).substring(2, 6).toUpperCase());
    setAtivo(true);
    setEditingEmpresa(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: ClubeEmpresaValidadora) => {
    setEditingEmpresa(emp);
    setNomeEmpresa(emp.nomeEmpresa || "");
    setCnpj(emp.cnpj || "");
    setResponsavelNome(emp.responsavelNome || "");
    setResponsavelTelefone(emp.responsavelTelefone || "");
    setEndereco(emp.endereco || "");
    setUnidade(emp.unidade || unidades[0]?.nome || "Todas as Unidades");
    setCodigoAcesso(emp.codigoAcesso || "");
    setAtivo(emp.ativo !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim()) {
      onToast("Por favor, preencha o nome do estabelecimento.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<ClubeEmpresaValidadora> = {
        nomeEmpresa: nomeEmpresa.trim(),
        cnpj: cnpj.trim(),
        responsavelNome: responsavelNome.trim(),
        responsavelTelefone: responsavelTelefone.trim(),
        endereco: endereco.trim(),
        unidade,
        codigoAcesso: codigoAcesso.trim().toUpperCase(),
        ativo,
        updatedAt: serverTimestamp(),
      };

      if (editingEmpresa?.id) {
        await updateDoc(doc(db, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS, editingEmpresa.id), payload);
        onToast("Empresa validadora atualizada com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS), {
          ...payload,
          totalValidados: 0,
          createdAt: serverTimestamp(),
        });
        onToast("Nova empresa validadora cadastrada!");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Erro ao salvar empresa validadora:", err);
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (emp: ClubeEmpresaValidadora) => {
    if (!emp.id) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS, emp.id), {
        ativo: !emp.ativo,
        updatedAt: serverTimestamp(),
      });
      onToast(`Estabelecimento ${!emp.ativo ? "ativado" : "desativado"} com sucesso.`);
    } catch (err: any) {
      onToast(`Erro ao atualizar status: ${err.message}`, "error");
    }
  };

  const handleDelete = async (emp: ClubeEmpresaValidadora) => {
    if (!emp.id) return;
    if (!window.confirm(`Deseja realmente excluir a empresa validadora "${emp.nomeEmpresa}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, COLLECTIONS.CLUBE_EMPRESAS_VALIDADORAS, emp.id));
      onToast("Empresa validadora excluída com sucesso.");
    } catch (err: any) {
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleCopyLink = () => {
    const url = window.location.origin + "/?view=validador-vouchers";
    navigator.clipboard.writeText(url);
    onToast("Link público copiado! Compartilhe com os estabelecimentos parceiros.", "success");
  };

  const filteredEmpresas = empresas.filter((e) => {
    const matchesSearch =
      (e.nomeEmpresa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.responsavelNome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.unidade || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.codigoAcesso || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "TODOS" ||
      (statusFilter === "ATIVAS" && e.ativo !== false) ||
      (statusFilter === "INATIVAS" && e.ativo === false);

    return matchesSearch && matchesStatus;
  });

  const totalAtivas = empresas.filter((e) => e.ativo !== false).length;
  const totalValidadosGeral = empresas.reduce((acc, curr) => acc + (curr.totalValidados || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cadastradas</p>
            <p className="text-2xl font-black text-slate-800">{empresas.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresas Ativas</p>
            <p className="text-2xl font-black text-emerald-600">{totalAtivas}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vouchers Validados</p>
            <p className="text-2xl font-black text-amber-600">{totalValidadosGeral}</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por empresa, responsável ou polo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVAS">Ativas</option>
            <option value="INATIVAS">Inativas</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Copiar link público do validador de vouchers"
          >
            <ExternalLink size={15} />
            <span>Link do Validador</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Nova Empresa Validadora</span>
          </button>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredEmpresas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="mx-auto text-slate-300" size={48} />
            <p className="text-slate-600 font-bold text-sm">Nenhuma empresa validadora encontrada.</p>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Cadastre os estabelecimentos comerciais parceiros para permitir a validação e controle de uso dos vouchers.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
            >
              <Plus size={16} /> Cadastrar Empresa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Estabelecimento / Empresa</th>
                  <th className="px-4 py-3">Polo / Unidade</th>
                  <th className="px-4 py-3">Responsável / Contato</th>
                  <th className="px-4 py-3">Código PIN</th>
                  <th className="px-4 py-3 text-center">Vouchers Validados</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmpresas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800 text-sm">{emp.nomeEmpresa}</div>
                      {emp.cnpj && <div className="text-[11px] text-slate-400 font-mono">CNPJ: {emp.cnpj}</div>}
                      {emp.endereco && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{emp.endereco}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold">
                        {emp.unidade || "Todas as Unidades"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-700">{emp.responsavelNome || "—"}</div>
                      {emp.responsavelTelefone && (
                        <div className="text-[11px] text-blue-600 flex items-center gap-1">
                          <Phone size={11} /> {emp.responsavelTelefone}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {emp.codigoAcesso ? (
                        <span className="font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 text-xs">
                          {emp.codigoAcesso}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2.5 py-1 rounded-lg">
                        {emp.totalValidados || 0}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleAtivo(emp)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          emp.ativo !== false
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        {emp.ativo !== false ? (
                          <>
                            <CheckCircle2 size={12} /> Ativa
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> Inativa
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {editingEmpresa ? "Editar Empresa Validadora" : "Cadastrar Empresa Validadora"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Estabelecimento / Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hamburgueria Dom Pedro"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Código PIN / Acesso
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PIN12"
                    value={codigoAcesso}
                    onChange={(e) => setCodigoAcesso(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Roberto Silva"
                    value={responsavelNome}
                    onChange={(e) => setResponsavelNome(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (51) 99999-8888"
                    value={responsavelTelefone}
                    onChange={(e) => setResponsavelTelefone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Polo / Unidade Estácio
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
                  Endereço Físico do Estabelecimento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Principal, 120 - Centro"
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
                  <span className="text-xs font-bold text-slate-700">Empresa Ativa no Sistema</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    {loading ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
