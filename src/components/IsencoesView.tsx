import React, { useState, useMemo } from "react";
import { IsencaoEntry, GapEntry, UserProfile } from "../types";
import { db, COLLECTIONS, OperationType, handleFirestoreError } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  ShieldCheck,
  Check,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  User,
  Download,
  Upload,
  Eye,
  Paperclip,
  ExternalLink,
  FileDown,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";

interface IsencoesViewProps {
  isencoes: IsencaoEntry[];
  gap: GapEntry[];
  onToast: (m: string, t?: "success" | "error") => void;
  profile: UserProfile;
}

export function IsencoesView({
  isencoes,
  gap,
  onToast,
  profile,
}: IsencoesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [digitalizaFilter, setDigitalizaFilter] = useState<string>("");
  const [boletoFilter, setBoletoFilter] = useState<string>("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IsencaoEntry | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal Sem Interesse State
  const [resultadoModalState, setResultadoModalState] = useState<{
    isOpen: boolean;
    isencaoId: string | null;
    observacao: string;
  }>({
    isOpen: false,
    isencaoId: null,
    observacao: "",
  });

  // Form State
  const [formNome, setFormNome] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formOportunidade, setFormOportunidade] = useState("");
  const [formCurso, setFormCurso] = useState("");
  const [formCursoOrigem, setFormCursoOrigem] = useState("");
  const [formUniversidadeOrigem, setFormUniversidadeOrigem] = useState("");
  const [formFormaIngresso, setFormFormaIngresso] = useState("");
  const [formDigitaliza, setFormDigitaliza] = useState<"Sim" | "Não">("Não");
  const [formStatus, setFormStatus] = useState<"Pendente" | "Solicitado" | "Deferido">("Pendente");
  const [formBoletoPago, setFormBoletoPago] = useState(false);
  const [formComprovanteUrl, setFormComprovanteUrl] = useState("");
  const [formComprovanteNome, setFormComprovanteNome] = useState("");
  const [formComprovanteTipo, setFormComprovanteTipo] = useState("");
  const [formUploading, setFormUploading] = useState(false);

  // Modal para confirmar deferimento e anexar resposta/prévia do coordenador
  const [deferimentoModal, setDeferimentoModal] = useState<{
    isOpen: boolean;
    entry: IsencaoEntry | null;
    fileUrl: string;
    fileName: string;
    fileTipo: string;
    uploading: boolean;
  }>({
    isOpen: false,
    entry: null,
    fileUrl: "",
    fileName: "",
    fileTipo: "",
    uploading: false,
  });

  // Modal de visualização do documento/imagem
  const [viewAttachmentModal, setViewAttachmentModal] = useState<{
    isOpen: boolean;
    title: string;
    candidateName: string;
    curso: string;
    url: string;
    name: string;
    tipo: string;
  } | null>(null);

  // Helper para processar e comprimir arquivo (PDF ou JPEG/PNG)
  const processUploadedFile = (file: File): Promise<{ url: string; name: string; type: string }> => {
    return new Promise((resolve, reject) => {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);

      if (!isPdf && !isImg) {
        reject(new Error("Formato não suportado. Envie um arquivo em PDF ou imagem JPEG/PNG."));
        return;
      }

      if (isPdf) {
        if (file.size > 950 * 1024) {
          reject(new Error("O arquivo PDF ultrapassa o limite de 950 KB. Por favor, utilize um arquivo menor ou comprimido."));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            url: e.target?.result as string,
            name: file.name,
            type: "application/pdf",
          });
        };
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo PDF."));
        reader.readAsDataURL(file);
        return;
      }

      // Imagem: comprime via Canvas para otimizar tamanho
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL("image/jpeg", 0.78);
            resolve({
              url: compressed,
              name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
              type: "image/jpeg",
            });
          } else {
            resolve({
              url: e.target?.result as string,
              name: file.name,
              type: file.type || "image/jpeg",
            });
          }
        };
        img.onerror = () => {
          resolve({
            url: e.target?.result as string,
            name: file.name,
            type: file.type || "image/jpeg",
          });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Falha ao processar a imagem."));
      reader.readAsDataURL(file);
    });
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setFormNome("");
    setFormCpf("");
    setFormTelefone("");
    setFormOportunidade("");
    setFormCurso("");
    setFormCursoOrigem("");
    setFormUniversidadeOrigem("");
    setFormFormaIngresso("");
    setFormDigitaliza("Não");
    setFormStatus("Pendente");
    setFormBoletoPago(false);
    setFormComprovanteUrl("");
    setFormComprovanteNome("");
    setFormComprovanteTipo("");
    setIsModalOpen(true);
  };

  const openEditModal = (entry: IsencaoEntry) => {
    setEditingEntry(entry);
    setFormNome(entry.nome || "");
    setFormCpf(entry.cpf || "");
    setFormTelefone(entry.telefone || "");
    setFormOportunidade(entry.numeroOportunidade || "");
    setFormCurso(entry.curso || "");
    setFormCursoOrigem(entry.cursoOrigem || "");
    setFormUniversidadeOrigem(entry.universidadeOrigem || "");
    setFormFormaIngresso(entry.formaIngresso || "");
    setFormDigitaliza(entry.inseridoDigitaliza || "Não");
    setFormStatus(entry.status || "Pendente");
    setFormBoletoPago(entry.boletoPago || false);
    setFormComprovanteUrl(entry.comprovanteDeferidoUrl || "");
    setFormComprovanteNome(entry.comprovanteDeferidoNome || "");
    setFormComprovanteTipo(entry.comprovanteDeferidoTipo || "");
    setIsModalOpen(true);
  };

  // Automatically handles copying data to GAP Academic when "Boleto Pago" is marked
  const ensureCopiedToGap = async (entryData: {
    nome: string;
    cpf: string;
    telefone: string;
    numeroOportunidade?: string;
    curso: string;
  }) => {
    try {
      // 1. Format CPF to search for existing duplicates in current GAP state or database
      const cleanCpf = entryData.cpf.replace(/\D/g, "");
      const existsInGap = gap.some(
        (g) => (g.cpf || "").replace(/\D/g, "") === cleanCpf
      );

      if (existsInGap) {
        onToast("Candidato já está cadastrado no GAP Acadêmico.", "error");
        return;
      }

      // 2. Add to GAP Academic collection
      await addDoc(collection(db, COLLECTIONS.GAP), {
        nome: entryData.nome,
        cpf: entryData.cpf,
        telefone: entryData.telefone,
        produto: "Graduação", // Default fallback
        numeroOportunidade: entryData.numeroOportunidade || "",
        curso: entryData.curso,
        metodologia: "Isenção", // Metodologia default or placeholder
        formaIngresso: "Isenção",
        matAcad: false,
        documentos: {},
        unidade: profile.unidade || "",
        createdAt: serverTimestamp(),
      });
      onToast("Boleto Pago! Dados enviados automaticamente para o GAP Acadêmico.", "success");
    } catch (err) {
      console.error("Erro ao enviar dados para o GAP:", err);
      onToast("Erro ao sincronizar com GAP Acadêmico.", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome || !formCpf || !formTelefone || !formCurso) {
      onToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    const cleanCpf = formCpf.replace(/\D/g, "");
    const isDuplicate = isencoes.some((i) => {
      if (editingEntry && i.id === editingEntry.id) return false;
      return cleanCpf && (i.cpf || "").replace(/\D/g, "") === cleanCpf;
    });

    if (isDuplicate) {
      onToast("Já existe uma isenção cadastrada com este CPF!", "error");
      return;
    }

    setLoading(true);
    const entryData: any = {
      nome: formNome.trim(),
      cpf: formCpf.trim(),
      telefone: formTelefone.trim(),
      numeroOportunidade: formOportunidade.trim(),
      curso: formCurso.trim(),
      cursoOrigem: formCursoOrigem.trim(),
      universidadeOrigem: formUniversidadeOrigem.trim(),
      formaIngresso: formFormaIngresso.trim(),
      inseridoDigitaliza: formDigitaliza,
      status: formStatus,
      boletoPago: formBoletoPago,
      unidade: profile.unidade || "",
      updatedAt: serverTimestamp(),
    };

    if (formStatus === "Deferido") {
      if (formComprovanteUrl) {
        entryData.comprovanteDeferidoUrl = formComprovanteUrl;
        entryData.comprovanteDeferidoNome = formComprovanteNome || "previa_isencao_coordenador";
        entryData.comprovanteDeferidoTipo = formComprovanteTipo || "application/pdf";
      }
      if (!editingEntry?.dataDeferimento) {
        entryData.dataDeferimento = new Date().toISOString();
      }
    }

    try {
      if (editingEntry) {
        // Edit flow
        const wasBoletoPago = editingEntry.boletoPago;
        await updateDoc(doc(db, COLLECTIONS.ISENCOES, editingEntry.id), entryData);
        onToast("Isenção atualizada com sucesso!", "success");

        // If it was toggled to paid, copy to GAP
        if (formBoletoPago && !wasBoletoPago) {
          await ensureCopiedToGap(entryData);
        }
      } else {
        // Create flow
        const newDoc = await addDoc(collection(db, COLLECTIONS.ISENCOES), {
          ...entryData,
          createdAt: serverTimestamp(),
          createdByNome: profile.name || profile.email || "Usuário Desconhecido",
        });
        onToast("Isenção cadastrada com sucesso!", "success");

        if (formBoletoPago) {
          await ensureCopiedToGap(entryData);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.ISENCOES);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este registro de isenção?")) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.ISENCOES, id));
        onToast("Registro excluído com sucesso!", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, COLLECTIONS.ISENCOES);
      }
    }
  };

  const handleToggleStatus = async (entry: IsencaoEntry, newStatus: "Pendente" | "Solicitado" | "Deferido") => {
    if (newStatus === "Deferido") {
      setDeferimentoModal({
        isOpen: true,
        entry: entry,
        fileUrl: entry.comprovanteDeferidoUrl || "",
        fileName: entry.comprovanteDeferidoNome || "",
        fileTipo: entry.comprovanteDeferidoTipo || "",
        uploading: false,
      });
      return;
    }
    try {
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, entry.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      onToast(`Status alterado para ${newStatus}!`, "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, COLLECTIONS.ISENCOES);
    }
  };

  const handleConfirmDeferimento = async () => {
    if (!deferimentoModal.entry) return;
    try {
      setDeferimentoModal((prev) => ({ ...prev, uploading: true }));
      const entryId = deferimentoModal.entry.id;
      const updateData: any = {
        status: "Deferido",
        updatedAt: serverTimestamp(),
        dataDeferimento: deferimentoModal.entry.dataDeferimento || new Date().toISOString(),
      };
      if (deferimentoModal.fileUrl) {
        updateData.comprovanteDeferidoUrl = deferimentoModal.fileUrl;
        updateData.comprovanteDeferidoNome = deferimentoModal.fileName || "resposta_coordenador";
        updateData.comprovanteDeferidoTipo = deferimentoModal.fileTipo || "application/pdf";
      }
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, entryId), updateData);
      onToast("Isenção marcada como Deferida com sucesso!", "success");
      setDeferimentoModal({
        isOpen: false,
        entry: null,
        fileUrl: "",
        fileName: "",
        fileTipo: "",
        uploading: false,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, COLLECTIONS.ISENCOES);
      onToast("Erro ao deferir isenção.", "error");
      setDeferimentoModal((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleToggleResultado = async (
    item: IsencaoEntry,
    resultado: "Convertido" | "Sem interesse"
  ) => {
    if (resultado === "Sem interesse") {
      setResultadoModalState({
        isOpen: true,
        isencaoId: item.id,
        observacao: item.observacaoResultado || "",
      });
      return;
    }

    try {
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, item.id), {
        resultado: resultado,
        observacaoResultado: null,
        updatedAt: serverTimestamp(),
      });
      onToast("Resultado atualizado para Convertido!", "success");
    } catch (error) {
      console.error(error);
      onToast("Erro ao atualizar resultado.", "error");
    }
  };

  const handleSaveSemInteresse = async () => {
    if (!resultadoModalState.isencaoId) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, resultadoModalState.isencaoId), {
        resultado: "Sem interesse",
        observacaoResultado: resultadoModalState.observacao,
        updatedAt: serverTimestamp(),
      });
      onToast("Observação salva com sucesso!", "success");
      setResultadoModalState({ isOpen: false, isencaoId: null, observacao: "" });
    } catch (error) {
      console.error(error);
      onToast("Erro ao salvar observação.", "error");
    }
  };

  const handleToggleBoleto = async (entry: IsencaoEntry) => {
    try {
      const nextBoletoStatus = !entry.boletoPago;
      await updateDoc(doc(db, COLLECTIONS.ISENCOES, entry.id), {
        boletoPago: nextBoletoStatus,
        updatedAt: serverTimestamp(),
      });

      onToast(`Boleto marcado como ${nextBoletoStatus ? "Pago" : "Pendente"}!`, "success");

      if (nextBoletoStatus) {
        await ensureCopiedToGap({
          nome: entry.nome,
          cpf: entry.cpf,
          telefone: entry.telefone,
          numeroOportunidade: entry.numeroOportunidade,
          curso: entry.curso,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, COLLECTIONS.ISENCOES);
    }
  };

  // Filter & Search Logic
  const filteredIsencoes = useMemo(() => {
    return isencoes.filter((item) => {
      // Gestor Unidade filtering: only see actions from the same unit
      if (profile.role === "Gestor Unidade") {
        if (!profile.unidade || item.unidade !== profile.unidade) {
          return false;
        }
      }

      const matchSearch =
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cpf?.includes(searchTerm) ||
        item.telefone?.includes(searchTerm);

      const matchStatus = !statusFilter || item.status === statusFilter;
      const matchDigitaliza = !digitalizaFilter || item.inseridoDigitaliza === digitalizaFilter;
      const matchBoleto =
        !boletoFilter ||
        (boletoFilter === "Sim" && item.boletoPago) ||
        (boletoFilter === "Não" && !item.boletoPago);

      return matchSearch && matchStatus && matchDigitaliza && matchBoleto;
    });
  }, [isencoes, searchTerm, statusFilter, digitalizaFilter, boletoFilter]);

  // Status Stats counters
  const stats = useMemo(() => {
    const total = isencoes.length;
    const pendente = isencoes.filter((i) => i.status === "Pendente").length;
    const solicitado = isencoes.filter((i) => i.status === "Solicitado").length;
    const deferido = isencoes.filter((i) => i.status === "Deferido").length;
    const convertido = isencoes.filter((i) => i.resultado === "Convertido").length;
    const boletoPago = isencoes.filter((i) => i.boletoPago).length;

    return { total, pendente, solicitado, deferido, convertido, boletoPago };
  }, [isencoes]);

  // EXPORT TO EXCEL
  const handleExportExcel = () => {
    if (filteredIsencoes.length === 0) {
      onToast("Não existem dados para exportar.", "error");
      return;
    }

    const dataToExport = filteredIsencoes.map((item) => ({
      Nome: item.nome,
      CPF: item.cpf,
      Telefone: item.telefone,
      Oportunidade: item.numeroOportunidade || "",
      "Curso Interesse": item.curso,
      "Curso Origem": item.cursoOrigem || "",
      "Universidade Origem": item.universidadeOrigem || "",
      "Forma de Ingresso": item.formaIngresso || "",
      Digitaliza: item.inseridoDigitaliza,
      Status: item.status,
      "Boleto Pago": item.boletoPago ? "Sim" : "Não",
      Resultado: item.resultado || "",
      Observacao: item.observacaoResultado || "",
      Unidade: item.unidade || "",
      CriadoPor: item.createdByNome || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Isencoes");

    XLSX.writeFile(
      workbook,
      `Isencoes_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    onToast("Excel exportado com sucesso!", "success");
  };

  // EXCEL TEMPLATE DOWNLOAD
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Nome: "João da Silva",
        CPF: "123.456.789-00",
        Telefone: "(11) 99999-9999",
        Oportunidade: "12345",
        "Curso Interesse": "Direito",
        "Curso Origem": "Administração",
        "Universidade Origem": "Estácio",
        Digitaliza: "Não",
        Status: "Pendente",
        "Boleto Pago": "Não",
        Unidade: "Sede",
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo Importação");

    XLSX.writeFile(workbook, `Modelo_Isencoes.xlsx`);
    onToast("Modelo baixado com sucesso!", "success");
  };

  // IMPORT FROM EXCEL
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawData || rawData.length === 0) {
          onToast(
            "O arquivo Excel correspondente está vazio ou em formato inválido.",
            "error",
          );
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;
        const insertedCpfs = new Set<string>();
        setLoading(true);

        for (const row of rawData) {
          const nome = row["Nome"] || row["nome"];
          const cpf = row["CPF"] || row["cpf"];
          const telefone = row["Telefone"] || row["telefone"];
          const curso = row["Curso Interesse"] || row["curso"] || row["Curso"];
          
          if (!nome || !cpf || !telefone || !curso) continue;

          const cleanCpf = String(cpf).replace(/\D/g, "");
          const isDup =
            (cleanCpf && isencoes.some((i) => (i.cpf || "").replace(/\D/g, "") === cleanCpf)) ||
            (cleanCpf && insertedCpfs.has(cleanCpf));

          if (isDup) {
            skippedCount++;
            continue;
          }

          let statusRaw = row["Status"] || row["status"] || "Pendente";
          let status: "Pendente" | "Solicitado" | "Deferido" = "Pendente";
          if (["Pendente", "Solicitado", "Deferido"].includes(statusRaw)) {
             status = statusRaw as any;
          }

          let digitalizaRaw = row["Digitaliza"] || row["digitaliza"] || "Não";
          let digitaliza: "Sim" | "Não" = "Não";
          if (["Sim", "Não"].includes(digitalizaRaw)) {
             digitaliza = digitalizaRaw as any;
          }

          let boletoRaw = row["Boleto Pago"] || row["boleto pago"] || row["BoletoPago"] || "Não";
          let boletoPago = boletoRaw === "Sim";

          const unidadeRaw = row["Unidade"] || row["unidade"];

          const isencaoData = {
            nome: String(nome).trim(),
            cpf: String(cpf).trim(),
            telefone: String(telefone).trim(),
            numeroOportunidade: String(row["Oportunidade"] || row["oportunidade"] || "").trim(),
            curso: String(curso).trim(),
            cursoOrigem: String(row["Curso Origem"] || row["curso origem"] || "").trim(),
            universidadeOrigem: String(row["Universidade Origem"] || row["universidade origem"] || "").trim(),
            inseridoDigitaliza: digitaliza,
            status,
            boletoPago,
            unidade: profile.role === "Gestor Unidade" ? (profile.unidade || "") : (unidadeRaw ? String(unidadeRaw).trim() : (profile.unidade || "")),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdByNome: profile.name || profile.email || "Usuário Desconhecido",
          };

          await addDoc(collection(db, COLLECTIONS.ISENCOES), isencaoData);
          if (cleanCpf) insertedCpfs.add(cleanCpf);
          importedCount++;
          
          if (boletoPago) {
             try {
                const existsInGap = gap.some(
                  (g) => (g.cpf || "").replace(/\D/g, "") === cleanCpf
                );
          
                if (!existsInGap) {
                  await addDoc(collection(db, COLLECTIONS.GAP), {
                    nome: isencaoData.nome,
                    cpf: isencaoData.cpf,
                    telefone: isencaoData.telefone,
                    produto: "Graduação",
                    numeroOportunidade: isencaoData.numeroOportunidade || "",
                    curso: isencaoData.curso,
                    metodologia: "Isenção",
                    formaIngresso: "Isenção",
                    matAcad: false,
                    documentos: {},
                    unidade: isencaoData.unidade,
                    createdAt: serverTimestamp(),
                  });
                }
             } catch (e) {
                console.error("Failed to copy imported isencao to gap", e);
             }
          }
        }

        if (importedCount > 0 || skippedCount > 0) {
          onToast(
            `${importedCount} registros importados com sucesso!${skippedCount > 0 ? ` (${skippedCount} duplicatas ignoradas)` : ""}`,
            importedCount > 0 ? "success" : "error"
          );
        } else {
          onToast(
            "Nenhuma isenção válida encontrada. Verifique as colunas obrigatórias (Nome, CPF, Telefone, Curso Interesse).",
            "error",
          );
        }
      } catch (error) {
        console.error("Erro na importação:", error);
        onToast("Erro ao importar o arquivo Excel.", "error");
      } finally {
        setLoading(false);
        // Reset file input
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6" id="isencoes-tracking-container">
      {/* Header and top metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={28} />
            Acompanhamento de Isenções
          </h2>
          <p className="text-sm text-slate-500">
            Gerencie o status e o pagamento de isenções acadêmicas integradas ao GAP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
            title="Exportar para Excel"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          
          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Importar Excel"
            />
            <button
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
              title="Importar de Excel"
            >
              <Upload size={20} />
              <span className="hidden sm:inline">Importar</span>
            </button>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
            title="Baixar Modelo de Excel"
          >
            <FileText size={20} />
            <span className="hidden md:inline">Modelo</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            Nova Isenção
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
          <span className="text-2xl font-black text-slate-800 mt-2">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-xs font-bold text-amber-500 uppercase">Pendentes</span>
          <span className="text-2xl font-black text-amber-600 mt-2">{stats.pendente}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-blue-500">
          <span className="text-xs font-bold text-blue-500 uppercase">Solicitados</span>
          <span className="text-2xl font-black text-blue-600 mt-2">{stats.solicitado}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-xs font-bold text-emerald-500 uppercase">Deferidos</span>
          <span className="text-2xl font-black text-emerald-600 mt-2">{stats.deferido}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-purple-500">
          <span className="text-xs font-bold text-purple-500 uppercase">Boleto Pago</span>
          <span className="text-2xl font-black text-purple-600 mt-2">{stats.boletoPago}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-600 col-span-2 lg:col-span-1">
          <span className="text-xs font-bold text-emerald-600 uppercase">Convertidos</span>
          <span className="text-2xl font-black text-emerald-700 mt-2">{stats.convertido}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">Status: Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Solicitado">Solicitado</option>
              <option value="Deferido">Deferido</option>
            </select>
          </div>

          <div>
            <select
              value={digitalizaFilter}
              onChange={(e) => setDigitalizaFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">No Digitaliza: Todos</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>

          <div>
            <select
              value={boletoFilter}
              onChange={(e) => setBoletoFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">Boleto Pago: Todos</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Candidato</th>
                <th className="p-4">CPF / Telefone</th>
                <th className="p-4">Oportunidade</th>
                <th className="p-4">Curso Interesse (Estácio)</th>
                <th className="p-4">Origem (Curso/IES)</th>
                <th className="p-4">Forma de Ingresso</th>
                <th className="p-4 text-center">Digitaliza</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Boleto Pago</th>
                <th className="p-4 text-center">Resultado</th>
                <th className="p-4 text-center">Ações Rápidas</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredIsencoes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    Nenhuma isenção cadastrada ou compatível com os filtros.
                  </td>
                </tr>
              ) : (
                filteredIsencoes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.nome}</div>
                      {item.createdByNome && (
                        <div className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1 bg-slate-100 w-fit px-1.5 py-0.5 rounded">
                          <User size={10} /> {item.createdByNome}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs">{item.cpf}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.telefone}</div>
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-xs">
                      {item.numeroOportunidade || "—"}
                    </td>
                    <td className="p-4 text-slate-600 max-w-[200px] truncate">{item.curso}</td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs font-bold text-slate-700">{item.cursoOrigem || "—"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.universidadeOrigem || "—"}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="text-xs font-medium text-slate-700">{item.formaIngresso || "—"}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-1 rounded-full text-xs font-bold",
                          item.inseridoDigitaliza === "Sim"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        )}
                      >
                        {item.inseridoDigitaliza}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-1 rounded-full text-xs font-bold",
                          item.status === "Deferido" && "bg-emerald-100 text-emerald-800",
                          item.status === "Solicitado" && "bg-blue-100 text-blue-800",
                          item.status === "Pendente" && "bg-amber-100 text-amber-800"
                        )}
                      >
                        {item.status}
                      </span>
                      {item.status === "Deferido" && (
                        <div className="mt-1 flex flex-col items-center">
                          {item.comprovanteDeferidoUrl ? (
                            <button
                              onClick={() =>
                                setViewAttachmentModal({
                                  isOpen: true,
                                  title: "Resposta do Coordenador - Prévia de Isenção",
                                  candidateName: item.nome,
                                  curso: item.curso,
                                  url: item.comprovanteDeferidoUrl!,
                                  name: item.comprovanteDeferidoNome || "previa_isencao",
                                  tipo: item.comprovanteDeferidoTipo || (item.comprovanteDeferidoUrl?.startsWith("data:application/pdf") ? "application/pdf" : "image/jpeg"),
                                })
                              }
                              title="Visualizar parecer do coordenador"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                            >
                              <Paperclip size={12} className="text-emerald-600" />
                              Ver Prévia
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setDeferimentoModal({
                                  isOpen: true,
                                  entry: item,
                                  fileUrl: "",
                                  fileName: "",
                                  fileTipo: "",
                                  uploading: false,
                                })
                              }
                              title="Anexar resposta do coordenador com a prévia"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline transition-colors"
                            >
                              <Upload size={10} />
                              Anexar Prévia
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleBoleto(item)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all",
                          item.boletoPago
                            ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {item.boletoPago ? (
                          <>
                            <CheckCircle size={14} />
                            Pago
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            Pendente
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => handleToggleResultado(item, "Convertido")}
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all w-full",
                            item.resultado === "Convertido"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Convertido
                        </button>
                        <button
                          onClick={() => handleToggleResultado(item, "Sem interesse")}
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all w-full",
                            item.resultado === "Sem interesse"
                              ? "bg-rose-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Sem interesse
                        </button>
                      </div>
                      {item.resultado === "Sem interesse" && item.observacaoResultado && (
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate mx-auto" title={item.observacaoResultado}>
                          {item.observacaoResultado}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(item, "Pendente")}
                          title="Marcar como Pendente"
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                            item.status === "Pendente"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Pendente
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item, "Solicitado")}
                          title="Marcar como Solicitado"
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                            item.status === "Solicitado"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Solicitado
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item, "Deferido")}
                          title="Marcar como Deferido"
                          className={cn(
                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                            item.status === "Deferido"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Deferido
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation and Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck size={22} className="text-blue-600" />
                {editingEntry ? "Editar Isenção" : "Cadastrar Isenção"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Nome do candidato"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: 000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: (00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nº da Oportunidade (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formOportunidade}
                    onChange={(e) => setFormOportunidade(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: 12345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Curso de Interesse na Estácio *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCurso}
                    onChange={(e) => setFormCurso(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Direito"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Curso de Origem (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formCursoOrigem}
                    onChange={(e) => setFormCursoOrigem(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Administração"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Universidade de Origem (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formUniversidadeOrigem}
                    onChange={(e) => setFormUniversidadeOrigem(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: IES de Origem"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Forma de Ingresso (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formFormaIngresso}
                    onChange={(e) => setFormFormaIngresso(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Transferência Externa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Inserido no Digitaliza?
                  </label>
                  <select
                    value={formDigitaliza}
                    onChange={(e) => setFormDigitaliza(e.target.value as "Sim" | "Não")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Status da Isenção
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Pendente" | "Solicitado" | "Deferido")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Solicitado">Solicitado</option>
                    <option value="Deferido">Deferido</option>
                  </select>
                </div>

                {formStatus === "Deferido" && (
                  <div className="md:col-span-2 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <FileText size={16} className="text-emerald-700" />
                          Resposta do Coordenador com Prévia de Isenção
                        </h4>
                        <p className="text-[11px] text-emerald-700/80 mt-0.5">
                          Anexe o arquivo em PDF ou imagem (JPEG/PNG) contendo a prévia do coordenador
                        </p>
                      </div>
                      {formComprovanteUrl && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full">
                          Anexado
                        </span>
                      )}
                    </div>

                    {formComprovanteUrl ? (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {formComprovanteTipo === "application/pdf" || formComprovanteUrl.startsWith("data:application/pdf") ? (
                            <FileText size={20} className="text-rose-500 shrink-0" />
                          ) : (
                            <ImageIcon size={20} className="text-emerald-600 shrink-0" />
                          )}
                          <div className="truncate text-xs font-medium text-slate-700">
                            {formComprovanteNome || "previa_isencao_coordenador"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setViewAttachmentModal({
                                isOpen: true,
                                title: "Prévia de Isenção - Parecer do Coordenador",
                                candidateName: formNome || "Candidato",
                                curso: formCurso || "",
                                url: formComprovanteUrl,
                                name: formComprovanteNome || "documento",
                                tipo: formComprovanteTipo,
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100 transition-colors"
                            title="Visualizar anexo"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormComprovanteUrl("");
                              setFormComprovanteNome("");
                              setFormComprovanteTipo("");
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 transition-colors"
                            title="Remover anexo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white/70 hover:bg-white rounded-xl p-4 cursor-pointer transition-all text-center">
                        <Upload size={24} className="text-emerald-600 mb-1" />
                        <span className="text-xs font-bold text-emerald-800">
                          {formUploading ? "Processando arquivo..." : "Clique para selecionar o arquivo da prévia"}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          Formatos aceitos: PDF ou JPEG/PNG (máx 950 KB)
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={formUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setFormUploading(true);
                              const res = await processUploadedFile(file);
                              setFormComprovanteUrl(res.url);
                              setFormComprovanteNome(res.name);
                              setFormComprovanteTipo(res.type);
                              onToast("Arquivo da prévia carregado!", "success");
                            } catch (err: any) {
                              onToast(err.message || "Erro ao carregar arquivo.", "error");
                            } finally {
                              setFormUploading(false);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Boleto Pago toggle card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-700">Boleto Pago</h4>
                  <p className="text-xs text-slate-400 max-w-[280px]">
                    Se marcado, os dados do candidato serão enviados automaticamente ao GAP Acadêmico.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formBoletoPago}
                  onChange={(e) => setFormBoletoPago(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sem Interesse */}
      {resultadoModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Motivo - Sem interesse
              </h3>
              <button
                onClick={() => setResultadoModalState({ isOpen: false, isencaoId: null, observacao: "" })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Observação <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={resultadoModalState.observacao}
                  onChange={(e) => setResultadoModalState(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Por que o candidato não tem interesse?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-24"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setResultadoModalState({ isOpen: false, isencaoId: null, observacao: "" })}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSemInteresse}
                disabled={!resultadoModalState.observacao.trim()}
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Deferimento & Anexar Prévia do Coordenador */}
      {deferimentoModal.isOpen && deferimentoModal.entry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Confirmar Deferimento de Isenção
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidato: <span className="font-semibold text-slate-700">{deferimentoModal.entry.nome}</span> ({deferimentoModal.entry.curso})
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setDeferimentoModal({
                    isOpen: false,
                    entry: null,
                    fileUrl: "",
                    fileName: "",
                    fileTipo: "",
                    uploading: false,
                  })
                }
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">CPF:</span> {deferimentoModal.entry.cpf}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Curso Solicitado:</span> {deferimentoModal.entry.curso}
                </div>
                {deferimentoModal.entry.cursoOrigem && (
                  <div>
                    <span className="font-semibold text-slate-700">Origem:</span> {deferimentoModal.entry.cursoOrigem} ({deferimentoModal.entry.universidadeOrigem || "IES não informada"})
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText size={16} className="text-emerald-600" />
                    Resposta do Coordenador com Prévia de Isenção
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">PDF ou JPEG/PNG</span>
                </label>

                {deferimentoModal.fileUrl ? (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {deferimentoModal.fileTipo === "application/pdf" || deferimentoModal.fileUrl.startsWith("data:application/pdf") ? (
                          <FileText size={24} className="text-rose-500 shrink-0" />
                        ) : (
                          <ImageIcon size={24} className="text-emerald-600 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-800 truncate max-w-[260px]">
                            {deferimentoModal.fileName || "resposta_coordenador"}
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Arquivo pronto para salvar
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setViewAttachmentModal({
                              isOpen: true,
                              title: "Prévia de Isenção - Resposta do Coordenador",
                              candidateName: deferimentoModal.entry?.nome || "",
                              curso: deferimentoModal.entry?.curso || "",
                              url: deferimentoModal.fileUrl,
                              name: deferimentoModal.fileName || "resposta_coordenador",
                              tipo: deferimentoModal.fileTipo,
                            })
                          }
                          className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-white transition-colors"
                          title="Visualizar anexo"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeferimentoModal((prev) => ({
                              ...prev,
                              fileUrl: "",
                              fileName: "",
                              fileTipo: "",
                            }))
                          }
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-white transition-colors"
                          title="Remover anexo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {deferimentoModal.fileTipo !== "application/pdf" && !deferimentoModal.fileUrl.startsWith("data:application/pdf") && (
                      <div className="relative rounded-lg overflow-hidden border border-emerald-200 max-h-36 flex items-center justify-center bg-black/5">
                        <img
                          src={deferimentoModal.fileUrl}
                          alt="Prévia do Coordenador"
                          className="max-h-36 object-contain"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/50 rounded-2xl p-6 cursor-pointer transition-all text-center">
                    <Upload size={28} className="text-emerald-600 mb-2" />
                    <span className="text-xs font-bold text-slate-700">
                      {deferimentoModal.uploading ? "Processando documento..." : "Clique ou arraste a resposta do coordenador"}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Formatos: PDF ou foto/imagem JPEG (máx 950 KB)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={deferimentoModal.uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setDeferimentoModal((prev) => ({ ...prev, uploading: true }));
                          const res = await processUploadedFile(file);
                          setDeferimentoModal((prev) => ({
                            ...prev,
                            fileUrl: res.url,
                            fileName: res.name,
                            fileTipo: res.type,
                            uploading: false,
                          }));
                          onToast("Arquivo carregado com sucesso!", "success");
                        } catch (err: any) {
                          onToast(err.message || "Erro ao carregar arquivo.", "error");
                          setDeferimentoModal((prev) => ({ ...prev, uploading: false }));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() =>
                  setDeferimentoModal({
                    isOpen: false,
                    entry: null,
                    fileUrl: "",
                    fileName: "",
                    fileTipo: "",
                    uploading: false,
                  })
                }
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeferimento}
                disabled={deferimentoModal.uploading}
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={18} />
                Confirmar Deferimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizador do Arquivo Anexado (PDF ou Imagem) */}
      {viewAttachmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                  <FileText size={20} />
                </div>
                <div className="truncate">
                  <h3 className="text-sm md:text-base font-bold text-slate-800 truncate">
                    {viewAttachmentModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {viewAttachmentModal.candidateName} • {viewAttachmentModal.curso}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={viewAttachmentModal.url}
                  download={viewAttachmentModal.name || "previa_isencao"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <Download size={14} />
                  Baixar
                </a>
                <button
                  onClick={() => setViewAttachmentModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100/50">
              {viewAttachmentModal.tipo === "application/pdf" || viewAttachmentModal.url.startsWith("data:application/pdf") ? (
                <iframe
                  src={viewAttachmentModal.url}
                  title="Parecer do Coordenador"
                  className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white shadow-inner"
                />
              ) : (
                <div className="max-w-full max-h-[65vh] flex items-center justify-center">
                  <img
                    src={viewAttachmentModal.url}
                    alt="Resposta do Coordenador"
                    className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white text-xs text-slate-500">
              <span className="truncate max-w-xs">{viewAttachmentModal.name}</span>
              <button
                type="button"
                onClick={() => setViewAttachmentModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
