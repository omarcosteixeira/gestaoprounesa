import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Phone, User, GraduationCap, MapPin } from "lucide-react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../firebase";

interface PublicPedidoCursoFormProps {
  onToast: (message: string, type?: "success" | "error") => void;
}

export function PublicPedidoCursoForm({ onToast }: PublicPedidoCursoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = formatPhone(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const nome = formData.get("nome") as string;
      const telefone = formData.get("telefone") as string;
      const curso = formData.get("curso") as string;

      await addDoc(collection(db, COLLECTIONS.PEDIDO_CURSOS), {
        nome,
        telefone,
        curso,
        createdAt: serverTimestamp(),
      });

      // Verifica se o curso solicitado existe na unidade Angra dos Reis
      const cursosSnap = await getDocs(collection(db, COLLECTIONS.CURSOS));
      let match = false;
      cursosSnap.forEach((doc) => {
        const c = doc.data();
        if (
          c.nomeUnidade &&
          c.nomeUnidade.toLowerCase().includes("angra dos reis") &&
          c.curso &&
          c.curso.toLowerCase().trim() === curso.toLowerCase().trim()
        ) {
          match = true;
        }
      });

      if (match) {
        // Adiciona automaticamente à lista de leads se der match
        await addDoc(collection(db, COLLECTIONS.LEADS), {
          nome,
          telefone,
          cursoInteresse: curso,
          acao: "Formulário VIP",
          status: "Pendente",
          createdAt: serverTimestamp(),
        });
      }

      setSuccess(true);
      onToast("Pedido registrado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar pedido de curso:", error);
      onToast("Erro ao registrar pedido. Tente novamente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pedido Registrado!</h2>
          <p className="text-gray-600 mb-8">
            Obrigado por registrar seu interesse. Em breve entraremos em contato com novidades sobre os cursos da sua região!
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
          >
            Registrar novo pedido
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-[#01112c]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-inner">
              <GraduationCap size={32} className="text-white drop-shadow-md" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Pedido de Curso</h1>
            <p className="text-indigo-100 text-sm">
              Preencha os dados abaixo para registrar o curso do seu interesse.
            </p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Telefone/WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={18} className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  name="telefone"
                  required
                  placeholder="(00) 00000-0000"
                  onChange={handlePhoneChange}
                  maxLength={15}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Curso Desejado
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="curso"
                  required
                  placeholder="Qual curso você quer?"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-md"
            >
              {isSubmitting ? "Enviando..." : "Registrar Pedido"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
