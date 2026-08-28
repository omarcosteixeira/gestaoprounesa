import React, { useState } from "react";
import { db, COLLECTIONS } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { 
  Wrench, 
  Send, 
  User, 
  MapPin, 
  Hash, 
  Building,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";

export function PublicMaintenanceForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    solicitanteNome: "",
    matricula: "",
    predio: "",
    local: "",
    setor: "",
    descricao: ""
  });

  const predios = ["Predio A", "Predio B", "Predio C", "Estacionamento", "Guarita"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, COLLECTIONS.SOLICITACOES_MANUTENCAO), {
        ...formData,
        status: "Pendente",
        solicitanteId: "public",
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting maintenance request:", err);
      alert("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-6 border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Solicitação Enviada!</h2>
            <p className="text-slate-500 font-medium">
              Sua solicitação de manutenção foi registrada com sucesso e será analisada em breve.
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Enviar Outra</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-8 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
            <Wrench size={240} />
          </div>
          <div className="relative z-10 flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
              <Wrench size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">Solicitação de Manutenção</h1>
              <p className="text-blue-100 text-sm mt-2 font-medium">Preencha os dados para solicitar um reparo</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Seu Nome Completo *</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="Ex: João Silva"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm font-medium bg-slate-50/50 focus:bg-white"
                  value={formData.solicitanteNome}
                  onChange={(e) => setFormData({ ...formData, solicitanteNome: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Matrícula</label>
              <div className="relative">
                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Sua matrícula"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm font-medium bg-slate-50/50 focus:bg-white"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Prédio / Local *</label>
              <div className="relative">
                <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm font-medium bg-slate-50/50 focus:bg-white appearance-none cursor-pointer"
                  value={formData.predio}
                  onChange={(e) => setFormData({ ...formData, predio: e.target.value })}
                >
                  <option value="">Selecione o prédio...</option>
                  {predios.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Setor / Sala *</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="Ex: Sala 102, Recepção..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm font-medium bg-slate-50/50 focus:bg-white"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Setor Administrativo</label>
            <input
              type="text"
              placeholder="Ex: Financeiro, Acadêmico, TI..."
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm font-medium bg-slate-50/50 focus:bg-white"
              value={formData.setor}
              onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Descrição do Problema *</label>
            <textarea
              required
              rows={4}
              placeholder="Descreva detalhadamente o que precisa de reparo..."
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-sm font-medium bg-slate-50/50 focus:bg-white resize-none"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none text-lg"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={24} />
                <span>Enviar Solicitação</span>
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Uso Interno e Externo • Gestão de Manutenção
          </p>
        </form>
      </div>
    </div>
  );
}
