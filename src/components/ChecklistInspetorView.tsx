import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  where,
  orderBy
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { ChecklistInspetor, UserProfile, MapaoAcademicoEntry } from '../types';
import { 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Calendar,
  Search,
  Filter,
  Check,
  PowerOff,
  Lightbulb,
  Lock,
  Box,
  Armchair,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChecklistInspetorViewProps {
  profile: UserProfile;
  onToast: (m: string, t?: "success" | "error") => void;
  mapao: MapaoAcademicoEntry[];
}

const DIAS_MAPAO = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

export function ChecklistInspetorView({ profile, onToast, mapao }: ChecklistInspetorViewProps) {
  const [history, setHistory] = useState<ChecklistInspetor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Local state for the current checklist being filled
  const [currentChecks, setCurrentChecks] = useState<Record<string, Partial<ChecklistInspetor>>>({});

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.CHECKLIST_INSPETOR),
      where('data', '==', selectedDate),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: ChecklistInspetor[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ChecklistInspetor);
      });
      setHistory(list);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedDate]);

  // Determine rooms allocated for the selected date
  const allocatedRooms = useMemo(() => {
    const date = new Date(selectedDate);
    const dayName = DIAS_MAPAO[date.getDay()];
    
    const rooms = new Set<string>();
    const roomsMap: Record<string, { id: string; nome: string }> = {};

    mapao.forEach(entry => {
      entry.disciplinas?.forEach(disc => {
        if (disc.dia === dayName && disc.sala && disc.sala.trim() !== "") {
          rooms.add(disc.sala.trim());
          roomsMap[disc.sala.trim()] = { id: disc.salaId || disc.sala, nome: disc.sala };
        }
      });
    });

    return Object.values(roomsMap).sort((a, b) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));
  }, [mapao, selectedDate]);

  const handleToggle = (roomName: string, roomId: string, field: keyof ChecklistInspetor) => {
    setCurrentChecks(prev => {
      const current = prev[roomName] || {
        salaId: roomId,
        salaNome: roomName,
        arDesligado: false,
        luzDesligada: false,
        trancada: false,
        materiaisOk: false,
        cadeirasOk: false
      };

      return {
        ...prev,
        [roomName]: {
          ...current,
          [field]: !current[field]
        }
      };
    });
  };

  const handleSaveCheck = async (roomName: string) => {
    const checkData = currentChecks[roomName];
    if (!checkData) return;

    try {
      await addDoc(collection(db, COLLECTIONS.CHECKLIST_INSPETOR), {
        ...checkData,
        data: selectedDate,
        inspetorId: profile.uid,
        inspetorNome: profile.name,
        createdAt: serverTimestamp()
      });
      onToast(`Checklist da sala ${roomName} salvo!`);
      
      // Remove from current local state after saving
      setCurrentChecks(prev => {
        const newState = { ...prev };
        delete newState[roomName];
        return newState;
      });
    } catch (err) {
      onToast("Erro ao salvar checklist.", "error");
    }
  };

  const isRoomChecked = (roomName: string) => {
    return history.some(h => h.salaNome === roomName);
  };

  return (
    <div id="inspectorChecklist-container" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            Checklist Inspetor
          </h2>
          <p className="text-slate-500 text-sm">Verificação diária de encerramento das salas</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <Calendar size={18} className="text-blue-500 ml-2" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none outline-none text-sm font-bold text-slate-700 bg-transparent"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Filter size={18} className="text-blue-500" />
            Salas Alocadas para {DIAS_MAPAO[new Date(selectedDate).getDay()]}
          </h3>
          <div className="text-xs font-bold text-slate-400 uppercase">
            {allocatedRooms.length} Salas Encontradas
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Filtrar salas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50/50"
          />
        </div>

        {allocatedRooms.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500 font-medium italic">Nenhuma sala alocada no Mapão para este dia da semana.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allocatedRooms
              .filter(r => r.nome.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((room) => {
                const checked = isRoomChecked(room.nome);
                const localData = currentChecks[room.nome] || {
                  arDesligado: false,
                  luzDesligada: false,
                  trancada: false,
                  materiaisOk: false,
                  cadeirasOk: false
                };

                return (
                  <motion.div
                    key={room.nome}
                    layout
                    className={cn(
                      "p-5 rounded-2xl border transition-all",
                      checked 
                        ? "bg-emerald-50/20 border-emerald-100 opacity-75" 
                        : "bg-white border-slate-100 shadow-sm"
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm",
                          checked ? "bg-emerald-500 text-white" : "bg-blue-100 text-blue-600"
                        )}>
                          {room.nome}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Sala {room.nome}</h4>
                          <p className="text-xs text-slate-500">
                            {checked ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                <CheckCircle2 size={12} /> Verificado em {history.find(h => h.salaNome === room.nome)?.createdAt?.toDate?.()?.toLocaleTimeString() || "agora"}
                              </span>
                            ) : "Aguardando verificação"}
                          </p>
                        </div>
                      </div>

                      {!checked && (
                        <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                          <CheckToggleButton
                            label="Ar"
                            icon={<PowerOff size={14} />}
                            active={!!localData.arDesligado}
                            onClick={() => handleToggle(room.nome, room.id, 'arDesligado')}
                          />
                          <CheckToggleButton
                            label="Luz"
                            icon={<Lightbulb size={14} />}
                            active={!!localData.luzDesligada}
                            onClick={() => handleToggle(room.nome, room.id, 'luzDesligada')}
                          />
                          <CheckToggleButton
                            label="Trancada"
                            icon={<Lock size={14} />}
                            active={!!localData.trancada}
                            onClick={() => handleToggle(room.nome, room.id, 'trancada')}
                          />
                          <CheckToggleButton
                            label="Materiais"
                            icon={<Box size={14} />}
                            active={!!localData.materiaisOk}
                            onClick={() => handleToggle(room.nome, room.id, 'materiaisOk')}
                          />
                          <CheckToggleButton
                            label="Cadeiras"
                            icon={<Armchair size={14} />}
                            active={!!localData.cadeirasOk}
                            onClick={() => handleToggle(room.nome, room.id, 'cadeirasOk')}
                          />

                          <button
                            onClick={() => handleSaveCheck(room.nome)}
                            disabled={Object.values(localData).filter(v => v === true).length === 0}
                            className="ml-auto lg:ml-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                          >
                            <Save size={14} />
                            Salvar
                          </button>
                        </div>
                      )}

                      {checked && (
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label="Ar" ok={history.find(h => h.salaNome === room.nome)?.arDesligado} />
                          <StatusBadge label="Luz" ok={history.find(h => h.salaNome === room.nome)?.luzDesligada} />
                          <StatusBadge label="Trancada" ok={history.find(h => h.salaNome === room.nome)?.trancada} />
                          <StatusBadge label="Materiais" ok={history.find(h => h.salaNome === room.nome)?.materiaisOk} />
                          <StatusBadge label="Cadeiras" ok={history.find(h => h.salaNome === room.nome)?.cadeirasOk} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            Histórico de Checklists (Hoje)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hora</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sala</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Inspetor</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status de Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-sm italic">
                    Nenhum checklist preenchido para hoje.
                  </td>
                </tr>
              ) : (
                history.map((h) => {
                  const itemsCount = [h.arDesligado, h.luzDesligada, h.trancada, h.materiaisOk, h.cadeirasOk].filter(v => v).length;
                  const totalItems = 5;
                  const isFullyComplete = itemsCount === totalItems;

                  return (
                    <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-sm text-slate-600 font-medium">
                        {h.createdAt?.toDate ? h.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '...'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {h.salaNome}
                          </div>
                          <span className="text-sm font-bold text-slate-700">Sala {h.salaNome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500">
                        {h.inspetorNome}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5",
                            isFullyComplete 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-amber-100 text-amber-700"
                          )}>
                            {isFullyComplete ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {itemsCount}/{totalItems} Concluído
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

  );
}

function CheckToggleButton({ label, icon, active, onClick }: { label: string, icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
        active 
          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20" 
          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
      )}
    >
      {icon}
      {label}
      {active && <Check size={12} className="ml-0.5" />}
    </button>
  );
}

function StatusBadge({ label, ok }: { label: string, ok?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight border",
      ok ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-rose-100 border-rose-200 text-rose-700"
    )}>
      {ok ? <Check size={10} /> : <XCircle size={10} />}
      {label}
    </div>
  );
}
