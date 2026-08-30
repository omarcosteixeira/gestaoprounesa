import React, { useState } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Edit,
  User,
  Database,
  Filter,
  CheckCircle2
} from "lucide-react";
import { PlannerTask, UserProfile } from "../types";
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
  planner: PlannerTask[];
  users?: UserProfile[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

const DIAS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function AdminPlannerView({ planner = [], users = [], onToast }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerTask | null>(null);

  // Form State
  const [dayOfWeek, setDayOfWeek] = useState(DIAS[0]);
  const [atendenteName, setAtendenteName] = useState("");
  const [baseName, setBaseName] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("TODOS");

  const handleOpenAdd = (day?: string) => {
    setEditingItem(null);
    setDayOfWeek(day || DIAS[0]);
    setAtendenteName("");
    setBaseName("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PlannerTask) => {
    setEditingItem(item);
    setDayOfWeek(item.dayOfWeek || DIAS[0]);
    setAtendenteName(item.atendenteName || "");
    setBaseName(item.baseName || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta escala de trabalho?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.PLANNER, id));
      onToast("Escala excluída com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atendenteName.trim() || !baseName.trim()) {
      onToast("Preencha o nome do atendente e da base.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        dayOfWeek,
        atendenteName: atendenteName.trim(),
        baseName: baseName.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.PLANNER, editingItem.id), payload);
        onToast("Planner atualizado!");
      } else {
        await addDoc(collection(db, COLLECTIONS.PLANNER), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Item adicionado ao Planner!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredPlanner = selectedDayFilter === "TODOS"
    ? planner
    : planner.filter((p) => p.dayOfWeek === selectedDayFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Planner da Semana
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Planejamento e distribuição de bases por atendente e dia da semana.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDayFilter}
            onChange={(e) => setSelectedDayFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Dias</option>
            {DIAS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Adicionar ao Planner</span>
          </button>
        </div>
      </div>

      {/* Week Day Columns / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DIAS.map((dia) => {
          if (selectedDayFilter !== "TODOS" && selectedDayFilter !== dia) return null;
          const tasksForDay = planner.filter((p) => p.dayOfWeek === dia);

          return (
            <div key={dia} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">{dia}</h3>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-extrabold">
                  {tasksForDay.length} escala(s)
                </span>
              </div>

              <div className="space-y-2 flex-1 min-h-[100px]">
                {tasksForDay.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Nenhuma escala para este dia.
                  </div>
                ) : (
                  tasksForDay.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-2 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <User size={13} className="text-blue-600" />
                          <span>{task.atendenteName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <Database size={12} className="text-slate-400" />
                          <span>{task.baseName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => handleOpenAdd(dia)}
                className="mt-3 w-full py-1.5 border border-dashed border-slate-200 hover:border-blue-400 text-slate-500 hover:text-blue-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus size={14} />
                <span>Adicionar para {dia.split("-")[0]}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              {editingItem ? "Editar Escala do Planner" : "Nova Escala do Planner"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Dia da Semana *</label>
                <select
                  required
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DIAS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Atendente / Colaborador *</label>
                <input
                  type="text"
                  required
                  list="atendentes-list"
                  placeholder="Nome do atendente..."
                  value={atendenteName}
                  onChange={(e) => setAtendenteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="atendentes-list">
                  {users.map((u) => (
                    <option key={u.uid} value={u.name || u.nome || u.email} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Base / Fila a Trabalhar *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Base Reabertura 2026.1, Leads Presencial, FIES..."
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  {saving ? "Salvando..." : "Salvar Escala"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
