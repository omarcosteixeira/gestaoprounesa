import React, { useState, useMemo } from "react";
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../firebase";
import { ControleConcorrencia } from "../types";
import { Target, Search, Plus, Trash2, Edit2, TrendingUp, Building2, MapPin } from "lucide-react";

interface ControleConcorrenciaViewProps {
  data: ControleConcorrencia[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function ControleConcorrenciaView({ data, onToast }: ControleConcorrenciaViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ControleConcorrencia | null>(null);

  const [formData, setFormData] = useState({
    ies: "",
    curso: "",
    valor: "",
    bairro: "",
    descontoExtra: "",
    observacao: "",
  });

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const term = searchTerm.toLowerCase();
      return (
        item.ies.toLowerCase().includes(term) ||
        item.curso.toLowerCase().includes(term) ||
        item.bairro.toLowerCase().includes(term) ||
        item.valor.toString().includes(term)
      );
    });
  }, [data, searchTerm]);

  // Dashboard Metrics
  const totalEntries = data.length;
  const uniqueIes = new Set(data.map(d => d.ies.toLowerCase().trim())).size;
  const uniqueCursos = new Set(data.map(d => d.curso.toLowerCase().trim())).size;
  const avgValue = data.length > 0 ? data.reduce((acc, curr) => acc + curr.valor, 0) / data.length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ies: formData.ies,
        curso: formData.curso,
        valor: Number(formData.valor),
        bairro: formData.bairro,
        descontoExtra: formData.descontoExtra,
        observacao: formData.observacao,
      };

      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.CONTROLE_CONCORRENCIA, editingItem.id), payload);
        onToast("Registro atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.CONTROLE_CONCORRENCIA), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Registro adicionado com sucesso!");
      }

      setFormData({ ies: "", curso: "", valor: "", bairro: "", descontoExtra: "", observacao: "" });
      setEditingItem(null);
      setIsAdding(false);
    } catch (err: any) {
      onToast(`Erro: ${err.message}`, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir este registro?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.CONTROLE_CONCORRENCIA, id));
      onToast("Registro excluído com sucesso!");
    } catch (err: any) {
      onToast(`Erro: ${err.message}`, "error");
    }
  };

  const handleEdit = (item: ControleConcorrencia) => {
    setEditingItem(item);
    setFormData({
      ies: item.ies,
      curso: item.curso,
      valor: item.valor.toString(),
      bairro: item.bairro,
      descontoExtra: item.descontoExtra || "",
      observacao: item.observacao || "",
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-indigo-600" />
            Controle de Concorrência
          </h2>
          <p className="text-slate-500 text-sm mt-1">Acompanhe e registre dados da concorrência</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (isAdding) {
              setEditingItem(null);
              setFormData({ ies: "", curso: "", valor: "", bairro: "", descontoExtra: "", observacao: "" });
            }
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          {isAdding ? "Cancelar" : <><Plus size={18} /> Novo Registro</>}
        </button>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Total de Registros</p>
            <p className="text-2xl font-black text-slate-800">{totalEntries}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">IES Monitoradas</p>
            <p className="text-2xl font-black text-slate-800">{uniqueIes}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Search size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Cursos Diferentes</p>
            <p className="text-2xl font-black text-slate-800">{uniqueCursos}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Média de Valor</p>
            <p className="text-2xl font-black text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgValue)}
            </p>
          </div>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{editingItem ? "Editar Registro" : "Novo Registro"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da IES</label>
              <input type="text" required value={formData.ies} onChange={(e) => setFormData({...formData, ies: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Estácio" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Curso</label>
              <input type="text" required value={formData.curso} onChange={(e) => setFormData({...formData, curso: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Direito" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
              <input type="number" step="0.01" required value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: 500.00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
              <input type="text" required value={formData.bairro} onChange={(e) => setFormData({...formData, bairro: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Centro" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desconto Extra (Opcional)</label>
              <input type="text" value={formData.descontoExtra} onChange={(e) => setFormData({...formData, descontoExtra: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: 10% no boleto" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observação (Opcional)</label>
              <input type="text" value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Informações adicionais" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm">
              {editingItem ? "Salvar Alterações" : "Adicionar Registro"}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">Histórico de Concorrência</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por IES, curso, bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="p-4">IES</th>
                <th className="p-4">Curso</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Bairro</th>
                <th className="p-4">Desconto</th>
                <th className="p-4">Observação</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{item.ies}</td>
                    <td className="p-4 text-slate-600">{item.curso}</td>
                    <td className="p-4 font-bold text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                    </td>
                    <td className="p-4 text-slate-600 flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400" />
                      {item.bairro}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">{item.descontoExtra || "-"}</td>
                    <td className="p-4 text-slate-500 text-xs max-w-[150px] truncate" title={item.observacao}>{item.observacao || "-"}</td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
