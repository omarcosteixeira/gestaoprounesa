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
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { UserProfile } from "../types";

interface PublicRegistrationFormProps {
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function PublicRegistrationForm({
  onToast,
}: PublicRegistrationFormProps) {
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    email: "",
    tipoCurso: "Graduação" as "Graduação" | "Técnico" | "Pós graduação",
    cursoInteresse: "",
    empresa: "",
    outraEmpresa: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referrerProfile, setReferrerProfile] = useState<UserProfile | null>(
    null,
  );
  const [referrerLoading, setReferrerLoading] = useState(true);
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);

  // Get ref parameter from search URL
  const params = new URLSearchParams(window.location.search);
  const referrerId = params.get("ref") || "";

  // Load empresas parceiras
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const snap = await getDocs(
          collection(db, COLLECTIONS.EMPRESAS_PARCEIRAS),
        );
        const list = snap.docs
          .map((doc) => ({
            id: doc.id,
            nome: doc.data().nome || "",
          }))
          .filter((e) => e.nome);
        setEmpresas(list);
      } catch (err) {
        console.error("Error fetching partner companies for public form:", err);
      }
    };
    fetchEmpresas();
  }, []);

  // Load promoter/referrer info
  useEffect(() => {
    if (!referrerId) {
      setReferrerLoading(false);
      return;
    }

    const fetchReferrer = async () => {
      try {
        const docRef = doc(db, COLLECTIONS.USERS, referrerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReferrerProfile(docSnap.data() as UserProfile);
        } else {
          console.warn(
            "Promoter profile not found in database for ID:",
            referrerId,
          );
        }
      } catch (err) {
        console.error("Error fetching promoter profile:", err);
      } finally {
        setReferrerLoading(false);
      }
    };

    fetchReferrer();
  }, [referrerId]);

  // Handle Input Masks
  const formatCPF = (value: string) => {
    const rawVal = value.replace(/\D/g, "").slice(0, 11);
    if (rawVal.length <= 3) return rawVal;
    if (rawVal.length <= 6) return `${rawVal.slice(0, 3)}.${rawVal.slice(3)}`;
    if (rawVal.length <= 9)
      return `${rawVal.slice(0, 3)}.${rawVal.slice(3, 6)}.${rawVal.slice(6)}`;
    return `${rawVal.slice(0, 3)}.${rawVal.slice(3, 6)}.${rawVal.slice(6, 9)}-${rawVal.slice(9)}`;
  };

  const formatTelefone = (value: string) => {
    const rawVal = value.replace(/\D/g, "").slice(0, 11);
    if (rawVal.length === 0) return "";
    if (rawVal.length <= 2) return `(${rawVal}`;
    if (rawVal.length <= 6) return `(${rawVal.slice(0, 2)}) ${rawVal.slice(2)}`;
    if (rawVal.length <= 10)
      return `(${rawVal.slice(0, 2)}) ${rawVal.slice(2, 6)}-${rawVal.slice(6)}`;
    return `(${rawVal.slice(0, 2)}) ${rawVal.slice(2, 7)}-${rawVal.slice(7)}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "cpf") {
      setFormData((prev) => ({ ...prev, [name]: formatCPF(value) }));
    } else if (name === "telefone") {
      setFormData((prev) => ({ ...prev, [name]: formatTelefone(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCpf = formData.cpf.replace(/\D/g, "");
    const cleanTelefone = formData.telefone.replace(/\D/g, "");

    if (!formData.nome.trim()) {
      onToast("Por favor, preencha seu nome.", "error");
      return;
    }
    if (cleanTelefone.length < 10) {
      onToast(
        "Por favor, insira um telefone válido com código de área.",
        "error",
      );
      return;
    }
    if (cleanCpf && cleanCpf.length !== 11) {
      onToast("O CPF digitado está incompleto.", "error");
      return;
    }
    if (!formData.email.trim()) {
      onToast("Por favor, insira seu e-mail.", "error");
      return;
    }
    if (!formData.cursoInteresse.trim()) {
      onToast("Por favor, insira o curso desejado.", "error");
      return;
    }

    setLoading(true);

    try {
      // 1. Duplicate checks for candidate leads
      if (cleanCpf) {
        const qCpf = query(
          collection(db, COLLECTIONS.LEADS),
          where("cpf", "==", cleanCpf),
        );
        const snapCpf = await getDocs(qCpf);
        if (!snapCpf.empty) {
          onToast(
            "Este CPF já possui cadastro no parceiro ou sistema escolar.",
            "error",
          );
          setLoading(false);
          return;
        }
      }

      const qTel = query(
        collection(db, COLLECTIONS.LEADS),
        where("telefone", "==", cleanTelefone),
      );
      const snapTel = await getDocs(qTel);
      if (!snapTel.empty) {
        onToast(
          "Este telefone já possui cadastro em nosso banco promocional.",
          "error",
        );
        setLoading(false);
        return;
      }

      // 2. Align Promoter & Server values based on loaded referrer profile
      let promotorId = "default_form_system";
      let promotorName = "Cadastro Público";
      let promotorRole = "Admin Master";
      let servidor: "principal" | "comercial" | "unesa" = "principal";
      let linkadoA = "";

      if (referrerProfile) {
        promotorId = referrerProfile.uid;
        promotorName = referrerProfile.name;
        promotorRole = referrerProfile.role;
        servidor = referrerProfile.servidor || "principal";
        if (referrerProfile.linkadoA) {
          linkadoA = referrerProfile.linkadoA;
        }
      }

      // 3. Assemble document payload complying exactly with schema
      const empresaParaSalvar =
        formData.empresa === "Outros"
          ? formData.outraEmpresa.trim()
          : formData.empresa;

      const leadPayload: any = {
        acao: "Ação ( formulario)",
        nome: formData.nome.trim(),
        telefone: cleanTelefone,
        cpf: cleanCpf,
        email: formData.email.trim(),
        tipoCurso: formData.tipoCurso,
        cursoInteresse: formData.cursoInteresse.trim(),
        converted: false,
        status: "Pendente",
        createdAt: serverTimestamp(),
        promotorId,
        promotorName,
        promotorRole,
        servidor,
      };

      if (empresaParaSalvar) {
        leadPayload.empresa = empresaParaSalvar;
      }

      if (linkadoA) {
        leadPayload.linkadoA = linkadoA;
      }

      // Save directly to Firestore collection
      await addDoc(collection(db, COLLECTIONS.LEADS), leadPayload);

      setSubmitted(true);
      onToast("Cadastro realizado com sucesso!", "success");
    } catch (err: any) {
      console.error("Error creating form registration lead:", err);
      onToast(`Erro ao enviar cadastro: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  if (referrerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
          />
          <p className="text-sm font-bold text-slate-600">
            Carregando indicação segura para desconto especial...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-100 mb-4 animate-bounce">
            <GraduationCap size={36} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Inscrição Premiada
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Você foi indicado por um consultor parceiro autorizado
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Promo Box */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-start space-x-3">
                  <AlertCircle
                    size={20}
                    className="text-blue-600 shrink-0 mt-0.5"
                  />
                  <div>
                    <h4 className="text-sm font-extrabold text-indigo-900">
                      Preencha seus dados e ganhe um desconto especial
                    </h4>
                    <p className="text-xs text-indigo-700/85 mt-1 leading-relaxed">
                      Ao completar este formulário, sua indicação garante acesso
                      direto a bolsas especiais e condições personalizadas de
                      ensino.
                    </p>
                  </div>
                </div>

                {/* Referrer Banner if present */}
                {referrerProfile && (
                  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block font-medium">
                      Você está se filiando à indicação de:
                    </span>
                    <span className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {referrerProfile.name} ({referrerProfile.role})
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        name="nome"
                        required
                        value={formData.nome}
                        onChange={handleInputChange}
                        placeholder="Ex: Carlos Eduardo de Oliveira"
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Telefone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Telefone (WhatsApp)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={16} />
                        </div>
                        <input
                          type="tel"
                          name="telefone"
                          required
                          value={formData.telefone}
                          onChange={handleInputChange}
                          placeholder="(11) 98765-4321"
                          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {/* CPF */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        CPF (Opcional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <FileText size={16} />
                        </div>
                        <input
                          type="text"
                          name="cpf"
                          value={formData.cpf}
                          onChange={handleInputChange}
                          placeholder="123.456.789-00"
                          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* E-mail */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Seu Melhor E-mail
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Ex: carlos@email.com"
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Tipo de Curso */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tipo de Curso
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <GraduationCap size={16} />
                      </div>
                      <select
                        name="tipoCurso"
                        value={formData.tipoCurso}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-slate-800 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22%23475569%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5H7z%22%2F%3E%3C%2Fsvg%3E')]"
                      >
                        <option value="Graduação">Graduação</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Pós graduação">Pós graduação</option>
                      </select>
                    </div>
                  </div>

                  {/* Curso Desejado */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Curso Desejado
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <BookOpen size={16} />
                      </div>
                      <input
                        type="text"
                        name="cursoInteresse"
                        required
                        value={formData.cursoInteresse}
                        onChange={handleInputChange}
                        placeholder="Ex: Administração de Empresas / Enfermagem"
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Empresa */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Empresa / Convênio / Escola
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Briefcase size={16} />
                      </div>
                      <select
                        name="empresa"
                        value={formData.empresa}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-slate-800 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22%23475569%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5H7z%22%2F%3E%3C%2Fsvg%3E')]"
                      >
                        <option value="">
                          Selecione uma Empresa Parceira (opcional)
                        </option>
                        {empresas.map((emp) => (
                          <option key={emp.id} value={emp.nome}>
                            {emp.nome}
                          </option>
                        ))}
                        <option value="Outros">Outros (Digitar nome)</option>
                      </select>
                    </div>
                  </div>

                  {formData.empresa === "Outros" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-1"
                    >
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nome da Empresa
                      </label>
                      <input
                        type="text"
                        name="outraEmpresa"
                        required
                        value={formData.outraEmpresa}
                        onChange={handleInputChange}
                        placeholder="Nome da sua empresa ou escola"
                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-800"
                      />
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-100 cursor-pointer"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      "Garantir Meu Desconto Especial"
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-6 space-y-4"
              >
                <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full mb-3">
                  <CheckCircle2 size={48} className="animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Inscrição Efetuada!
                </h3>
                <p className="text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-150 inline-block leading-relaxed">
                  Preencha seus dados e ganhe um desconto especial.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Anotamos seus dados em nossa fila de cadastro promocional. Um
                  consultor educacional entrará em contato com você via WhatsApp
                  para alinhar suas aulas e emitir sua credencial com bolsa
                  garantida!
                </p>

                {referrerProfile && (
                  <div className="text-xs text-slate-400 border-t border-slate-100 pt-4 mt-2">
                    Indicação registrada sob cuidados de{" "}
                    <span className="text-slate-700 font-bold">
                      {referrerProfile.name}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
