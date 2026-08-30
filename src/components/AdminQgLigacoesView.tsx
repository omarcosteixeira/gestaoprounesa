import React, { useState } from "react";
import {
  PhoneCall,
  Plus,
  Trash2,
  Edit,
  Clock,
  Calendar,
  Check
} from "lucide-react";
import { QgLigacao } from "../types";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

interface Props {
  qgLigacoes: QgLigacao[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

const DIAS_DA_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

export function AdminQgLigacoesView({ qgLigacoes = [], onToast }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QgLigacao | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [selectedDias, setSelectedDias] = useState<string[]>(["Segunda-feira"]);
  const [horario, setHorario] = useState("09:00 às 18:00");
  const [saving, setSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNome("");
    setSelectedDias(["Segunda-feira"]);
    setHorario("09:00 às 18:00");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: QgLigacao) => {
    setEditingItem(item);
    setNome(item.nome || "");
    const dias = Array.isArray(item.diaSemana)
      ? item.diaSemana
      : item.diaSemana
      ? [item.diaSemana]
      : ["Segunda-feira"];
    setSelectedDias(dias);
    setHorario(item.horario || "09:00 às 18:00");
    setIsModalOpen(true);
  };

  const toggleDia = (dia: string) => {
    if (selectedDias.includes(dia)) {
      if (selectedDias.length > 1) {
        setSelectedDias(selectedDias.filter((d) => d !== dia));
      }
    } else {
      setSelectedDias([...selectedDias, dia]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este horário de QG de Ligação?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.QG_LIGACOES, id));
      onToast("QG de Ligação excluído com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast("Insira o nome da sala ou atividade.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        diaSemana: selectedDias,
        horario: horario.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.QG_LIGACOES, editingItem.id), payload);
        onToast("QG de Ligação atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.QG_LIGACOES), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Novo QG de Ligação cadastrado!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <PhoneCall className="text-indigo-600" size={24} />
            QG de Ligações
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure as salas, grupos e horários de mutirões de ligação e telemarketing ativo.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo QG de Ligação</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {qgLigacoes.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 text-slate-400">
            <PhoneCall className="mx-auto mb-3 text-slate-300" size={48} />
            <p className="text-sm font-semibold">Nenhum QG de Ligação cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Novo QG de Ligação" para cadastrar.</p>
          </div>
        ) : (
          qgLigacoes.map((item) => {
            const dias = Array.isArray(item.diaSemana) ? item.diaSemana : [item.diaSemana];
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <PhoneCall size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{item.nome}</h3>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock size={12} className="text-slate-400" />
                          <span>{item.horario}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Dias de Atividade
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {dias.map((d, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PhoneCall className="text-indigo-600" size={20} />
              {editingItem ? "Editar QG de Ligação" : "Novo QG de Ligação"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome / Sala *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mutirão Graduação Noturno, Sala 102..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Horário de Funcionamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 09:00 às 13:00 / 14:00 às 18:00"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Dias da Semana</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIAS_DA_SEMANA.map((dia) => {
                    const isSelected = selectedDias.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => toggleDia(dia)}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{dia}</span>
                        {isSelected && <Check size={14} className="text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
