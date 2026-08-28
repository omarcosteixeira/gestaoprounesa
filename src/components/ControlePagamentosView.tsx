import React, { useState, useMemo } from "react";
import { Coins, Search, Download, CheckCircle2, Clock, XCircle, DollarSign, Calendar } from "lucide-react";
import { updateDoc, doc } from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { CalendarioAcao, UserProfile } from "../types";
import * as XLSX from "xlsx";

interface ControlePagamentosViewProps {
  calendarioAcoes: CalendarioAcao[];
  users: UserProfile[];
  onToast: (message: string, type?: "success" | "error") => void;
  profile: UserProfile | null;
}

export function ControlePagamentosView({
  calendarioAcoes,
  users,
  onToast,
  profile,
}: ControlePagamentosViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const pagamentos = useMemo(() => {
    const list: any[] = [];
    calendarioAcoes.forEach((acao) => {
      if (acao.promotoresSelecionados && acao.promotoresSelecionados.length > 0) {
        acao.promotoresSelecionados.forEach((promotorUid) => {
          const userObj = users.find((u) => u.uid === promotorUid);
          const status = acao.statusPagamentoPromotores?.[promotorUid] || "Pendente";
          const presente = acao.presencaPromotores?.[promotorUid] || false;
          const valor = acao.valorPromotor || 50;

          list.push({
            id: `${acao.id}_${promotorUid}`,
            acaoId: acao.id,
            acaoNome: acao.nome,
            acaoData: acao.dataInicio,
            promotorUid,
            promotorNome: userObj?.name || "Desconhecido",
            promotorPix: userObj?.chavePix || "Não informada",
            promotorCpf: userObj?.cpf || "",
            presente,
            valor,
            status,
          });
        });
      }
    });
    return list;
  }, [calendarioAcoes, users]);

  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.promotorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.acaoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.promotorPix.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pagamentos, searchTerm, statusFilter]);

  const handleUpdateStatus = async (acaoId: string, promotorUid: string, newStatus: string) => {
    try {
      const acao = calendarioAcoes.find((a) => a.id === acaoId);
      if (!acao) return;
      const statusMap = { ...(acao.statusPagamentoPromotores || {}), [promotorUid]: newStatus };
      await updateDoc(doc(db, COLLECTIONS.CALENDARIO_ACOES, acaoId), {
        statusPagamentoPromotores: statusMap,
      });
      onToast("Status de pagamento atualizado!", "success");
    } catch (e: any) {
      onToast(e.message, "error");
    }
  };

  const handleExport = () => {
    const data = filteredPagamentos.map((p) => ({
      Ação: p.acaoNome,
      Data: p.acaoData,
      Promotor: p.promotorNome,
      CPF: p.promotorCpf,
      "Chave PIX": p.promotorPix,
      Presente: p.presente ? "Sim" : "Não",
      "Valor (R$)": p.valor,
      Status: p.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pagamentos");
    XLSX.writeFile(workbook, "Controle_Pagamentos.xlsx");
  };

  const totalValor = filteredPagamentos.reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="text-amber-500" size={28} />
            Controle de Pagamentos de Promotores
          </h2>
          <p className="text-sm text-slate-500">
            Validação de presença, valores e quitação de diárias de ações externas
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-slate-200 transition-all text-sm font-bold"
        >
          <Download size={18} />
          <span>Exportar Excel</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por promotor, ação, chave PIX..."
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
          <option value="Realizada">Realizada</option>
          <option value="Recusada">Recusada</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-700">
            Total: {filteredPagamentos.length} registros (R$ {totalValor.toFixed(2)})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Promotor</th>
                <th className="px-6 py-4">Ação / Data</th>
                <th className="px-6 py-4">Chave PIX</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4 text-center">Status Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPagamentos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{p.promotorNome}</div>
                    {p.promotorCpf && <div className="text-xs text-slate-400">CPF: {p.promotorCpf}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{p.acaoNome}</div>
                    <div className="text-xs text-slate-500">{p.acaoData}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600 font-bold">
                    {p.promotorPix}
                  </td>
                  <td className="px-6 py-4 font-black text-emerald-600">
                    R$ {p.valor.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <select
                      value={p.status}
                      onChange={(e) => handleUpdateStatus(p.acaoId, p.promotorUid, e.target.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        p.status === "Realizada"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "Recusada"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Realizada">Realizada (Pago)</option>
                      <option value="Recusada">Recusada</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredPagamentos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
