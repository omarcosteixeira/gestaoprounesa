import React, { useState } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  Edit,
  Clock,
  Check,
  Footprints,
  Compass
} from "lucide-react";
import { AcaoRua } from "../types";
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
  acaoRua: AcaoRua[];
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

export function AdminAcaoRuaView({ acaoRua = [], onToast }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcaoRua | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [selectedDias, setSelectedDias] = useState<string[]>(["Sábado"]);
  const [horario, setHorario] = useState("09:00 às 15:00");
  const [saving, setSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNome("");
    setSelectedDias(["Sábado"]);
    setHorario("09:00 às 15:00");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AcaoRua) => {
    setEditingItem(item);
    setNome(item.nome || "");
    const dias = Array.isArray(item.diaSemana)
      ? item.diaSemana
      : item.diaSemana
      ? [item.diaSemana]
      : ["Sábado"];
    setSelectedDias(dias);
    setHorario(item.horario || "09:00 às 15:00");
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
    if (!confirm("Deseja realmente excluir esta Ação de Rua?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ACAO_RUA, id));
      onToast("Ação de Rua excluída com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast("Insira o nome da ação ou local.", "error");
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
        await updateDoc(doc(db, COLLECTIONS.ACAO_RUA, editingItem.id), payload);
        onToast("Ação de Rua atualizada com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.ACAO_RUA), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Nova Ação de Rua cadastrada!");
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
            <MapPin className="text-amber-600" size={24} />
            Ação de Rua
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure os pontos de encontro, locais e horários de ações de rua, panfletagem e captação externa.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Nova Ação de Rua</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {acaoRua.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 text-slate-400">
            <Footprints className="mx-auto mb-3 text-slate-300" size={48} />
            <p className="text-sm font-semibold">Nenhuma Ação de Rua cadastrada.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Nova Ação de Rua" para cadastrar.</p>
          </div>
        ) : (
          acaoRua.map((item) => {
            const dias = Array.isArray(item.diaSemana) ? item.diaSemana : [item.diaSemana];
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <MapPin size={18} />
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
                          className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold"
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
              <MapPin className="text-amber-600" size={20} />
              {editingItem ? "Editar Ação de Rua" : "Nova Ação de Rua"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome da Ação / Local *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Praça Saens Peña, Calçadão de Campo Grande, Estação..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Horário de Funcionamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 09:00 às 15:00 / 10:00 às 16:00"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{dia}</span>
                        {isSelected && <Check size={14} className="text-amber-600" />}
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md cursor-pointer"
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
