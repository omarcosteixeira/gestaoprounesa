import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Share2,
  Eye,
  Link as LinkIcon
} from "lucide-react";
import { UserProfile } from "../types";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

interface Props {
  profile: UserProfile;
  onToast: (msg: string, type?: "success" | "error") => void;
}

interface FormularioItem {
  id: string;
  nome: string;
  descricao: string;
  url: string;
  categoria: string;
  ativo: boolean;
  createdAt?: any;
}

export function AdminFormulariosView({ profile, onToast }: Props) {
  const [formularios, setFormularios] = useState<FormularioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FormularioItem | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");
  const [categoria, setCategoria] = useState("Captação");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default Standard System Forms
  const baseUrl = window.location.origin;
  const defaultForms: Omit<FormularioItem, "id">[] = [
    {
      nome: "Formulário de Captação Externa de Leads",
      descricao: "Página pública de inscrição e cadastro de interessados para eventos e ações externas.",
      url: `${baseUrl}/?publicForm=lead`,
      categoria: "Captação",
      ativo: true,
    },
    {
      nome: "Formulário de Isenção de Disciplinas",
      descricao: "Formulário de solicitação e envio de documentação para análise de isenção.",
      url: `${baseUrl}/?publicForm=isencao`,
      categoria: "Acadêmico",
      ativo: true,
    },
    {
      nome: "Formulário de Solicitação de Cursos",
      descricao: "Coleta de interesse em novos cursos e modalidades para a unidade.",
      url: `${baseUrl}/?publicForm=pedidocurso`,
      categoria: "Captação",
      ativo: true,
    },
  ];

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "formularios_sistema"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as FormularioItem[];
        setFormularios(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Erro ao carregar formulários customizados:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onToast("Link copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNome("");
    setDescricao("");
    setUrl("");
    setCategoria("Captação");
    setAtivo(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FormularioItem) => {
    setEditingItem(item);
    setNome(item.nome || "");
    setDescricao(item.descricao || "");
    setUrl(item.url || "");
    setCategoria(item.categoria || "Captação");
    setAtivo(item.ativo ?? true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este formulário?")) return;
    try {
      await deleteDoc(doc(db, "formularios_sistema", id));
      onToast("Formulário excluído com sucesso!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !url.trim()) {
      onToast("Preencha o nome e a URL do formulário.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        url: url.trim(),
        categoria: categoria.trim(),
        ativo,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "formularios_sistema", editingItem.id), payload);
        onToast("Formulário atualizado!");
      } else {
        await addDoc(collection(db, "formularios_sistema"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Novo formulário cadastrado!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao salvar formulário: ${err.message}`, "error");
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
            <FileText className="text-blue-600" size={24} />
            Gestão de Formulários Públicos
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Links públicos de captura de leads, pesquisas de satisfação e formulários institucionais.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Formulário</span>
        </button>
      </div>

      {/* Standard Core Forms */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Formulários Oficiais do Sistema
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {defaultForms.map((df, idx) => {
            const formId = `default-${idx}`;
            const isCopied = copiedId === formId;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-extrabold uppercase">
                      {df.categoria}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">
                      Ativo
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm mb-1">{df.nome}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{df.descricao}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(df.url, formId)}
                    className="flex-1 py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{isCopied ? "Copiado!" : "Copiar Link"}</span>
                  </button>

                  <a
                    href={df.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
                    title="Abrir formulário"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Forms */}
      {formularios.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Formulários Customizados
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formularios.map((form) => {
              const isCopied = copiedId === form.id;
              return (
                <div
                  key={form.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-extrabold uppercase">
                        {form.categoria}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(form)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(form.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm mb-1">{form.nome}</h4>
                    {form.descricao && (
                      <p className="text-xs text-slate-500 leading-relaxed mb-2">{form.descricao}</p>
                    )}
                    <div className="text-[11px] font-mono text-slate-400 truncate bg-slate-50 p-1.5 rounded border border-slate-100">
                      {form.url}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(form.url, form.id)}
                      className="flex-1 py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{isCopied ? "Copiado!" : "Copiar Link"}</span>
                    </button>

                    <a
                      href={form.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
                      title="Abrir"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Add / Edit Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              {editingItem ? "Editar Formulário" : "Novo Formulário"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Formulário *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Formulário de Pesquisa de Mercado..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Breve resumo sobre a finalidade deste formulário..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">URL / Link *</label>
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
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Captação">Captação</option>
                  <option value="Acadêmico">Acadêmico</option>
                  <option value="Pesquisa">Pesquisa</option>
                  <option value="Eventos">Eventos</option>
                  <option value="Outros">Outros</option>
                </select>
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
                  {saving ? "Salvando..." : "Salvar Formulário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
