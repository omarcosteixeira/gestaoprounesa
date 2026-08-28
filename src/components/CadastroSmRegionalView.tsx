import React, { useState } from "react";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FuncionarioSM, UnidadeRegional } from "../types";
import { Plus, Trash2, Edit2, Download, Upload, Search, Users, UserCheck } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  funcionarios: FuncionarioSM[];
  unidades: UnidadeRegional[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

const CARGOS = ["Líder", "02", "Administrativo", "Estagiário", "Jovem Aprendiz"] as const;

export function CadastroSmRegionalView({ funcionarios, unidades, onToast }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState("TODAS");
  const [cargoFilter, setCargoFilter] = useState("TODOS");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState<typeof CARGOS[number]>("Líder");
  const [unidade, setUnidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (func?: FuncionarioSM) => {
    if (func) {
      setEditingId(func.id);
      setNome(func.nome);
      setCpf(func.cpf || "");
      setCargo(func.cargo || "Líder");
      setUnidade(func.unidade || (unidades[0]?.nome || ""));
      setTelefone(func.telefone || "");
      setEmail(func.email || "");
      setStatus(func.status || "Ativo");
    } else {
      setEditingId(null);
      setNome("");
      setCpf("");
      setCargo("Líder");
      setUnidade(unidades[0]?.nome || "");
      setTelefone("");
      setEmail("");
      setStatus("Ativo");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast("Nome do funcionário é obrigatório", "error");
      return;
    }
    if (!unidade) {
      onToast("Por favor, selecione uma unidade", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTIONS.FUNCIONARIOS_SM, editingId), {
          nome: nome.trim(),
          cpf: cpf.trim(),
          cargo,
          unidade,
          telefone: telefone.trim(),
          email: email.trim(),
          status,
        });
        onToast("Funcionário SM atualizado com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.FUNCIONARIOS_SM), {
          nome: nome.trim(),
          cpf: cpf.trim(),
          cargo,
          unidade,
          telefone: telefone.trim(),
          email: email.trim(),
          status,
          createdAt: serverTimestamp(),
        });
        onToast("Funcionário SM cadastrado com sucesso!");
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      console.error("Erro ao salvar funcionário SM:", err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.FUNCIONARIOS_SM, id));
      onToast("Funcionário excluído com sucesso.");
    } catch (err: any) {
      console.error("Erro ao excluir funcionário SM:", err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleExportExcel = () => {
    const dataToExport = funcionarios.map((f) => ({
      Nome: f.nome,
      CPF: f.cpf || "",
      Cargo: f.cargo,
      Unidade: f.unidade,
      Telefone: f.telefone || "",
      Email: f.email || "",
      Status: f.status || "Ativo",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SM Regional");
    XLSX.writeFile(wb, "cadastro_sm_regional.xlsx");
    onToast("Cadastro SM exportado com sucesso!");
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
        for (const row of rawData) {
          const fNome = row.Nome || row.nome || row.NOME;
          if (fNome) {
            const rawCargo = String(row.Cargo || row.cargo || "Líder").trim();
            const validCargo = (CARGOS as readonly string[]).includes(rawCargo)
              ? (rawCargo as typeof CARGOS[number])
              : "Administrativo";

            await addDoc(collection(db, COLLECTIONS.FUNCIONARIOS_SM), {
              nome: String(fNome).trim(),
              cpf: String(row.CPF || row.cpf || "").trim(),
              cargo: validCargo,
              unidade: String(row.Unidade || row.unidade || unidades[0]?.nome || "").trim(),
              telefone: String(row.Telefone || row.telefone || "").trim(),
              email: String(row.Email || row.email || "").trim(),
              status: (row.Status || row.status) === "Inativo" ? "Inativo" : "Ativo",
              createdAt: serverTimestamp(),
            });
            addedCount++;
          }
        }
        onToast(`${addedCount} funcionários importados com sucesso!`);
      } catch (err: any) {
        console.error("Erro ao importar excel SM:", err);
        onToast(`Erro ao importar arquivo: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const filtered = funcionarios.filter((f) => {
    const matchesSearch =
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.cpf && f.cpf.includes(searchTerm)) ||
      (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesUnidade = unidadeFilter === "TODAS" || f.unidade === unidadeFilter;
    const matchesCargo = cargoFilter === "TODOS" || f.cargo === cargoFilter;
    return matchesSearch && matchesUnidade && matchesCargo;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="text-blue-600" size={24} />
            Cadastro SM Regional (Salas de Matrícula)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestão da equipe das Salas de Matrícula das unidades da Regional. Alimenta o Organograma na aba Relatórios.
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
            Novo Funcionário SM
          </button>
        </div>
      </div>

      {/* Filters & Counter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, e-mail..."
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
            value={cargoFilter}
            onChange={(e) => setCargoFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Cargos</option>
            {CARGOS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-end md:self-auto">
          Total: {filtered.length} funcionário(s)
        </span>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Cargo</th>
                <th className="p-4">Unidade</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{f.nome}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          f.cargo === "Líder"
                            ? "bg-amber-100 text-amber-800"
                            : f.cargo === "02"
                            ? "bg-blue-100 text-blue-800"
                            : f.cargo === "Administrativo"
                            ? "bg-purple-100 text-purple-800"
                            : f.cargo === "Estagiário"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {f.cargo}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{f.unidade}</td>
                    <td className="p-4 text-slate-600">{f.cpf || "-"}</td>
                    <td className="p-4 text-xs text-slate-600 space-y-0.5">
                      {f.telefone && <div>{f.telefone}</div>}
                      {f.email && <div className="text-slate-400">{f.email}</div>}
                      {!f.telefone && !f.email && "-"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === "Inativo"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {f.status || "Ativo"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(f)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id, f.nome)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? "Editar Funcionário SM" : "Cadastrar Funcionário SM"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do colaborador"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Cargo / Escala *
                  </label>
                  <select
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Unidade *
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
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
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="email@unesa.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {loading ? "Salvando..." : editingId ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
