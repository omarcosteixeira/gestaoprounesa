import React, { useState } from "react";
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Globe,
  MapPin
} from "lucide-react";
import { LinkUtil } from "../types";
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
  links: LinkUtil[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminLinksUteisView({ links = [], onToast }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LinkUtil | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [local, setLocal] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNome("");
    setUrl("");
    setLocal("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LinkUtil) => {
    setEditingItem(item);
    setNome(item.nome || "");
    setUrl(item.url || "");
    setLocal(item.local || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este Link Útil?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.LINKS, id));
      onToast("Link excluído com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !url.trim()) {
      onToast("Preencha o nome e a URL do link.", "error");
      return;
    }
    setSaving(true);
    try {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }

      const payload = {
        nome: nome.trim(),
        url: finalUrl,
        local: local.trim() || "Geral",
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, COLLECTIONS.LINKS, editingItem.id), payload);
        onToast("Link atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.LINKS), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Novo Link Útil cadastrado!");
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
            <LinkIcon className="text-blue-600" size={24} />
            Links Úteis do Sistema
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre atalhos e sistemas corporativos (SIA, Sales, CRM, etc.) disponíveis para a equipe.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Link Útil</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 text-slate-400">
            <LinkIcon className="mx-auto mb-3 text-slate-300" size={48} />
            <p className="text-sm font-semibold">Nenhum Link Útil cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Novo Link Útil" para adicionar.</p>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{link.nome}</h3>
                      {link.local && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin size={11} />
                          <span>{link.local}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(link)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-mono truncate bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                  {link.url}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Acessar Link</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <LinkIcon className="text-blue-600" size={20} />
              {editingItem ? "Editar Link Útil" : "Novo Link Útil"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Link / Sistema *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Portal SIA Aluno, CRM Sales, Portal do Colaborador..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">URL / Link Web *</label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Unidade / Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Geral, Resende, Barra Mansa, Acadêmico..."
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
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
                  {saving ? "Salvando..." : "Salvar Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
