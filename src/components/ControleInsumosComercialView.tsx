import React, { useState, useMemo, useEffect } from "react";
import {
  InsumoPedidoComercial,
  InsumoEstoqueComercial,
  InsumoItemComercial,
  UserProfile,
  InsumoBaixa,
} from "../types";
import {
  db,
  COLLECTIONS,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { InsumosDashboard } from "./InsumosDashboard";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  Trash2,
  Check,
  X,
  ClipboardList,
  Layers,
  AlertTriangle,
  CheckCircle2,
  User,
  Boxes,
  RotateCcw,
  Gauge,
  ShoppingCart,
  Clock,
  Upload,
  Download,
  ChevronLeft,
  Building2,
  Users,
  Book,
  FileText,
  Send,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ROLES } from "../App";
import * as XLSX from "xlsx";

interface ControleInsumosComercialViewProps {
  pedidos: InsumoPedidoComercial[];
  estoque: InsumoEstoqueComercial[];
  profile: UserProfile;
  onToast: (m: string, t?: "success" | "error") => void;
  botConfig?: any;
}

export function ControleInsumosComercialView({
  pedidos,
  estoque,
  profile,
  onToast,
  botConfig,
}: ControleInsumosComercialViewProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "pedidos" | "estoque"
  >("dashboard");
  const [isAddingPedido, setIsAddingPedido] = useState(false);
  const [isAddingEstoque, setIsAddingEstoque] = useState(false);
  const [editingEstoque, setEditingEstoque] =
    useState<InsumoEstoqueComercial | null>(null);

  // Commercial Material Discard / Baixa States
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] =
    useState<InsumoEstoqueComercial | null>(null);
  const [baixaQuantidade, setBaixaQuantidade] = useState<number>(1);
  const [baixaMotivo, setBaixaMotivo] = useState<
    "Uso em aula" | "Uso no setor" | "Material vencido(lixo)"
  >("Uso em aula");
  const [baixas, setBaixas] = useState<InsumoBaixa[]>([]);

  // New Request Form State
  const [motivoUso, setMotivoUso] = useState("");
  const [pedidoItens, setPedidoItens] = useState<InsumoItemComercial[]>([
    { material: "", quantidade: 1 },
  ]);

  // Type qualification & fields
  const [tipoSolicitante, setTipoSolicitante] = useState<
    "docente" | "administrativo" | null
  >(null);
  const [professorName, setProfessorName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [matricula, setMatricula] = useState("");
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [rejectingPedido, setRejectingPedido] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [isMatchingAI, setIsMatchingAI] = useState<number | null>(null);

  // Sync employees
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.FUNCIONARIOS),
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        setFuncionarios(list);
      },
    );
    return () => unsub();
  }, []);

  // Sync commercial write-offs (baixas)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.INSUMOS_BAIXAS_COMERCIAL),
      (snap) => {
        const list: InsumoBaixa[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as InsumoBaixa);
        });
        setBaixas(list);
      },
      (error) => {
        console.error("Erro ao sincronizar baixas comerciais: ", error);
      },
    );
    return () => unsub();
  }, []);

  // New Stock Form State
  const [stockMaterial, setStockMaterial] = useState("");
  const [stockQuantidade, setStockQuantidade] = useState<number>(0);
  const [stockUnidade, setStockUnidade] = useState("UN");
  const [stockMinimo, setStockMinimo] = useState<number>(5);
  const [stockDescricao, setStockDescricao] = useState("");

  // Search & Filters
  const [pedidoStatusFilter, setPedidoStatusFilter] = useState<string>("Todos");
  const [pedidoSearch, setPedidoSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  // Email notifications
  const [emailAlertas, setEmailAlertas] = useState<string>(
    localStorage.getItem("insumos_comercial_email_alertas") || "",
  );

  const handleEmailAlertasChange = (val: string) => {
    setEmailAlertas(val);
    localStorage.setItem("insumos_comercial_email_alertas", val);
  };

  // "apenas o gerente comercial vai validar se foi aceito ou não o pedido e vai mudar os status"
  const isGerenteOrAdmin = useMemo(() => {
    return (
      profile.role === ROLES.ADMIN_MASTER ||
      profile.role === "Admin Master" ||
      profile.role === "Gerente Comercial (Comercial)" ||
      profile.role === "Gestor Comercial"
    );
  }, [profile.role]);

  // Handle adding list row in requisition
  const handleAddRequestItem = () => {
    setPedidoItens([...pedidoItens, { material: "", quantidade: 1 }]);
  };

  const handleRemoveRequestItem = (index: number) => {
    if (pedidoItens.length === 1) return;
    setPedidoItens(pedidoItens.filter((_, i) => i !== index));
  };

  const handleRequestItemChange = (
    index: number,
    field: keyof InsumoItemComercial,
    value: any,
  ) => {
    const updated = [...pedidoItens];
    if (field === "quantidade") {
      let qty = Math.max(1, parseInt(value) || 1);
      if (tipoSolicitante === "administrativo" && qty > 10) {
        qty = 10;
        onToast(
          "O limite máximo para solicitação administrativa é de 10 unidades por item.",
          "error",
        );
      }
      updated[index].quantidade = qty;
    } else {
      updated[index].material = value;
    }
    setPedidoItens(updated);
  };

  // Submit supply request (Pedido de Insumos)
  const handleSubmitPedido = async (e: React.FormEvent) => {
    e.preventDefault();

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
      onToast(
        "Por favor, adicione ao menos um material para requisitar.",
        "error",
      );
      return;
    }

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

    try {
      const newPedido: any = {
        motivoUso: motivoUso,
        itens: filteredItens,
        status: "Pendente",
        solicitanteId: profile.uid,
        solicitanteNome: profile.name,
        professorNome: professorName,
        cursoNome: courseName,
        disciplinaNome:
          tipoSolicitante === "docente" ? subjectName : "Administrativo",
        tipoFicha: tipoSolicitante,
        matricula: matricula || "",
        createdAt: new Date().toISOString(),
      };

      await addDoc(
        collection(db, COLLECTIONS.INSUMOS_PEDIDOS_COMERCIAL),
        newPedido,
      );
      onToast("Solicitação de insumos enviada com sucesso!", "success");

      // Reset form
      setMotivoUso("");
      setProfessorName("");
      setCourseName("");
      setSubjectName("");
      setMatricula("");
      setTipoSolicitante(null);
      setPedidoItens([{ material: "", quantidade: 1 }]);
      setIsAddingPedido(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        COLLECTIONS.INSUMOS_PEDIDOS_COMERCIAL,
      );
      onToast(
        "Erro ao salvar solicitação. Verifique suas permissões.",
        "error",
      );
    }
  };

  // Submit or Edit Stock item (Controle de Estoque)
  const handleSubmitEstoque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockMaterial) {
      onToast("O nome do material é obrigatório.", "error");
      return;
    }

    try {
      if (editingEstoque) {
        const itemRef = doc(
          db,
          COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL,
          editingEstoque.id,
        );
        await updateDoc(itemRef, {
          material: stockMaterial,
          quantidade: stockQuantidade,
          unidadeMedida: stockUnidade,
          estoqueMinimo: stockMinimo,
          descricao: stockDescricao,
          updatedAt: serverTimestamp(),
        });
        onToast("Item de estoque atualizado com sucesso!", "success");

        if (stockQuantidade < stockMinimo) {
          onToast(`⚠️ Nível crítico atingido para: ${stockMaterial}`, "error");
          if (emailAlertas) {
            onToast(
              `✉️ Alerta enviado para o e-mail: ${emailAlertas}`,
              "success",
            );
          }
        }
      } else {
        const newEstoque: Omit<InsumoEstoqueComercial, "id"> = {
          material: stockMaterial,
          quantidade: stockQuantidade,
          unidadeMedida: stockUnidade,
          estoqueMinimo: stockMinimo,
          descricao: stockDescricao,
          ownerId: profile.uid,
          ownerName: profile.name,
          updatedAt: new Date().toISOString(),
        };
        await addDoc(
          collection(db, COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL),
          newEstoque,
        );
        onToast("Novo item adicionado ao seu estoque!", "success");
      }

      // Reset
      setStockMaterial("");
      setStockQuantidade(0);
      setStockUnidade("UN");
      setStockMinimo(5);
      setStockDescricao("");
      setIsAddingEstoque(false);
      setEditingEstoque(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL,
      );
      onToast("Erro ao salvar no estoque. Verifique suas permissões.", "error");
    }
  };

  // Delete Stock Item
  const handleDeleteEstoque = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este item do estoque?"))
      return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL, id));
      onToast("Item removido do estoque com sucesso.", "success");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL,
      );
      onToast("Erro ao remover item.", "error");
    }
  };

  // Bulk delete selected stock items (Comercial)
  const handleBulkDeleteStock = async () => {
    if (selectedStockIds.length === 0) return;
    if (!window.confirm(`Deseja realmente excluir os ${selectedStockIds.length} itens de estoque selecionados?`)) return;
    try {
      for (const id of selectedStockIds) {
        await deleteDoc(doc(db, COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL, id));
      }
      setSelectedStockIds([]);
      onToast("Itens excluídos em lote com sucesso.", "success");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL,
      );
      onToast("Erro ao excluir itens em massa.", "error");
    }
  };

  // Fuzzy match material with current stock using Gemini AI (Comercial)
  const handleAIMatch = async (index: number) => {
    const item = pedidoItens[index];
    if (!item || !item.material.trim()) return;

    setIsMatchingAI(index);
    try {
      const stockMaterials = Array.from(
        new Set((estoque || []).map((s) => s.material).filter(Boolean))
      );

      const response = await fetch("/api/match-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typedText: item.material,
          stockMaterials,
          openRouterApiKey: botConfig?.openRouterApiKey,
          aiModel: botConfig?.aiModel
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na requisição ao servidor.");
      }

      const data = await response.json();
      if (data.success && data.matched && data.suggestion) {
        handleRequestItemChange(index, "material", data.suggestion);
        onToast(`✨ Ajustado para "${data.suggestion}": ${data.reason}`, "success");
      } else {
        onToast(`✨ ${data.error || data.reason || "Nenhum material semelhante encontrado no estoque."}`, "error");
      }
    } catch (err: any) {
      console.error("AI Match error:", err);
      onToast("Erro ao comunicar com a inteligência artificial.", "error");
    } finally {
      setIsMatchingAI(null);
    }
  };

  // Confirm Physical Stock Discard / Baixa (Comercial)
  const handleConfirmBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem) return;
    if (baixaQuantidade <= 0) {
      onToast("A quantidade a baixar deve ser maior que zero.", "error");
      return;
    }
    if (baixaQuantidade > selectedStockItem.quantidade) {
      onToast(
        `A quantidade a baixar (${baixaQuantidade}) excede o estoque disponível (${selectedStockItem.quantidade}).`,
        "error",
      );
      return;
    }

    try {
      const itemRef = doc(
        db,
        COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL,
        selectedStockItem.id,
      );
      const newQty = selectedStockItem.quantidade - baixaQuantidade;
      await updateDoc(itemRef, {
        quantidade: newQty,
        updatedAt: serverTimestamp(),
      });

      const newBaixa: any = {
        materialId: selectedStockItem.id,
        materialNome: selectedStockItem.material,
        quantidade: baixaQuantidade,
        motivo: baixaMotivo,
        realizadoPor: profile.name,
        createdAt: new Date().toISOString(),
      };
      await addDoc(
        collection(db, COLLECTIONS.INSUMOS_BAIXAS_COMERCIAL),
        newBaixa,
      );

      onToast(
        `Baixa de ${baixaQuantidade} ${selectedStockItem.unidadeMedida || "UN"} de "${selectedStockItem.material}" registrada com sucesso!`,
        "success",
      );

      if (newQty < (selectedStockItem.estoqueMinimo ?? 5)) {
        onToast(
          `Atenção: O estoque de "${selectedStockItem.material}" está abaixo do mínimo! (Estoque atual: ${newQty})`,
          "error",
        );
      }

      setBaixaModalOpen(false);
      setSelectedStockItem(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL,
      );
      onToast("Erro ao registrar a baixa do material.", "error");
    }
  };

  // Delete Pedido Request
  const handleDeletePedido = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta solicitação?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.INSUMOS_PEDIDOS_COMERCIAL, id));
      onToast("Solicitação excluída com sucesso.", "success");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        COLLECTIONS.INSUMOS_PEDIDOS_COMERCIAL,
      );
      onToast("Erro ao excluir solicitação.", "error");
    }
  };

  // Update Pedido Status
  const handleUpdateStatus = async (
    pedido: InsumoPedidoComercial,
    newStatus:
      | "Pendente"
      | "Aprovado"
      | "Rejeitado"
      | "Em Andamento"
      | "Entregue",
    observacao?: string,
  ) => {
    try {
      const pedidoRef = doc(
        db,
        COLLECTIONS.INSUMOS_PEDIDOS_COMERCIAL,
        pedido.id,
      );

      // Auto-deduct stock for internal management is disabled for commercial as they manage their own stocks

      await updateDoc(pedidoRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(observacao ? { observacaoRejeicao: observacao } : {}),
      });

      onToast(`Pedido atualizado para "${newStatus}" com sucesso!`, "success");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        COLLECTIONS.INSUMOS_PEDIDOS_COMERCIAL,
      );
      onToast("Erro ao atualizar status do pedido.", "error");
    }
  };

  // Filter lists based on roles
  const filteredPedidos = useMemo(() => {
    return pedidos
      .filter((p) => {
        // Rule: "cada FDV/comercial só vai poder ver no historico o que solicitou e seu proprio estoque, já o gerente comercial e o admim ve de todos"
        if (!isGerenteOrAdmin && p.solicitanteId !== profile.uid) return false;

        const matchesStatus =
          pedidoStatusFilter === "Todos" || p.status === pedidoStatusFilter;
        const term = pedidoSearch.toLowerCase();
        const matchesSearch =
          p.solicitanteNome.toLowerCase().includes(term) ||
          p.itens.some((it) => it.material.toLowerCase().includes(term));
        return matchesStatus && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || "").getTime() -
          new Date(a.createdAt || "").getTime(),
      );
  }, [
    pedidos,
    pedidoStatusFilter,
    pedidoSearch,
    isGerenteOrAdmin,
    profile.uid,
  ]);

  const filteredEstoque = useMemo(() => {
    return estoque
      .filter((e) => {
        // Rule: "cada FDV/comercial só vai poder ver no historico o que solicitou e seu proprio estoque"
        if (!isGerenteOrAdmin && e.ownerId !== profile.uid) return false;

        const term = stockSearch.toLowerCase();
        return (
          e.material.toLowerCase().includes(term) ||
          (e.descricao || "").toLowerCase().includes(term) ||
          (e.ownerName || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.material.localeCompare(b.material));
  }, [estoque, stockSearch, isGerenteOrAdmin, profile.uid]);

  const handleExportExcel = () => {
    let dataToExport: any[] = [];
    let fileName = `Controle_Comercial_${activeTab}_${new Date().toISOString().split("T")[0]}`;

    if (activeTab === "pedidos") {
      dataToExport = filteredPedidos.map((p) => ({
        Status: p.status,
        Solicitante: p.solicitanteNome,
        Motivo: p.motivoUso,
        Itens: p.itens.map((i) => `${i.quantidade}x ${i.material}`).join(", "),
        Data: new Date(p.createdAt || "").toLocaleDateString(),
      }));
    } else if (activeTab === "estoque") {
      dataToExport = filteredEstoque.map((e) => ({
        "Dono / Responsável": e.ownerName,
        Material: e.material,
        Quantidade: e.quantidade,
        Unidade: e.unidadeMedida || "UN",
        Mínimo: e.estoqueMinimo || 5,
        Descrição: e.descricao,
        "Última Atualização": e.updatedAt
          ? new Date(e.updatedAt).toLocaleDateString()
          : "",
      }));
    }

    if (dataToExport.length === 0) {
      onToast("Não há dados para exportar", "error");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab.toUpperCase());
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    onToast(`Exportação concluída com sucesso.`, "success");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab !== "estoque") {
      onToast("Importação de dados disponível apenas para o Estoque.", "error");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const getVal = (row: any, ...keys: string[]) => {
          const rowKeys = Object.keys(row);
          for (const key of keys) {
            const foundKey = rowKeys.find(k => k.toLowerCase() === key.toLowerCase());
            if (foundKey && row[foundKey] !== undefined) return row[foundKey];
          }
          return undefined;
        };

        let importsCount = 0;
        for (const row of rawData) {
          const rawMaterial = getVal(row, "Material", "material");
          if (!rawMaterial) continue;

          const materialName = String(rawMaterial).trim();

          const existing = estoque.find(
            (es) =>
              es.material.trim().toLowerCase() === materialName.toLowerCase() &&
              es.ownerId === profile.uid,
          );

          const qtyVal = getVal(row, "Quantidade", "quantidade");
          const minVal = getVal(row, "Mínimo", "minimo", "mínimo");
          const unVal = getVal(row, "Unidade", "unidade");
          const descVal = getVal(row, "Descrição", "descricao", "descrição");

          const qty = parseInt(qtyVal || "0", 10);
          const min = parseInt(minVal || "5", 10);
          const un = unVal || "UN";
          const desc = descVal || "";

          if (existing) {
            await updateDoc(
              doc(db, COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL, existing.id),
              {
                quantidade: isNaN(qty) ? existing.quantidade : qty,
                unidadeMedida: un,
                estoqueMinimo: isNaN(min) ? existing.estoqueMinimo : min,
                descricao: desc,
                updatedAt: new Date().toISOString(),
              },
            );
          } else {
            await addDoc(
              collection(db, COLLECTIONS.INSUMOS_ESTOQUE_COMERCIAL),
              {
                material: materialName,
                quantidade: isNaN(qty) ? 0 : qty,
                unidadeMedida: un,
                estoqueMinimo: isNaN(min) ? 5 : min,
                descricao: desc,
                ownerId: profile.uid,
                ownerName: profile.name,
                updatedAt: new Date().toISOString(),
              },
            );
          }
          importsCount++;
        }

        onToast(
          `${importsCount} itens importados/atualizados com sucesso.`,
          "success",
        );
      } catch (err) {
        console.error("Erro importando excel:", err);
        onToast(
          "Erro ao ler o arquivo. Certifique-se que o formato está correto.",
          "error",
        );
      }
      e.target.value = ""; // reset
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-200 text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full w-fit border border-white/5">
              <Boxes size={14} className="text-emerald-300" />
              <span>Gestão Comercial</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-2">
              Controle de Insumos
            </h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              Pedidos de materiais para campanhas comerciais e acompanhamento de
              estoque das equipes.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 shadow-sm">
            <span className="text-[10px] text-emerald-200 block font-bold uppercase tracking-wider">
              Acesso Logado
            </span>
            <span className="text-sm font-black block text-white">
              {profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-150 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all w-full sm:w-auto justify-center cursor-pointer",
            activeTab === "dashboard"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200",
          )}
        >
          <Gauge size={16} className="text-emerald-650 animate-pulse" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab("pedidos")}
          className={cn(
            "flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all w-full sm:w-auto justify-center cursor-pointer",
            activeTab === "pedidos"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200",
          )}
        >
          <ClipboardList size={16} />
          <span>Solicitações ({filteredPedidos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("estoque")}
          className={cn(
            "flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all w-full sm:w-auto justify-center cursor-pointer",
            activeTab === "estoque"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200",
          )}
        >
          <Layers size={16} />
          <span>Físico / Estoque ({filteredEstoque.length})</span>
        </button>
      </div>

      {/* Tab: DASHBOARD */}
      {activeTab === "dashboard" && (
        <InsumosDashboard
          pedidos={pedidos}
          baixas={baixas}
          title="Indicadores de Insumos - Comercial"
        />
      )}

      {/* Tab: PEDIDOS */}
      {activeTab === "pedidos" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {[
                  "Todos",
                  "Pendente",
                  "Aprovado",
                  "Em Andamento",
                  "Rejeitado",
                  "Entregue",
                ].map((status) => (
                  <button
                    key={status}
                    onClick={() => setPedidoStatusFilter(status)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      pedidoStatusFilter === status
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Buscar pedidos, solicitante..."
                  value={pedidoSearch}
                  onChange={(e) => setPedidoSearch(e.target.value)}
                  className="px-4 py-2 text-xs border border-slate-200 rounded-xl max-w-xs focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64 bg-slate-50/50"
                />

                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md w-full sm:w-auto cursor-pointer"
                >
                  <Download size={16} />
                  <span>Exportar</span>
                </button>

                <button
                  onClick={() => setIsAddingPedido(true)}
                  className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Novo Pedido</span>
                </button>
              </div>
            </div>

            {/* List */}
            {filteredPedidos.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <ClipboardList
                  size={40}
                  className="mx-auto mb-2.5 text-slate-350"
                />
                <p className="font-bold text-slate-750 text-sm">
                  Nenhum pedido de insumos cadastrado
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPedidos.map((pedido) => {
                  return (
                    <div
                      key={pedido.id}
                      className="border border-slate-150 hover:border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-sm font-bold text-slate-800 block">
                              Solicitante: {pedido.solicitanteNome}
                            </span>
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border",
                                pedido.status === "Pendente" &&
                                  "bg-amber-50 text-amber-700 border-amber-250",
                                pedido.status === "Aprovado" &&
                                  "bg-emerald-50 text-emerald-700 border-emerald-250",
                                pedido.status === "Em Andamento" &&
                                  "bg-indigo-50 text-indigo-700 border-indigo-250",
                                pedido.status === "Rejeitado" &&
                                  "bg-rose-50 text-rose-700 border-rose-250",
                                pedido.status === "Entregue" &&
                                  "bg-teal-50 text-teal-700 border-teal-250",
                              )}
                            >
                              {pedido.status === "Em Andamento"
                                ? "Em Compra / Andamento"
                                : pedido.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Motivo: {pedido.motivoUso}
                          </div>
                          {pedido.status === "Rejeitado" && (pedido as any).observacaoRejeicao && (
                            <div className="mt-2 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs w-full">
                              <span className="font-bold text-rose-800 uppercase text-[9px] block mb-1">
                                Motivo da Rejeição:
                              </span>
                              <p className="text-rose-700 italic font-medium">
                                "{(pedido as any).observacaoRejeicao}"
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="text-slate-400 text-[10px] font-medium font-mono self-start sm:self-center">
                          {new Date(pedido.createdAt).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="bg-slate-50/50 rounded-xl p-4 mb-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Materiais Requisitados
                        </p>
                        <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-150 p-2 space-y-1">
                          {pedido.itens.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center py-2 text-xs"
                            >
                              <span className="font-bold text-slate-750">
                                {it.material}
                              </span>
                              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md font-bold font-mono text-center">
                                Qtd: {it.quantidade}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer actions based on strict role restrictions */}
                      <div className="flex justify-between items-center flex-wrap gap-2 pt-3 border-t border-slate-100">
                        <div>
                          {(profile.uid === pedido.solicitanteId ||
                            isGerenteOrAdmin) && (
                            <button
                              onClick={() => handleDeletePedido(pedido.id)}
                              className="flex items-center space-x-1.5 text-rose-600 hover:text-rose-700 p-2 text-xs font-bold transition-all rounded-lg hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Excluir Solicitação</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Manager controls status completely */}
                          {isGerenteOrAdmin && (
                            <>
                              {pedido.status === "Pendente" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setRejectingPedido(pedido);
                                      setRejectionReason("");
                                    }}
                                    className="flex items-center space-x-1 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
                                  >
                                    <X size={14} />
                                    <span>Rejeitar</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(pedido, "Aprovado")
                                    }
                                    className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                                  >
                                    <Check size={14} />
                                    <span>Aprovar Pedido</span>
                                  </button>
                                </>
                              )}

                              {pedido.status === "Aprovado" && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(pedido, "Em Andamento")
                                    }
                                    className="flex items-center space-x-1 bg-indigo-100 hover:bg-indigo-150 text-indigo-700 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
                                  >
                                    <Clock size={14} />
                                    <span>Em Andamento</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(pedido, "Entregue")
                                    }
                                    className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                                  >
                                    <CheckCircle2 size={14} />
                                    <span>Concluir Entrega</span>
                                  </button>
                                </>
                              )}

                              {pedido.status === "Em Andamento" && (
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(pedido, "Entregue")
                                  }
                                  className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Marcar como Entregue</span>
                                </button>
                              )}

                              {pedido.status === "Rejeitado" && (
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(pedido, "Pendente")
                                  }
                                  className="flex items-center space-x-1 bg-slate-50 hover:bg-slate-100 text-slate-650 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all border border-slate-200 cursor-pointer"
                                >
                                  <RotateCcw size={14} />
                                  <span>Tornar Pendente</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: ESTOQUE */}
      {activeTab === "estoque" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2">
                <Boxes className="text-emerald-600" size={20} />
                <span>Estoque Comercial</span>
              </h3>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Buscar material no estoque..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64 bg-slate-50"
                />

                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md w-full sm:w-auto cursor-pointer"
                >
                  <Download size={16} />
                  <span>Exportar</span>
                </button>

                <label className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md w-full sm:w-auto cursor-pointer">
                  <Upload size={16} />
                  <span>Importar</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>

                {selectedStockIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteStock}
                    className="flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md w-full sm:w-auto cursor-pointer animate-bounce"
                  >
                    <Trash2 size={16} />
                    <span>Excluir Selecionados ({selectedStockIds.length})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditingEstoque(null);
                    setStockMaterial("");
                    setStockQuantidade(0);
                    setStockUnidade("UN");
                    setStockMinimo(5);
                    setStockDescricao("");
                    setIsAddingEstoque(true);
                  }}
                  className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md w-full sm:w-auto cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Notification settings panel */}
            <div className="mb-6 bg-amber-50/50 p-5 rounded-2xl border border-amber-200/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertTriangle size={64} className="text-amber-600" />
              </div>
              <div className="relative z-10">
                <h4 className="text-sm font-black text-slate-800 mb-1 flex items-center space-x-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <span>Notificações de Nível Crítico</span>
                </h4>
                <p className="text-xs text-slate-600 mb-4 max-w-2xl">
                  Sempre que o seu estoque atingir o nível mínimo definido, um
                  alerta interno será gerado no sistema. Insira um e-mail abaixo
                  se desejar enviar notificações também por e-mail.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="email"
                    placeholder="Ex: gestao@instituicao.com.br"
                    value={emailAlertas}
                    onChange={(e) => handleEmailAlertasChange(e.target.value)}
                    className="px-4 py-2.5 text-xs font-medium border border-slate-200 rounded-xl w-full sm:w-80 focus:ring-2 focus:ring-amber-500 outline-none bg-white shadow-sm"
                  />
                  <button
                    onClick={() =>
                      onToast(
                        "Preferências de notificação de estoque salvas.",
                        "success",
                      )
                    }
                    className="bg-amber-600 hover:bg-amber-700 transition-colors text-white font-bold px-5 py-2.5 rounded-xl text-xs whitespace-nowrap shadow-sm cursor-pointer w-full sm:w-auto"
                  >
                    Salvar E-mail
                  </button>
                </div>
              </div>
            </div>

            {/* Grid display */}
            {filteredEstoque.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Boxes size={40} className="mx-auto mb-2.5 text-slate-350" />
                <p className="font-bold text-sm text-slate-755">
                  Nenhum item adicionado
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-150">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150">
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredEstoque.length > 0 &&
                            filteredEstoque.every((item) =>
                              selectedStockIds.includes(item.id)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStockIds(
                                filteredEstoque.map((item) => item.id)
                              );
                            } else {
                              setSelectedStockIds([]);
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                      </th>
                      {isGerenteOrAdmin && (
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">
                          Responsável
                        </th>
                      )}
                      <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">
                        Item
                      </th>
                      <th className="p-4 text-[10px] font-bold text-slate-500 uppercase text-center">
                        Quantidade
                      </th>
                      <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">
                        Observações
                      </th>
                      <th className="p-4 text-[10px] font-bold text-slate-500 uppercase text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredEstoque.map((item) => {
                      const isLow = item.quantidade < (item.estoqueMinimo ?? 5);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedStockIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStockIds((prev) => [...prev, item.id]);
                                } else {
                                  setSelectedStockIds((prev) =>
                                    prev.filter((id) => id !== item.id)
                                  );
                                }
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          {isGerenteOrAdmin && (
                            <td className="p-4">
                              <span className="font-bold text-slate-700 text-xs">
                                {item.ownerName}
                              </span>
                            </td>
                          )}
                          <td className="p-4">
                            <span className="font-bold text-slate-800 text-sm block">
                              {item.material}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-xs font-black font-mono inline-block min-w-16",
                                isLow
                                  ? "bg-amber-150 text-amber-800 border border-amber-200"
                                  : "bg-emerald-150 text-emerald-800 border border-emerald-200",
                              )}
                            >
                              {item.quantidade} {item.unidadeMedida || "UN"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 text-xs max-w-xs truncate">
                            {item.descricao || "-"}
                          </td>
                          <td className="p-4 text-right">
                            {(item.ownerId === profile.uid ||
                              isGerenteOrAdmin) && (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedStockItem(item);
                                    setBaixaQuantidade(1);
                                    setBaixaMotivo("Uso em aula");
                                    setBaixaModalOpen(true);
                                  }}
                                  className="text-amber-700 hover:text-amber-850 font-bold text-xs uppercase px-2 py-1 bg-amber-50 rounded mr-1"
                                >
                                  Baixar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingEstoque(item);
                                    setStockMaterial(item.material);
                                    setStockQuantidade(item.quantidade);
                                    setStockUnidade(item.unidadeMedida || "UN");
                                    setStockMinimo(item.estoqueMinimo ?? 5);
                                    setStockDescricao(item.descricao || "");
                                    setIsAddingEstoque(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase px-2 py-1"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteEstoque(item.id)}
                                  className="text-rose-600 hover:text-rose-800 font-bold text-xs uppercase px-2 py-1"
                                >
                                  Excluir
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: MOTIVO DA REJEIÇÃO */}
      {rejectingPedido && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <AlertTriangle size={18} className="text-white animate-pulse" />
                <span>Rejeitar Solicitação</span>
              </h3>
              <button
                onClick={() => setRejectingPedido(null)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-all text-white/85 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Por favor, informe abaixo o motivo pelo qual esta solicitação de insumos está sendo rejeitada. Este motivo será gravado no pedido para consulta do solicitante.
              </p>
              
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Motivo da Rejeição *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Material indisponível em estoque ou quantidade solicitada acima do permitido."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-xs bg-white text-slate-800 font-medium min-h-[100px] resize-none"
                required
              />
              
              <div className="flex justify-end space-x-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setRejectingPedido(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim()}
                  onClick={async () => {
                    if (rejectingPedido && rejectionReason.trim()) {
                      await handleUpdateStatus(rejectingPedido, "Rejeitado", rejectionReason.trim());
                      setRejectingPedido(null);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center space-x-1"
                >
                  <X size={14} />
                  <span>Confirmar Rejeição</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Adding */}
      {isAddingPedido && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">
                  Nova Solicitação de Insumos
                </h3>
                <p className="text-emerald-100 text-xs mt-1">
                  Preencha os dados da requisição conforme o perfil.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddingPedido(false);
                  setTipoSolicitante(null);
                  setProfessorName("");
                  setCourseName("");
                  setSubjectName("");
                  setMatricula("");
                  setPedidoItens([{ material: "", quantidade: 1 }]);
                }}
                className="text-white hover:bg-emerald-500 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {tipoSolicitante === null ? (
              <div className="p-8 space-y-6">
                <h3 className="text-center font-bold text-slate-700 text-base mb-2">
                  Qual é o perfil do solicitante?
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DOCENTE CARD */}
                  <button
                    type="button"
                    onClick={() => setTipoSolicitante("docente")}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-emerald-55 hover:border-emerald-300 hover:shadow-lg transition-all text-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Users size={24} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">
                      Docente / Professor
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Materiais de apoio para disciplinas acadêmicas, aulas
                      práticas ou laboratórios.
                    </p>
                  </button>

                  {/* ADMINISTRATIVO CARD */}
                  <button
                    type="button"
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
                      Corporativo, escritórios ou backoffice.{" "}
                      <span className="font-bold text-amber-700">
                        (Máximo de 10 unidades por item)
                      </span>
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitPedido}
                className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
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
                    <span>
                      Mudar Perfil (
                      {tipoSolicitante === "docente"
                        ? "Docente"
                        : "Administrativo"}
                      )
                    </span>
                  </button>
                </div>

                {tipoSolicitante === "docente" ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Nome do Professor *
                        </label>
                        <div className="relative">
                          <User
                            className="absolute left-3 top-3 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Dr. Paulo Silva"
                            value={professorName}
                            onChange={(e) => setProfessorName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Nome do Curso *
                        </label>
                        <div className="relative">
                          <Book
                            className="absolute left-3 top-3 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Administração"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Nome da Disciplina *
                        </label>
                        <div className="relative">
                          <Book
                            className="absolute left-3 top-3 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Logística Geral"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Motivo do Uso / Justificativa *
                        </label>
                        <div className="relative">
                          <FileText
                            className="absolute left-3 top-3 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Aula prática de estoque e armazenagem"
                            value={motivoUso}
                            onChange={(e) => setMotivoUso(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Nome do Funcionário *
                        </label>
                        <div className="relative">
                          <User
                            className="absolute left-3 top-3 text-slate-400"
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
                              setMatricula("");
                              setShowAutocomplete(true);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                        </div>

                        {/* Autocomplete list */}
                        {showAutocomplete &&
                          professorName.trim().length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[150px] overflow-y-auto divide-y divide-slate-50">
                              {funcionarios
                                .filter(
                                  (f) =>
                                    f.tipo === "administrativo" &&
                                    (f.nome || "")
                                      .toLowerCase()
                                      .includes(professorName.toLowerCase()),
                                )
                                .map((f) => (
                                  <button
                                    type="button"
                                    key={f.id}
                                    onClick={() => {
                                      setProfessorName(f.nome);
                                      setMatricula(f.matricula);
                                      setShowAutocomplete(false);
                                    }}
                                    className="w-full p-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 font-bold transition-all flex justify-between items-center"
                                  >
                                    <span>{f.nome}</span>
                                    <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Matrícula: {f.matricula}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Matrícula (Automática) *
                        </label>
                        <div className="relative">
                          <FileText
                            className="absolute left-3 top-3 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            readOnly
                            placeholder="Selecione seu nome acima"
                            value={matricula}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 outline-none text-sm font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Setor *
                        </label>
                        <div className="relative">
                          <Building2
                            className="absolute left-3.5 top-3.5 text-slate-400"
                            size={14}
                          />
                          <select
                            required
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
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
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Motivo / Justificativa *
                        </label>
                        <div className="relative">
                          <FileText
                            className="absolute left-3 top-3 text-slate-400"
                            size={16}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Utilização no setor de atendimento"
                            value={motivoUso}
                            onChange={(e) => setMotivoUso(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center space-x-1.5">
                      <Boxes size={14} className="text-emerald-600" />
                      <span>Materiais a Requisitar</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddRequestItem}
                      className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:bg-emerald-50 px-2 py-1 rounded-lg cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Adicionar Linha</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pedidoItens.map((it, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-100"
                      >
                        <div className="flex-1 relative flex items-center">
                          <input
                            type="text"
                            placeholder="Nome do material/item (Ex: Caneta azul)"
                            value={it.material}
                            onChange={(e) =>
                              handleRequestItemChange(
                                index,
                                "material",
                                e.target.value,
                              )
                            }
                            onFocus={() => setFocusedItemIndex(index)}
                            onBlur={() => setTimeout(() => setFocusedItemIndex(null), 250)}
                            className="w-full pl-3 pr-10 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white text-slate-750 font-bold"
                            required
                          />
                          {it.material.trim().length >= 3 && (
                            <button
                              type="button"
                              onClick={() => handleAIMatch(index)}
                              disabled={isMatchingAI === index}
                              title="Ajustar escrita com IA (Goorq AI)"
                              className="absolute right-2 text-emerald-500 hover:text-emerald-700 disabled:text-slate-300 cursor-pointer p-1 transition-all z-10"
                            >
                              {isMatchingAI === index ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Sparkles size={14} className="animate-pulse" />
                              )}
                            </button>
                          )}
                          {focusedItemIndex === index && it.material.trim() !== "" && (
                            (() => {
                              const filtered = (estoque || []).filter((stockItem) =>
                                stockItem.material &&
                                stockItem.material.toLowerCase().includes(it.material.toLowerCase()) &&
                                stockItem.quantidade > 0
                              );
                              return (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                                  {filtered.map((stockItem) => (
                                    <button
                                      key={stockItem.id}
                                      type="button"
                                      onMouseDown={() => {
                                        handleRequestItemChange(index, "material", stockItem.material);
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
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleAIMatch(index);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs bg-slate-50 hover:bg-emerald-50 text-emerald-600 font-semibold flex items-center space-x-1.5 cursor-pointer border-t border-slate-100"
                                  >
                                    {isMatchingAI === index ? (
                                      <Loader2 className="animate-spin text-emerald-500" size={13} />
                                    ) : (
                                      <Sparkles size={13} className="text-emerald-500" />
                                    )}
                                    <span>
                                      {isMatchingAI === index ? "Buscando com Goorq AI..." : "Buscar equivalente com Goorq AI..."}
                                    </span>
                                  </button>
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
                              handleRequestItemChange(
                                index,
                                "quantidade",
                                e.target.value,
                              )
                            }
                            className="w-full pl-3 pr-8 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-center font-mono bg-white font-bold"
                            required
                          />
                          {tipoSolicitante === "administrativo" && (
                            <span className="absolute right-1 top-2 text-[9px] font-bold text-amber-600 select-none bg-amber-50 px-1 border border-amber-100 rounded">
                              Max 10
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequestItem(index)}
                          disabled={pedidoItens.length === 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPedido(false);
                      setTipoSolicitante(null);
                      setProfessorName("");
                      setCourseName("");
                      setSubjectName("");
                      setMatricula("");
                      setPedidoItens([{ material: "", quantidade: 1 }]);
                    }}
                    className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-2 bg-emerald-650 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                  >
                    <Send size={16} />
                    <span>Enviar Solicitação</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isAddingEstoque && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden scale-in">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">
                  {editingEstoque
                    ? "Editar Item de Estoque"
                    : "Adicionar ao Estoque"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddingEstoque(false);
                  setEditingEstoque(null);
                }}
                className="text-white hover:bg-blue-500 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitEstoque} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nome do Material *
                </label>
                <input
                  type="text"
                  required
                  value={stockMaterial}
                  onChange={(e) => setStockMaterial(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: Caneta Azul, Resma de Papel..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quantidade Física *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantidade}
                    onChange={(e) =>
                      setStockQuantidade(parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Nível de Alerta (Mínimo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockMinimo}
                    onChange={(e) =>
                      setStockMinimo(parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Observações
                </label>
                <input
                  type="text"
                  value={stockDescricao}
                  onChange={(e) => setStockDescricao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Marca, localização, detalhes..."
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingEstoque(false);
                    setEditingEstoque(null);
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <Check size={18} />
                  <span>
                    {editingEstoque ? "Salvar Alterações" : "Salvar no Estoque"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Baixa de Material */}
      {baixaModalOpen && selectedStockItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800">
                  Registrar Baixa
                </h4>
                <p className="text-xs text-slate-500">
                  Deduzir quantidade do estoque comercial
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmBaixa} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Material
                </span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {selectedStockItem.material}
                </span>
                <span className="text-xs font-mono font-bold text-slate-500 mt-1 block">
                  Disponível em Estoque:{" "}
                  <span className="text-emerald-600">
                    {selectedStockItem.quantidade}{" "}
                    {selectedStockItem.unidadeMedida || "UN"}
                  </span>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quantidade a Baixar
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={selectedStockItem.quantidade}
                    required
                    value={baixaQuantidade}
                    onChange={(e) =>
                      setBaixaQuantidade(
                        Math.min(
                          selectedStockItem.quantidade,
                          Math.max(1, parseInt(e.target.value) || 1),
                        ),
                      )
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono font-bold text-center"
                  />
                  <span className="absolute right-4 top-2 text-xs font-bold text-slate-400 font-mono">
                    {selectedStockItem.unidadeMedida || "UN"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Motivo da Baixa
                </label>
                <div className="space-y-2">
                  {[
                    { id: "Uso em aula", label: "Uso em aula" },
                    { id: "Uso no setor", label: "Uso no setor" },
                    {
                      id: "Material vencido(lixo)",
                      label: "Material vencido / Descartado (lixo)",
                    },
                  ].map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-xs font-black",
                        baixaMotivo === option.id
                          ? "bg-amber-50/50 border-amber-200 text-amber-800"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600",
                      )}
                    >
                      <input
                        type="radio"
                        name="motivoBaixa"
                        checked={baixaMotivo === option.id}
                        onChange={() => setBaixaMotivo(option.id as any)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setBaixaModalOpen(false);
                    setSelectedStockItem(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black px-6 py-2.5 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
