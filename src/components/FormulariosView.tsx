import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Image,
  Edit2,
  Share2,
  Settings2,
  FileText,
  Save,
  X,
  ChevronRight,
  Eye,
  CheckCircle2,
  LayoutGrid,
  List,
  AlertCircle,
  Copy,
  ExternalLink,
  Target,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  db,
  COLLECTIONS,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";
import { FormConfig, FormField, UserProfile } from "../types";
import { cn } from "../lib/utils";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface FormulariosViewProps {
  user: UserProfile;
  onToast: (msg: string, type?: "success" | "error") => void;
}

const DEFAULT_FIELDS: FormField[] = [
  { id: "f1", label: "Nome Completo", type: "text", required: true, leadMapping: "nome" },
  { id: "f2", label: "Telefone (WhatsApp)", type: "tel", required: true, leadMapping: "telefone" },
  { id: "f3", label: "E-mail", type: "email", required: false, leadMapping: "email" },
  { id: "f4", label: "Curso de Interesse", type: "text", required: false, leadMapping: "cursoInteresse" },
];

export function FormulariosView({ user, onToast }: FormulariosViewProps) {
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentForm, setCurrentForm] = useState<Partial<FormConfig> | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [viewingHistory, setViewingHistory] = useState<FormConfig | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const handleViewHistory = async (form: FormConfig) => {
    setViewingHistory(form);
    setLoadingSubmissions(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.FORM_SUBMISSIONS),
        where("formId", "==", form.id),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(list);
    } catch (err) {
      console.error(err);
      onToast("Erro ao carregar histórico.", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.FORMS_CONFIG),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FormConfig);
        setForms(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, COLLECTIONS.FORMS_CONFIG)
    );
    return unsub;
  }, []);


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast("Selecione um arquivo de imagem válido.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onToast("A imagem deve ter no máximo 5MB.", "error");
      return;
    }

    try {
      setIsUploading(true);
      
      const reader = new FileReader();
      reader.onloadend = () => {
          const img = new window.Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1024;
              const MAX_HEIGHT = 1024;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                  if (width > MAX_WIDTH) {
                      height *= MAX_WIDTH / width;
                      width = MAX_WIDTH;
                  }
              } else {
                  if (height > MAX_HEIGHT) {
                      width *= MAX_HEIGHT / height;
                      height = MAX_HEIGHT;
                  }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                  setCurrentForm(prev => prev ? { ...prev, bannerUrl: dataUrl } : prev);
                  onToast("Imagem carregada com sucesso!", "success");
              }
              setIsUploading(false);
          };
          img.onerror = () => {
              onToast("Erro ao ler a imagem.", "error");
              setIsUploading(false);
          };
          img.src = reader.result as string;
      };
      reader.onerror = () => {
          onToast("Erro ao processar imagem.", "error");
          setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erro no processamento:", err);
      onToast("Erro ao processar imagem.", "error");
      setIsUploading(false);
    }
  };

  const handleCreate = () => {
    setCurrentForm({
      title: "",
      description: "",
      active: true,
      isLeadAction: true,
      fields: [...DEFAULT_FIELDS],
      unidade: user.unidade || ""
    });
    setIsEditing(true);
  };

  const handleEdit = (form: FormConfig) => {
    setCurrentForm({ ...form });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este formulário?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.FORMS_CONFIG, id));
      onToast("Formulário excluído com sucesso!", "success");
    } catch (err) {
      onToast("Erro ao excluir formulário", "error");
    }
  };

  const handleSave = async () => {
    if (!currentForm?.title) {
      onToast("O título do formulário é obrigatório", "error");
      return;
    }

    try {
      const payload = {
        ...currentForm,
        updatedAt: serverTimestamp(),
      };

      if (currentForm.id) {
        const { id, ...rest } = payload;
        await updateDoc(doc(db, COLLECTIONS.FORMS_CONFIG, id), rest);
        onToast("Formulário atualizado!", "success");
      } else {
        await addDoc(collection(db, COLLECTIONS.FORMS_CONFIG), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Formulário criado!", "success");
      }
      setIsEditing(false);
      setCurrentForm(null);
    } catch (err) {
      onToast("Erro ao salvar formulário", "error");
    }
  };

  const addField = () => {
    if (!currentForm) return;
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: "Novo Campo",
      type: "text",
      required: false,
      leadMapping: "custom"
    };
    setCurrentForm({
      ...currentForm,
      fields: [...(currentForm.fields || []), newField]
    });
  };

  const removeField = (id: string) => {
    if (!currentForm) return;
    setCurrentForm({
      ...currentForm,
      fields: currentForm.fields?.filter(f => f.id !== id)
    });
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    if (!currentForm) return;
    setCurrentForm({
      ...currentForm,
      fields: currentForm.fields?.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const getPublicUrl = (formId: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const servidor = localStorage.getItem('servidor_selected') || 'principal';
    return `${baseUrl}?formId=${formId}&servidor=${servidor}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast("Link copiado!", "success");
  };

  if (isEditing) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
            <h2 className="text-2xl font-bold text-slate-800">
              {currentForm?.id ? "Editar Formulário" : "Novo Formulário"}
            </h2>
          </div>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
          >
            <Save size={18} />
            Salvar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Título do Formulário</label>
                <input
                  type="text"
                  value={currentForm?.title}
                  onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                  placeholder="Ex: Cadastro de Verão 2024"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição (Opcional)</label>
                <textarea
                  value={currentForm?.description || ""}
                  onChange={(e) => setCurrentForm({ ...currentForm, description: e.target.value })}
                  placeholder="Uma breve mensagem para quem for preencher..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Banner (Opcional)</label>
                
                {currentForm?.bannerUrl ? (
                  <div className="mb-3 relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={currentForm.bannerUrl} alt="Banner" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => setCurrentForm({ ...currentForm, bannerUrl: "" })}
                      className="absolute top-2 right-2 bg-white/90 text-red-600 p-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                      title="Remover banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className={cn(
                    "w-full bg-slate-50 border border-slate-200 border-dashed rounded-xl px-4 py-6 text-center transition-all",
                    isUploading ? "opacity-50" : "hover:border-blue-400 hover:bg-blue-50"
                  )}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Image size={24} className={isUploading ? "text-slate-400" : "text-blue-500"} />
                      <span className="text-sm font-medium text-slate-600">
                        {isUploading ? "Enviando imagem..." : "Clique ou arraste uma imagem (Máx: 5MB)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Campos do Formulário</h3>
                <button
                  onClick={addField}
                  className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Plus size={14} />
                  Adicionar Campo
                </button>
              </div>

              <div className="space-y-3">
                {currentForm?.fields?.map((field, idx) => (
                  <div key={field.id} className="group bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 w-full"
                          placeholder="Rótulo do campo"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                          className="bg-white border border-slate-200 rounded-lg text-[10px] px-2 py-1 font-bold outline-none"
                        >
                          <option value="text">Texto</option>
                          <option value="tel">Telefone</option>
                          <option value="email">E-mail</option>
                          <option value="select">Seleção</option>
                          <option value="textarea">Área de Texto</option>
                        </select>
                        <button
                          onClick={() => removeField(field.id)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px]">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-700">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        Obrigatório
                      </label>
                      <div className="flex items-center gap-2 text-slate-500">
                        Mapear para:
                        <select
                          value={field.leadMapping}
                          onChange={(e) => updateField(field.id, { leadMapping: e.target.value as any })}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-bold outline-none"
                        >
                          <option value="custom">Nenhum (Custom)</option>
                          <option value="nome">Nome</option>
                          <option value="telefone">Telefone</option>
                          <option value="email">E-mail</option>
                          <option value="cursoInteresse">Curso de Interesse</option>
                          <option value="cpf">CPF</option>
                          <option value="empresa">Empresa</option>
                          <option value="unidade">Unidade</option>
                        </select>
                      </div>
                    </div>

                    {field.type === 'select' && (
                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Opções (separadas por vírgula)</label>
                        <input
                          type="text"
                          value={field.options?.join(", ") || ""}
                          onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map(o => o.trim()) })}
                          className="w-full bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs"
                          placeholder="Opção 1, Opção 2, Opção 3"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configurações</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">Formulário Ativo</span>
                    <span className="text-[10px] text-slate-500">Permitir novas respostas</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentForm?.active}
                    onChange={(e) => setCurrentForm({ ...currentForm, active: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Unidade Vinculada</label>
                  <select
                    value={currentForm?.unidade}
                    onChange={(e) => setCurrentForm({ ...currentForm, unidade: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="">Nenhuma</option>
                    <option value="Geral">Geral</option>
                    {/* Add more if needed */}
                  </select>
                </div>
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">Ação de Leads</span>
                    <span className="text-[10px] text-slate-500">Enviar pro Histórico CRM</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentForm?.isLeadAction !== false} // defaults to true
                    onChange={(e) => setCurrentForm({ ...currentForm, isLeadAction: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <AlertCircle size={18} />
                <span className="text-sm font-bold">Dica de Gestão</span>
              </div>
              <p className="text-[11px] text-blue-600 leading-relaxed">
                {currentForm?.isLeadAction !== false ? (
                  <>Ao preencher este formulário, o Lead será inserido automaticamente no Histórico com o status <b>Pendente</b> e a base será o nome deste formulário.</>
                ) : (
                  <>As respostas não irão para os Leads. Ficarão salvas num histórico separado acessível pela aba do formulário.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Formulários</h2>
          <p className="text-slate-500 text-sm mt-1">Crie links públicos para capturar novos leads</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          Novo Formulário
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="text-blue-500 animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-[32px] py-20 text-center">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Nenhum formulário criado</h3>
          <p className="text-slate-500 text-sm mt-2 mb-6">Comece criando seu primeiro formulário de captura</p>
          <button
            onClick={handleCreate}
            className="text-blue-600 font-bold hover:underline"
          >
            Clique aqui para começar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <motion.div
              layout
              key={form.id}
              className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  form.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}>
                  <FileText size={24} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(form)}
                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setShowShareModal(form.id)}
                    className="p-2 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-xl transition-all"
                    title="Compartilhar"
                  >
                    <Share2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="p-2 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-xl transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {form.isLeadAction === false && (
                <button
                  onClick={() => handleViewHistory(form)}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  <List size={16} />
                  Ver Respostas
                </button>
              )}

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors">{form.title}</h3>
                <p className="text-xs text-slate-400 font-medium line-clamp-2">{form.description || "Sem descrição"}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    form.active ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                  )} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {form.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {form.fields?.length || 0} Campos
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md p-8 space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <Share2 size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800">Compartilhar</h3>
                <p className="text-slate-500 text-sm">Copie o link público para enviar aos candidatos</p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                  <div className="truncate text-xs font-mono text-slate-600 flex-1">
                    {getPublicUrl(showShareModal)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(getPublicUrl(showShareModal))}
                    className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                  >
                    <Copy size={18} />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => window.open(getPublicUrl(showShareModal), '_blank')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"
                  >
                    <ExternalLink size={18} />
                    Abrir Link
                  </button>
                  <button
                    onClick={() => setShowShareModal(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  Respostas: {viewingHistory.title}
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Histórico local de preenchimentos
                </p>
              </div>
              <button
                onClick={() => setViewingHistory(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={24} className="text-blue-500 animate-spin" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <List size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">Nenhuma resposta registrada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map(sub => (
                    <div key={sub.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 mb-3 flex justify-between">
                        <span>DATA: {sub.createdAt?.toDate ? sub.createdAt.toDate().toLocaleString() : 'Recente'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(sub.answers || {}).map(([key, val]) => (
                          <div key={key}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p>
                            <p className="text-sm font-medium text-slate-800 break-words">{String(val || "-")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
