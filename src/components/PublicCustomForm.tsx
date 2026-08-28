import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  FileText,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Briefcase,
  ChevronRight,
  Send,
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
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { FormConfig, FormField, Lead } from "../types";
import { cn } from "../lib/utils";

interface PublicCustomFormProps {
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function PublicCustomForm({ onToast }: PublicCustomFormProps) {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const formId = params.get("formId");

  useEffect(() => {
    if (!formId) {
      setLoading(false);
      return;
    }

    const fetchForm = async () => {
      try {
        const docRef = doc(db, COLLECTIONS.FORMS_CONFIG, formId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as FormConfig;
          if (!data.active) {
            onToast("Este formulário não está mais aceitando respostas.", "error");
            setLoading(false);
            return;
          }
          setFormConfig(data);
          // Initialize formData with empty strings
          const initialData: Record<string, string> = {};
          data.fields.forEach(f => {
            initialData[f.id] = "";
          });
          setFormData(initialData);
        } else {
          onToast("Formulário não encontrado.", "error");
        }
      } catch (err) {
        console.error("Error fetching form:", err);
        onToast("Erro ao carregar o formulário.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;

    // Validate required fields
    for (const field of formConfig.fields) {
      if (field.required && !formData[field.id]?.trim()) {
        onToast(`O campo "${field.label}" é obrigatório.`, "error");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Map form data to Lead structure
      const leadData: Partial<Lead> = {
        acao: formConfig.title, // Base name is form title
        status: "Pendente",
        createdAt: serverTimestamp(),
        converted: false,
        unidade: formConfig.unidade || "Geral",
        promotorId: "public_form",
        promotorName: `Form: ${formConfig.title}`,
        promotorRole: "Public Form"
      };

      // Map fields to lead properties or custom data
      const customData: Record<string, string> = {};
      formConfig.fields.forEach(field => {
        const value = formData[field.id]?.trim();
        if (field.leadMapping && field.leadMapping !== 'custom') {
          (leadData as any)[field.leadMapping] = value;
        } else {
          customData[field.label] = value;
        }
      });

      // If custom fields exist, add them to some notes or description if needed
      // For now, we'll just stick to the mapping defined by the user

      await addDoc(collection(db, COLLECTIONS.LEADS), leadData);

      setSubmitted(true);
      onToast("Resposta enviada com sucesso!", "success");
    } catch (err: any) {
      console.error("Error submitting form:", err);
      onToast(`Erro ao enviar: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center space-y-4">
        <AlertCircle size={48} className="text-slate-300" />
        <h2 className="text-xl font-bold text-slate-800">Ops! Formulário Indisponível</h2>
        <p className="text-slate-500 max-w-xs">O link que você acessou pode estar expirado ou incorreto.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto">
        {formConfig.bannerUrl && (
          <div className="mb-8 w-full rounded-3xl overflow-hidden shadow-lg border border-slate-100 bg-slate-200 flex items-center justify-center">
            <img 
              src={formConfig.bannerUrl} 
              alt={`Banner ${formConfig.title}`} 
              className="w-full h-auto max-h-64 object-cover block" 
              onError={(e) => {
                // If image fails to load, hide the container
                e.currentTarget.parentElement!.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="text-center mb-10">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100 mb-4">
            <FileText size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{formConfig.title}</h1>
          {formConfig.description && (
            <p className="mt-2 text-slate-500 text-sm">{formConfig.description}</p>
          )}
        </div>

        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-8 border border-slate-100 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {formConfig.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.id]}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        required={field.required}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formData[field.id]}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        required={field.required}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22%23475569%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5H7z%22%2F%3E%3C%2Fsvg%3E')]"
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.id]}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        required={field.required}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Resposta</span>
                      <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-4"
              >
                <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
                  <CheckCircle2 size={64} />
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Obrigado!</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Sua resposta foi enviada com sucesso e em breve entraremos em contato.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={14} />
            Seus dados estão protegidos
          </p>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
