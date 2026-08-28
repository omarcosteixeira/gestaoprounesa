import React, { useState, useEffect } from "react";
import {
  User,
  Book,
  FileText,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Boxes,
  School,
  ArrowRight,
  ChevronLeft,
  Building2,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, COLLECTIONS } from "../firebase";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { InsumoItem, InsumoPedido } from "../types";

interface PublicInsumoFormProps {
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function PublicInsumoForm({ onToast }: PublicInsumoFormProps) {
  const [tipoSolicitante, setTipoSolicitante] = useState<
    "docente" | "administrativo" | null
  >(null);

  // Form fields
  const [professorName, setProfessorName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [motivoUso, setMotivoUso] = useState("");
  const [matricula, setMatricula] = useState("");
  const [pedidoItens, setPedidoItens] = useState<InsumoItem[]>([
    { material: "", quantidade: 1 },
  ]);

  // Database load
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [estoque, setEstoque] = useState<any[]>([]);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);

  // Load registered employees for autocomplete
  useEffect(() => {
    const q = collection(db, COLLECTIONS.FUNCIONARIOS);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFuncionarios(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        console.error("Erro ao sincronizar funcionários: ", error);
      },
    );
    return () => unsubscribe();
  }, []);

  // Load registered stock for autocomplete
  useEffect(() => {
    const isComercial = db.app.options.projectId === "gestaodeleadspro-d4230";
    const targetStockColl = isComercial
      ? COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL
      : COLLECTIONS.INSUMOS_ESTOQUE;

    const q = collection(db, targetStockColl);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEstoque(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        console.error("Erro ao sincronizar estoque: ", error);
      },
    );
    return () => unsubscribe();
  }, []);

  const handleAddRow = () => {
    setPedidoItens([...pedidoItens, { material: "", quantidade: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (pedidoItens.length === 1) return;
    setPedidoItens(pedidoItens.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof InsumoItem,
    value: any,
  ) => {
    const updated = [...pedidoItens];
    if (field === "quantidade") {
      let qty = parseInt(value) || 1;
      if (tipoSolicitante === "administrativo" && qty > 10) {
        qty = 10;
        onToast(
          "Quantidade máxima permitida para o administrativo é 10 unidades por material.",
          "error",
        );
      }
      updated[index].quantidade = Math.max(1, qty);
    } else {
      updated[index].material = value;
    }
    setPedidoItens(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations based on type
    if (tipoSolicitante === "docente") {
      if (!professorName || !courseName || !subjectName || !motivoUso) {
        onToast("Por favor, preencha todos os campos obrigatórios.", "error");
        return;
      }
    } else {
      if (!professorName || !courseName || !matricula || !motivoUso) {
        onToast("Por favor, preencha todos os campos obrigatórios.", "error");
        return;
      }
    }

    const filteredItens = pedidoItens.filter((it) => it.material.trim() !== "");
    if (filteredItens.length === 0) {
      onToast("Por favor, adicione pelo menos um material.", "error");
      return;
    }

    // Double check quantities for administrative
    if (tipoSolicitante === "administrativo") {
      const overLimit = filteredItens.some((it) => it.quantidade > 10);
      if (overLimit) {
        onToast(
          "Um ou mais materiais ultrapassam o limite de 10 unidades para solicitar como administrativo.",
          "error",
        );
        return;
      }
    }

    setLoading(true);
    try {
      const isComercial = db.app.options.projectId === "gestaodeleadspro-d4230";
      const targetCollection = isComercial
        ? COLLECTIONS.INSUMOS_PEDIDOS_COMERCIAL
        : COLLECTIONS.INSUMOS_PEDIDOS;

      const newPedido: any = {
        professorNome: professorName,
        cursoNome: courseName, // Sector for administrative
        disciplinaNome:
          tipoSolicitante === "docente" ? subjectName : "Administrativo",
        motivoUso: motivoUso,
        itens: filteredItens,
        status: "Pendente",
        solicitanteId: "public",
        solicitanteNome:
          tipoSolicitante === "docente"
            ? "Docente Público"
            : "Administrativo Público",
        tipoFicha: tipoSolicitante,
        matricula: matricula || "",
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, targetCollection), newPedido);
      setSubmitted(true);
      onToast("Solicitação de insumos enviada para avaliação!", "success");
    } catch (err) {
      console.error(err);
      onToast("Erro ao enviar solicitação.", "error");
    } finally {
      setLoading(false);
    }
  };

  const administrativeOptions = funcionarios.filter(
    (f) =>
      f.tipo === "administrativo" &&
      (f.nome || "").toLowerCase().includes(professorName.toLowerCase()),
  );

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100/80">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-900 p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-15 flex items-center space-x-3 mb-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/10">
              <Boxes size={24} className="text-blue-200" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-200 bg-white/5 px-2.5 py-1 rounded-md">
              {tipoSolicitante === null
                ? "Atendimento"
                : tipoSolicitante === "docente"
                  ? "Portal do Docente"
                  : "Portal Administrativo"}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight relative z-15">
            Solicitação Pública de Insumos
          </h2>
          <p className="text-blue-100 text-sm mt-1.5 font-medium max-w-md relative z-15">
            {tipoSolicitante === null
              ? "Selecione abaixo o seu perfil para prosseguir com o pedido de materiais de apoio."
              : "Preencha as informações solicitadas para o envio de sua requisição."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success-message"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2
                  size={36}
                  className="text-teal-600 animate-bounce"
                />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Solicitação Enviada!
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Sua requisição de materiais foi enviada com sucesso para a
                equipe operacional para análise e controle de estoque.
              </p>
              <button
                onClick={() => {
                  setProfessorName("");
                  setCourseName("");
                  setSubjectName("");
                  setMotivoUso("");
                  setMatricula("");
                  setPedidoItens([{ material: "", quantidade: 1 }]);
                  setTipoSolicitante(null);
                  setSubmitted(false);
                }}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <span>Fazer Nova Solicitação</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          ) : tipoSolicitante === null ? (
            <motion.div
              key="selection-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 space-y-6"
            >
              <h3 className="text-center font-bold text-slate-700 text-base mb-2">
                Qual é a sua modalidade de contratação/atuação?
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* DOCENTE CARD */}
                <button
                  onClick={() => setTipoSolicitante("docente")}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg transition-all text-center group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    Docente / Professor
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Solicitações de materiais de apoio para disciplinas
                    acadêmicas, aulas e laboratórios.
                  </p>
                </button>

                {/* ADMINISTRATIVO CARD */}
                <button
                  onClick={() => setTipoSolicitante("administrativo")}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-amber-50 hover:border-amber-300 hover:shadow-lg transition-all text-center group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Building2 size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    Administrativo
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Materiais de escritório e insumos para os setores
                    corporativos e de backoffice.{" "}
                    <span className="font-bold text-amber-700">
                      (Limite de 10 und)
                    </span>
                  </p>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="px-6 md:px-8 pt-4">
                <button
                  onClick={() => {
                    setTipoSolicitante(null);
                    setProfessorName("");
                    setCourseName("");
                    setSubjectName("");
                    setMatricula("");
                  }}
                  className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 font-bold transition-all"
                >
                  <ChevronLeft size={16} />
                  <span>Voltar de Perfil</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                {/* Form fields based on tipoSolicitante */}
                {tipoSolicitante === "docente" ? (
                  <>
                    {/* DOCENTE FIELDS CONTAINER */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Nome do Professor *
                        </label>
                        <div className="relative">
                          <User
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Dr. Robson Mendes"
                            value={professorName}
                            onChange={(e) => setProfessorName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Nome do Curso *
                        </label>
                        <div className="relative">
                          <School
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Farmácia, Logística"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Nome da Disciplina *
                        </label>
                        <div className="relative">
                          <Book
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Química Orgânica Prática"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Motivo do Uso / Justificativa *
                        </label>
                        <div className="relative">
                          <FileText
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Aula prática em laboratório de análises"
                            value={motivoUso}
                            onChange={(e) => setMotivoUso(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ADMINISTRATIVO FIELDS CONTAINER */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Nome do Funcionário *
                        </label>
                        <div className="relative">
                          <User
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Comece a digitar seu nome..."
                            value={professorName}
                            onFocus={() => setShowAutocomplete(true)}
                            onChange={(e) => {
                              setProfessorName(e.target.value);
                              setMatricula(""); // Clear selection if typing
                              setShowAutocomplete(true);
                            }}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all bg-white font-medium text-slate-800"
                          />
                        </div>

                        {/* Autocomplete absolute select list */}
                        {showAutocomplete &&
                          professorName.trim().length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[180px] overflow-y-auto divide-y divide-slate-50">
                              {administrativeOptions.length === 0 ? (
                                <div className="p-3 text-xs text-slate-400 italic">
                                  Nenhum administrativo cadastrado com esse nome
                                </div>
                              ) : (
                                administrativeOptions.map((f) => (
                                  <button
                                    type="button"
                                    key={f.id}
                                    onClick={() => {
                                      setProfessorName(f.nome);
                                      setMatricula(f.matricula);
                                      setShowAutocomplete(false);
                                    }}
                                    className="w-full p-3 text-left text-xs text-slate-700 hover:bg-slate-50 font-bold transition-all flex justify-between items-center"
                                  >
                                    <span>{f.nome}</span>
                                    <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Matrícula: {f.matricula}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Matrícula (Preenchida Automática) *
                        </label>
                        <div className="relative">
                          <FileText
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            readOnly
                            placeholder="Selecione seu nome acima"
                            value={matricula}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 outline-none text-sm transition-all font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Setor *
                        </label>
                        <div className="relative">
                          <Building2
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <select
                            required
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all bg-white"
                          >
                            <option value="">Selecione o Setor</option>
                            <option value="Gestão">Gestão</option>
                            <option value="Secretaria">Secretaria</option>
                            <option value="Sala de Matrícula">
                              Sala de Matrícula
                            </option>
                            <option value="Acadêmico">Acadêmico</option>
                            <option value="Vigia">Vigia</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Gavea">Gavea</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Motivo / Justificativa *
                        </label>
                        <div className="relative">
                          <FileText
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Utilização em rotinas do setor"
                            value={motivoUso}
                            onChange={(e) => setMotivoUso(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Items Requisition */}
                <div className="border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center space-x-1.5 font-sans">
                      <Boxes
                        size={14}
                        className="text-blue-600 animate-pulse"
                      />
                      <span>
                        Insumos Requisitados{" "}
                        {tipoSolicitante === "administrativo" && (
                          <span className="text-amber-600">
                            (Limitação de 10 unidades)
                          </span>
                        )}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-750 font-bold hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Adicionar Linha</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pedidoItens.map((it, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100"
                      >
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Descrição do material (Ex: Caneta Preta, Grampeador)"
                            value={it.material}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "material",
                                e.target.value,
                              )
                            }
                            onFocus={() => setFocusedItemIndex(index)}
                            onBlur={() => setTimeout(() => setFocusedItemIndex(null), 200)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white text-slate-800 font-medium"
                            required
                          />
                          {focusedItemIndex === index && it.material.trim() !== "" && (
                            (() => {
                              const filtered = estoque.filter((stockItem) =>
                                stockItem.material &&
                                stockItem.material.toLowerCase().includes(it.material.toLowerCase()) &&
                                stockItem.quantidade > 0
                              );
                              if (filtered.length === 0) return null;
                              return (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                  {filtered.map((stockItem) => (
                                    <button
                                      key={stockItem.id}
                                      type="button"
                                      onMouseDown={() => {
                                        handleItemChange(index, "material", stockItem.material);
                                        setFocusedItemIndex(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 text-slate-700 font-medium flex justify-between items-center cursor-pointer"
                                    >
                                      <span>{stockItem.material}</span>
                                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                                        Em estoque: {stockItem.quantidade} {stockItem.unidadeMedida || 'un'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()
                          )}
                        </div>
                        <div className="w-28 relative">
                          <input
                            type="number"
                            min="1"
                            max={
                              tipoSolicitante === "administrativo"
                                ? 10
                                : undefined
                            }
                            placeholder="Qtd"
                            value={it.quantidade}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantidade",
                                e.target.value,
                              )
                            }
                            className="w-full pl-3.5 pr-8 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs text-center font-mono bg-white font-bold"
                            required
                          />
                          {tipoSolicitante === "administrativo" && (
                            <span className="absolute right-2 top-3 text-[9px] font-bold text-amber-600 select-none bg-amber-50 px-1 border border-amber-100 rounded">
                              Max 10
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          disabled={pedidoItens.length === 1}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Enviar Requisição</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
