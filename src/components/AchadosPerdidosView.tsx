import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { AchadosPerdidos, UserProfile } from '../types';
import { 
  Search, 
  Plus, 
  Trash2, 
  MapPin, 
  Calendar, 
  Package, 
  CheckCircle2, 
  Clock,
  X,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AchadosPerdidosViewProps {
  profile: UserProfile;
  onToast: (m: string, t?: "success" | "error") => void;
}

export function AchadosPerdidosView({ profile, onToast }: AchadosPerdidosViewProps) {
  const [items, setItems] = useState<AchadosPerdidos[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AchadosPerdidos | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<AchadosPerdidos>>({
    item: '',
    sala: '',
    dia: new Date().toISOString().split('T')[0],
    localGuarda: '',
    status: 'Pendente'
  });

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.ACHADOS_PERDIDOS),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: AchadosPerdidos[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AchadosPerdidos);
      });
      setItems(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.ACHADOS_PERDIDOS, editingItem.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        onToast("Item atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.ACHADOS_PERDIDOS), {
          ...formData,
          createdAt: serverTimestamp(),
          status: 'Pendente'
        });
        onToast("Item cadastrado com sucesso!");
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        item: '',
        sala: '',
        dia: new Date().toISOString().split('T')[0],
        localGuarda: '',
        status: 'Pendente'
      });
    } catch (err) {
      console.error(err);
      onToast("Erro ao salvar item.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ACHADOS_PERDIDOS, id));
      onToast("Registro excluído.");
    } catch (err) {
      onToast("Erro ao excluir.", "error");
    }
  };

  const handleMarkDelivered = async (item: AchadosPerdidos) => {
    const retiradoPor = window.prompt("Quem retirou o item?");
    if (!retiradoPor) return;

    try {
      await updateDoc(doc(db, COLLECTIONS.ACHADOS_PERDIDOS, item.id), {
        status: 'Entregue',
        retiradoPor,
        dataRetirada: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onToast("Item marcado como entregue!");
    } catch (err) {
      onToast("Erro ao atualizar status.", "error");
    }
  };

  const filteredItems = items.filter(i => 
    i.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sala.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.localGuarda.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600" />
            Achados e Perdidos
          </h2>
          <p className="text-slate-500 text-sm">Controle de itens encontrados nas salas e dependências</p>
        </div>

        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({
              item: '',
              sala: '',
              dia: new Date().toISOString().split('T')[0],
              localGuarda: '',
              status: 'Pendente'
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus size={18} />
          Cadastrar Item
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por item, sala ou local de guarda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Nenhum item encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-5 rounded-2xl border transition-all ${
                  item.status === 'Entregue' 
                    ? 'bg-emerald-50/30 border-emerald-100' 
                    : 'bg-white border-slate-100 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    item.status === 'Entregue' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.status}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setFormData(item);
                        setShowModal(true);
                      }}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-4">{item.item}</h3>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="text-blue-500" />
                    <span className="font-medium">Sala:</span> {item.sala}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar size={14} className="text-blue-500" />
                    <span className="font-medium">Encontrado em:</span> {new Date(item.dia).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Package size={14} className="text-blue-500" />
                    <span className="font-medium">Guardado em:</span> {item.localGuarda}
                  </div>
                  {item.status === 'Entregue' && (
                    <div className="mt-4 pt-4 border-t border-emerald-100 space-y-1">
                      <p className="text-xs text-emerald-600 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={12} />
                        Retirado por: {item.retiradoPor}
                      </p>
                      {item.dataRetirada && (
                        <p className="text-[10px] text-emerald-500">
                          Data: {item.dataRetirada.toDate ? item.dataRetirada.toDate().toLocaleString() : new Date(item.dataRetirada).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {item.status === 'Pendente' && (
                  <button
                    onClick={() => handleMarkDelivered(item)}
                    className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    Marcar como Entregue
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>

              <h3 className="text-xl font-bold text-slate-800 mb-6">
                {editingItem ? 'Editar Item' : 'Cadastrar Item Encontrado'}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">O que foi achado?</label>
                  <input
                    type="text"
                    required
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Celular, Mochila, Casaco..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Número da Sala</label>
                    <input
                      type="text"
                      required
                      value={formData.sala}
                      onChange={(e) => setFormData({ ...formData, sala: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 302"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dia</label>
                    <input
                      type="date"
                      required
                      value={formData.dia}
                      onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Local onde está guardado</label>
                  <input
                    type="text"
                    required
                    value={formData.localGuarda}
                    onChange={(e) => setFormData({ ...formData, localGuarda: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Recepção, Sala 201..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all mt-6"
                >
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar Item'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
