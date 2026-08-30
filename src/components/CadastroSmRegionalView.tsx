import React, { useState, useEffect } from "react";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FuncionarioSM, UnidadeRegional, FuncaoSM } from "../types";
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Search,
  UserCheck,
  Building2,
  Calendar,
  Phone,
  Mail,
  Shield,
  Clock,
  Sparkles,
  Tag,
  Compass,
  Layers,
  Network,
  X,
  Eye,
  Shirt,
  Store,
  CreditCard,
  Briefcase,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  funcionarios: FuncionarioSM[];
  unidades: UnidadeRegional[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export const FUNCOES_SM: FuncaoSM[] = [
  "Gestor",
  "Lider",
  "02",
  "Atendente sm",
  "Estagiario",
  "Jovem aprendiz",
];

export const STATUS_SM_OPTIONS = ["Ativo", "Licença", "Inativo"] as const;

export const TAMANHOS_BLUSA = ["PP", "P", "M", "G", "GG", "XGG", "G1", "G2", "G3", "Sob Medida"];

export function CadastroSmRegionalView({ funcionarios, unidades, onToast }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState("TODAS");
  const [funcaoFilter, setFuncaoFilter] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFunc, setSelectedFunc] = useState<FuncionarioSM | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState<FuncaoSM>("Lider");
  const [unidade, setUnidade] = useState("");
  const [marca, setMarca] = useState("");
  const [regional, setRegional] = useState("");
  const [nucleo, setNucleo] = useState("");
  const [cluster, setCluster] = useState("");
  const [status, setStatus] = useState<"Ativo" | "Licença" | "Inativo">("Ativo");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [admissaoSm, setAdmissaoSm] = useState("");
  const [admissaoRh, setAdmissaoRh] = useState("");
  const [desligamento, setDesligamento] = useState("");
  const [tamanhoBlusa, setTamanhoBlusa] = useState("M");
  const [pdvSalesforce, setPdvSalesforce] = useState("");
  const [telefonePrincipal, setTelefonePrincipal] = useState("");
  const [telefoneAtendimento, setTelefoneAtendimento] = useState("");
  const [dataAlteracao, setDataAlteracao] = useState("");
  const [loading, setLoading] = useState(false);

  // When unidade changes in the form, automatically populate Marca, Regional, Nucleo, Cluster
  const handleUnidadeChange = (selectedUnitName: string) => {
    setUnidade(selectedUnitName);
    const matchedUnit = unidades.find((u) => u.nome === selectedUnitName);
    if (matchedUnit) {
      setMarca(matchedUnit.marca || "");
      setRegional(matchedUnit.regional || "");
      setNucleo(matchedUnit.nucleo || "");
      setCluster(matchedUnit.cluster || "");
    }
  };

  const handleOpenModal = (func?: FuncionarioSM) => {
    if (func) {
      setEditingId(func.id);
      setNome(func.nome || "");
      const matchedFuncao = (func.funcao || func.cargo || "Lider") as FuncaoSM;
      setFuncao(matchedFuncao);
      const unitName = func.unidade || (unidades[0]?.nome || "");
      setUnidade(unitName);

      // Auto-fill from unit or keep existing func data
      const matchedUnit = unidades.find((u) => u.nome === unitName);
      setMarca(func.marca || matchedUnit?.marca || "");
      setRegional(func.regional || matchedUnit?.regional || "");
      setNucleo(func.nucleo || matchedUnit?.nucleo || "");
      setCluster(func.cluster || matchedUnit?.cluster || "");

      setStatus((func.status as any) || "Ativo");
      setCpf(func.cpf || "");
      setEmail(func.email || "");
      setMatricula(func.matricula || "");
      setDataNascimento(func.dataNascimento || "");
      setAdmissaoSm(func.admissaoSm || "");
      setAdmissaoRh(func.admissaoRh || "");
      setDesligamento(func.desligamento || "");
      setTamanhoBlusa(func.tamanhoBlusa || "M");
      setPdvSalesforce(func.pdvSalesforce || "");
      setTelefonePrincipal(func.telefonePrincipal || func.telefone || "");
      setTelefoneAtendimento(func.telefoneAtendimento || "");
      setDataAlteracao(func.dataAlteracao || "");
    } else {
      setEditingId(null);
      setNome("");
      setFuncao("Lider");
      const defaultUnit = unidades[0]?.nome || "";
      setUnidade(defaultUnit);
      const matchedUnit = unidades.find((u) => u.nome === defaultUnit);
      setMarca(matchedUnit?.marca || "Estácio");
      setRegional(matchedUnit?.regional || "Regional RJ");
      setNucleo(matchedUnit?.nucleo || "");
      setCluster(matchedUnit?.cluster || "");

      setStatus("Ativo");
      setCpf("");
      setEmail("");
      setMatricula("");
      setDataNascimento("");
      setAdmissaoSm("");
      setAdmissaoRh("");
      setDesligamento("");
      setTamanhoBlusa("M");
      setPdvSalesforce("");
      setTelefonePrincipal("");
      setTelefoneAtendimento("");
      setDataAlteracao("");
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (func: FuncionarioSM) => {
    setSelectedFunc(func);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast("Nome do colaborador é obrigatório", "error");
      return;
    }
    if (!unidade) {
      onToast("Por favor, selecione uma unidade cadastrada", "error");
      return;
    }

    // Check for duplicate collaborator by CPF, Matricula, or Name in the same unit
    const cleanCpf = cpf.replace(/\D/g, "");
    const isDuplicate = funcionarios.some((f) => {
      if (editingId && f.id === editingId) return false;
      if (cleanCpf && f.cpf && f.cpf.replace(/\D/g, "") === cleanCpf) return true;
      if (matricula.trim() && f.matricula && f.matricula.trim().toLowerCase() === matricula.trim().toLowerCase()) return true;
      if (
        f.nome.trim().toLowerCase() === nome.trim().toLowerCase() &&
        f.unidade.trim().toLowerCase() === unidade.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (isDuplicate) {
      onToast("Já existe um colaborador cadastrado com este CPF/Matrícula ou Nome nesta unidade!", "error");
      return;
    }

    setLoading(true);
    const nowFormatted = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    try {
      const payload: any = {
        nome: nome.trim(),
        funcao,
        cargo: funcao, // retrocompatibilidade
        unidade: unidade.trim(),
        marca: marca.trim(),
        regional: regional.trim(),
        nucleo: nucleo.trim(),
        cluster: cluster.trim(),
        status,
        cpf: cpf.trim(),
        email: email.trim(),
        matricula: matricula.trim(),
        dataNascimento: dataNascimento.trim(),
        admissaoSm: admissaoSm.trim(),
        admissaoRh: admissaoRh.trim(),
        desligamento: desligamento.trim(),
        tamanhoBlusa: tamanhoBlusa.trim(),
        pdvSalesforce: pdvSalesforce.trim(),
        telefone: telefonePrincipal.trim(), // compatibilidade
        telefonePrincipal: telefonePrincipal.trim(),
        telefoneAtendimento: telefoneAtendimento.trim(),
        dataAlteracao: nowFormatted, // Registra a data de realização da edição
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, COLLECTIONS.FUNCIONARIOS_SM, editingId), payload);
        onToast("Colaborador SM atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.FUNCIONARIOS_SM), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        onToast("Colaborador SM cadastrado com sucesso!");
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      console.error("Erro ao salvar colaborador SM:", err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro de "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.FUNCIONARIOS_SM, id));
      onToast("Colaborador excluído com sucesso.");
    } catch (err: any) {
      console.error("Erro ao excluir colaborador SM:", err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleExportExcel = () => {
    const dataToExport = funcionarios.map((f) => ({
      Nome: f.nome,
      Função: f.funcao || f.cargo || "",
      Unidade: f.unidade || "",
      Marca: f.marca || "",
      Regional: f.regional || "",
      Núcleo: f.nucleo || "",
      CLUSTER: f.cluster || "",
      Status: f.status || "Ativo",
      CPF: f.cpf || "",
      "E-MAIL": f.email || "",
      MATRÍCULA: f.matricula || "",
      "DT NASC": f.dataNascimento || "",
      "ADMISSÃO SM": f.admissaoSm || "",
      "ADMISSÃO RH": f.admissaoRh || "",
      DESLIGAMENTO: f.desligamento || "",
      "Tamanho Blusa": f.tamanhoBlusa || "",
      "PDV SalesForce": f.pdvSalesforce || "",
      "Telefone Principal": f.telefonePrincipal || f.telefone || "",
      "Telefone Atendimento": f.telefoneAtendimento || "",
      "Última Alteração": f.dataAlteracao || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cadastro SM Regional");
    XLSX.writeFile(wb, "cadastro_sm_regional.xlsx");
    onToast("Cadastro SM exportado com sucesso!");
  };

  const formatExcelValue = (val: any): string => {
    if (val === undefined || val === null) return "";
    if (typeof val === "number") {
      // Check if it looks like an Excel serial date (between year 1970 and 2050: roughly 25569 to 55000)
      if (val > 25569 && val < 60000) {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          const day = String(date.getUTCDate()).padStart(2, "0");
          const month = String(date.getUTCMonth() + 1).padStart(2, "0");
          const year = date.getUTCFullYear();
          return `${day}/${month}/${year}`;
        }
      }
    }
    return String(val).trim();
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          onToast("Arquivo Excel vazio ou inválido.", "error");
          return;
        }

        let addedCount = 0;
        let updatedCount = 0;

        for (const row of rawData) {
          const fNome = row.Nome || row.nome || row.NOME || row.Colaborador || row.colaborador || row.Funcionario;
          if (fNome) {
            const rawFuncao = String(
              row.Função || row.funcao || row.FUNÇÃO || row.Cargo || row.cargo || row.CARGO || row["Função SM"] || "Lider"
            ).trim();
            const unitName = String(
              row.Unidade || row.unidade || row.UNIDADE || row.Campus || row.campus || row["Unidade Regional"] || unidades[0]?.nome || ""
            ).trim();
            const matchedUnit = unidades.find((u) => u.nome.toLowerCase() === unitName.toLowerCase());

            const fCpf = formatExcelValue(row.CPF || row.cpf || row.Cpf);
            const fMatricula = formatExcelValue(row.MATRÍCULA || row.Matrícula || row.Matricula || row.matricula || row.MATRICULA);
            const fEmail = formatExcelValue(row["E-MAIL"] || row["E-mail"] || row.Email || row.email || row.EMAIL);
            const fTelPrincipal = formatExcelValue(row["Telefone Principal"] || row.Telefone || row.telefone || row.TELEFONE || row.Celular || row.Contato);
            const fTelAtendimento = formatExcelValue(row["Telefone Atendimento"] || row.telefoneAtendimento || row["Telefone Comercial"]);
            const fPdv = formatExcelValue(row["PDV SalesForce"] || row["PDV Salesforce"] || row.pdvSalesforce || row.PDV || row.Salesforce);
            const fBlusa = formatExcelValue(row["Tamanho Blusa"] || row.tamanhoBlusa || row.Uniforme || row.Blusa);
            const fStatus = formatExcelValue(row.Status || row.status || row.STATUS || row.Situação || row.Situacao || "Ativo");
            const fDtNasc = formatExcelValue(row["DT NASC"] || row["Dt Nasc"] || row["Data Nascimento"] || row.dataNascimento || row.nascimento);
            const fAdmissaoSm = formatExcelValue(row["ADMISSÃO SM"] || row["Admissão SM"] || row["Admissao SM"] || row.admissaoSm);
            const fAdmissaoRh = formatExcelValue(row["ADMISSÃO RH"] || row["Admissão RH"] || row["Admissao RH"] || row.admissaoRh);
            const fDesligamento = formatExcelValue(row.DESLIGAMENTO || row.Desligamento || row.desligamento);

            const payload: any = {
              nome: String(fNome).trim(),
              funcao: rawFuncao,
              cargo: rawFuncao,
              unidade: unitName,
              marca: String(row.Marca || row.marca || row.MARCA || matchedUnit?.marca || "Estácio").trim(),
              regional: String(row.Regional || row.regional || row.REGIONAL || matchedUnit?.regional || "Regional RJ").trim(),
              nucleo: String(row.Núcleo || row.núcleo || row.nucleo || row.NUCLEO || row.Nucleo || matchedUnit?.nucleo || "").trim(),
              cluster: String(row.CLUSTER || row.cluster || row.Cluster || matchedUnit?.cluster || "").trim(),
              status: fStatus || "Ativo",
              cpf: fCpf,
              email: fEmail,
              matricula: fMatricula,
              dataNascimento: fDtNasc,
              admissaoSm: fAdmissaoSm,
              admissaoRh: fAdmissaoRh,
              desligamento: fDesligamento,
              tamanhoBlusa: fBlusa,
              pdvSalesforce: fPdv,
              telefone: fTelPrincipal,
              telefonePrincipal: fTelPrincipal,
              telefoneAtendimento: fTelAtendimento,
              dataAlteracao: new Date().toLocaleDateString("pt-BR"),
              updatedAt: serverTimestamp(),
            };

            // Check if collaborator already exists to update instead of duplicate
            const existing = funcionarios.find((f) => {
              if (fCpf && f.cpf && f.cpf.replace(/\D/g, "") === fCpf.replace(/\D/g, "")) return true;
              if (fMatricula && f.matricula && f.matricula.trim() === fMatricula.trim()) return true;
              if (
                f.nome.trim().toLowerCase() === String(fNome).trim().toLowerCase() &&
                f.unidade.trim().toLowerCase() === unitName.toLowerCase()
              ) {
                return true;
              }
              return false;
            });

            if (existing) {
              await updateDoc(doc(db, COLLECTIONS.FUNCIONARIOS_SM, existing.id), payload);
              updatedCount++;
            } else {
              await addDoc(collection(db, COLLECTIONS.FUNCIONARIOS_SM), {
                ...payload,
                createdAt: serverTimestamp(),
              });
              addedCount++;
            }
          }
        }

        const msg = addedCount > 0 && updatedCount > 0
          ? `${addedCount} novos colaboradores importados e ${updatedCount} atualizados!`
          : addedCount > 0
          ? `${addedCount} colaboradores importados com sucesso!`
          : `${updatedCount} colaboradores atualizados com sucesso!`;

        onToast(msg);
      } catch (err: any) {
        console.error("Erro ao importar excel SM:", err);
        onToast(`Erro ao importar arquivo: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const filtered = funcionarios.filter((f) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (f.nome || "").toLowerCase().includes(term) ||
      (f.cpf && f.cpf.includes(term)) ||
      (f.matricula && f.matricula.includes(term)) ||
      (f.email && f.email.toLowerCase().includes(term)) ||
      (f.pdvSalesforce && f.pdvSalesforce.toLowerCase().includes(term)) ||
      (f.telefonePrincipal && f.telefonePrincipal.includes(term));
    const matchesUnidade = unidadeFilter === "TODAS" || f.unidade === unidadeFilter;
    const matchesFuncao =
      funcaoFilter === "TODAS" ||
      (f.funcao && f.funcao.toLowerCase() === funcaoFilter.toLowerCase()) ||
      (f.cargo && f.cargo.toLowerCase() === funcaoFilter.toLowerCase());
    const matchesStatus = statusFilter === "TODOS" || (f.status || "Ativo") === statusFilter;
    return matchesSearch && matchesUnidade && matchesFuncao && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="text-blue-600" size={24} />
            Cadastro SM Regional (Salas de Matrícula)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestão completa da equipe SM com auto-preenchimento de Marca, Regional, Núcleo, Cluster, dados funcionais e registro de alterações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors">
            <Upload size={14} />
            Importar Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportExcel}
            disabled={funcionarios.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            Exportar Excel
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            Novo Colaborador SM
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, matrícula, e-mail, PDV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={unidadeFilter}
            onChange={(e) => setUnidadeFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas as Unidades</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.nome}>
                {u.nome}
              </option>
            ))}
          </select>

          <select
            value={funcaoFilter}
            onChange={(e) => setFuncaoFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas as Funções</option>
            {FUNCOES_SM.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            {STATUS_SM_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-end lg:self-auto">
          Total: {filtered.length} colaborador(es)
        </span>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Colaborador</th>
                <th className="p-4">Função</th>
                <th className="p-4">Unidade / Regional</th>
                <th className="p-4">Núcleo / Cluster</th>
                <th className="p-4">Matrícula / CPF</th>
                <th className="p-4">Contato / PDV</th>
                <th className="p-4">Status</th>
                <th className="p-4">Última Edição</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-sm">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const displayFuncao = f.funcao || f.cargo || "Lider";
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase border border-blue-100">
                            {f.nome ? f.nome.charAt(0) : "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{f.nome}</div>
                            {f.email && <div className="text-xs text-slate-400">{f.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            displayFuncao === "Gestor"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : displayFuncao === "Lider" || displayFuncao === "Líder"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : displayFuncao === "02"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : displayFuncao === "Atendente sm" || displayFuncao === "Administrativo"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : displayFuncao === "Estagiario" || displayFuncao === "Estagiário"
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-teal-100 text-teal-800 border border-teal-200"
                          }`}
                        >
                          {displayFuncao}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{f.unidade}</span>
                          <span className="text-xs text-slate-400">
                            {f.marca || "Estácio"} • {f.regional || "Regional RJ"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        <div className="flex flex-col">
                          <span>Núcleo: <strong className="text-slate-800">{f.nucleo || "-"}</strong></span>
                          <span>Cluster: <strong className="text-slate-700">{f.cluster || "-"}</strong></span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        <div>Matrícula: <strong className="text-slate-800">{f.matricula || "-"}</strong></div>
                        <div>CPF: {f.cpf || "-"}</div>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {f.telefonePrincipal || f.telefone ? (
                          <div className="font-semibold text-slate-700">{f.telefonePrincipal || f.telefone}</div>
                        ) : null}
                        {f.pdvSalesforce ? (
                          <div className="text-[11px] text-blue-600 font-bold">PDV: {f.pdvSalesforce}</div>
                        ) : null}
                        {!f.telefonePrincipal && !f.telefone && !f.pdvSalesforce && "-"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            f.status === "Licença"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : f.status === "Inativo"
                              ? "bg-slate-100 text-slate-500 border border-slate-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {f.status || "Ativo"}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {f.dataAlteracao ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                            <Clock size={12} className="text-slate-400" />
                            {f.dataAlteracao}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenDetail(f)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Ver Ficha Completa"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(f)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id, f.nome)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="text-blue-600" size={22} />
                  {editingId ? "Editar Colaborador SM" : "Cadastrar Novo Colaborador SM"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preencha os dados do funcionário. Marca, Regional, Núcleo e Cluster são sincronizados automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Nome */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do colaborador"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Row 2: Função, Unidade, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Briefcase size={13} className="text-slate-400" />
                    Função *
                  </label>
                  <select
                    value={funcao}
                    onChange={(e) => setFuncao(e.target.value as FuncaoSM)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  >
                    {FUNCOES_SM.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Building2 size={13} className="text-slate-400" />
                    Unidade *
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => handleUnidadeChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  >
                    {unidades.length === 0 ? (
                      <option value="">Nenhuma unidade cadastrada</option>
                    ) : (
                      unidades.map((u) => (
                        <option key={u.id} value={u.nome}>
                          {u.nome}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Shield size={13} className="text-slate-400" />
                    Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Licença">Licença</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Auto-filled Unit Info Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-500" />
                    Dados da Unidade Selecionada (Preenchimento Automático)
                  </span>
                  <span className="text-[11px] text-blue-600">{unidade || "Nenhuma"}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Marca</span>
                    <span className="text-xs font-bold text-slate-800">{marca || "-"}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Regional</span>
                    <span className="text-xs font-bold text-slate-800">{regional || "-"}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Núcleo</span>
                    <span className="text-xs font-bold text-slate-800">{nucleo || "-"}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">CLUSTER</span>
                    <span className="text-xs font-bold text-slate-800">{cluster || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Row 3: CPF, E-mail, Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <CreditCard size={13} className="text-slate-400" />
                    CPF
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Mail size={13} className="text-slate-400" />
                    E-MAIL
                  </label>
                  <input
                    type="email"
                    placeholder="nome.sobrenome@estacio.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    MATRÍCULA
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 202401928"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Row 4: Datas (DT NASC, ADMISSÃO SM, ADMISSÃO RH, DESLIGAMENTO) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400" />
                    DT NASC
                  </label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400" />
                    ADMISSÃO SM
                  </label>
                  <input
                    type="date"
                    value={admissaoSm}
                    onChange={(e) => setAdmissaoSm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400" />
                    ADMISSÃO RH
                  </label>
                  <input
                    type="date"
                    value={admissaoRh}
                    onChange={(e) => setAdmissaoRh(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400" />
                    DESLIGAMENTO <span className="text-[10px] text-slate-400 lowercase">(opc)</span>
                  </label>
                  <input
                    type="date"
                    value={desligamento}
                    onChange={(e) => setDesligamento(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Row 5: Tamanho Blusa, PDV Salesforce */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Shirt size={13} className="text-slate-400" />
                    Tamanho Blusa
                  </label>
                  <select
                    value={tamanhoBlusa}
                    onChange={(e) => setTamanhoBlusa(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    {TAMANHOS_BLUSA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Store size={13} className="text-slate-400" />
                    PDV SalesForce
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PDV_ESTACIO_TAQUARA_01"
                    value={pdvSalesforce}
                    onChange={(e) => setPdvSalesforce(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Row 6: Telefones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    Telefone Principal *
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefonePrincipal}
                    onChange={(e) => setTelefonePrincipal(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    Telefone de Atendimento <span className="text-[10px] text-slate-400 lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefoneAtendimento}
                    onChange={(e) => setTelefoneAtendimento(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {editingId && dataAlteracao && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                  <Clock size={14} className="text-slate-400" />
                  <span>Última alteração registrada: <strong className="text-slate-700">{dataAlteracao}</strong></span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Colaborador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal (Ficha Completa) */}
      {isDetailOpen && selectedFunc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedFunc.nome ? selectedFunc.nome.charAt(0) : "U"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedFunc.nome}</h3>
                  <p className="text-xs font-semibold text-blue-600">{selectedFunc.funcao || selectedFunc.cargo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Unidade</span>
                <span className="text-xs font-bold text-slate-800">{selectedFunc.unidade || "-"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Marca</span>
                <span className="text-xs font-bold text-slate-800">{selectedFunc.marca || "-"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Regional</span>
                <span className="text-xs font-bold text-slate-800">{selectedFunc.regional || "-"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Núcleo</span>
                <span className="text-xs font-bold text-slate-800">{selectedFunc.nucleo || "-"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">CLUSTER</span>
                <span className="text-xs font-bold text-slate-800">{selectedFunc.cluster || "-"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Status</span>
                <span className="text-xs font-bold text-slate-800">{selectedFunc.status || "Ativo"}</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400">CPF:</span> <strong className="text-slate-800">{selectedFunc.cpf || "-"}</strong></div>
                <div><span className="text-slate-400">Matrícula:</span> <strong className="text-slate-800">{selectedFunc.matricula || "-"}</strong></div>
                <div><span className="text-slate-400">E-mail:</span> <strong className="text-slate-800">{selectedFunc.email || "-"}</strong></div>
                <div><span className="text-slate-400">PDV Salesforce:</span> <strong className="text-slate-800">{selectedFunc.pdvSalesforce || "-"}</strong></div>
                <div><span className="text-slate-400">Tel. Principal:</span> <strong className="text-slate-800">{selectedFunc.telefonePrincipal || selectedFunc.telefone || "-"}</strong></div>
                <div><span className="text-slate-400">Tel. Atendimento:</span> <strong className="text-slate-800">{selectedFunc.telefoneAtendimento || "-"}</strong></div>
                <div><span className="text-slate-400">Tamanho Blusa:</span> <strong className="text-slate-800">{selectedFunc.tamanhoBlusa || "-"}</strong></div>
                <div><span className="text-slate-400">DT Nascimento:</span> <strong className="text-slate-800">{selectedFunc.dataNascimento || "-"}</strong></div>
                <div><span className="text-slate-400">Admissão SM:</span> <strong className="text-slate-800">{selectedFunc.admissaoSm || "-"}</strong></div>
                <div><span className="text-slate-400">Admissão RH:</span> <strong className="text-slate-800">{selectedFunc.admissaoRh || "-"}</strong></div>
                <div><span className="text-slate-400">Desligamento:</span> <strong className="text-slate-800">{selectedFunc.desligamento || "-"}</strong></div>
                <div><span className="text-slate-400">Última Edição:</span> <strong className="text-slate-800">{selectedFunc.dataAlteracao || "-"}</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenModal(selectedFunc);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 size={14} />
                Editar Cadastro
              </button>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
