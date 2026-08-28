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
import { UnidadeRegional } from "../types";
import { Plus, Trash2, Edit2, Download, Upload, Search, Building2, MapPin } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  unidades: UnidadeRegional[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function UnidadesRegionalView({ unidades, onToast }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [endereco, setEndereco] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (unit?: UnidadeRegional) => {
    if (unit) {
      setEditingId(unit.id);
      setNome(unit.nome);
      setCodigo(unit.codigo || "");
      setEndereco(unit.endereco || "");
    } else {
      setEditingId(null);
      setNome("");
      setCodigo("");
      setEndereco("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast("Nome da unidade é obrigatório", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTIONS.UNIDADES_REGIONAL, editingId), {
          nome: nome.trim(),
          codigo: codigo.trim(),
          endereco: endereco.trim(),
        });
        onToast("Unidade atualizada com sucesso!");
      } else {
        await addDoc(collection(db, COLLECTIONS.UNIDADES_REGIONAL), {
          nome: nome.trim(),
          codigo: codigo.trim(),
          endereco: endereco.trim(),
          createdAt: serverTimestamp(),
        });
        onToast("Unidade cadastrada com sucesso!");
      }
      setIsModalOpen(false);
      setNome("");
      setCodigo("");
      setEndereco("");
      setEditingId(null);
    } catch (err: any) {
      console.error("Erro ao salvar unidade:", err);
      onToast(`Erro ao salvar unidade: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a unidade "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.UNIDADES_REGIONAL, id));
      onToast("Unidade excluída com sucesso.");
    } catch (err: any) {
      console.error("Erro ao excluir unidade:", err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleExportExcel = () => {
    const dataToExport = unidades.map((u) => ({
      Nome: u.nome,
      Código: u.codigo || "",
      Endereço: u.endereco || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unidades Regional");
    XLSX.writeFile(wb, "unidades_regional.xlsx");
    onToast("Unidades exportadas com sucesso!");
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
          const uNome = row.Nome || row.nome || row["Nome da Unidade"] || row.UNIDADE;
          if (uNome) {
            await addDoc(collection(db, COLLECTIONS.UNIDADES_REGIONAL), {
              nome: String(uNome).trim(),
              codigo: String(row.Código || row.codigo || "").trim(),
              endereco: String(row.Endereço || row.endereco || "").trim(),
              createdAt: serverTimestamp(),
            });
            addedCount++;
          }
        }
        onToast(`${addedCount} unidades importadas com sucesso!`);
      } catch (err: any) {
        console.error("Erro ao importar excel:", err);
        onToast(`Erro ao importar arquivo: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const filtered = unidades.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.codigo && u.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.endereco && u.endereco.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Cadastro de Unidades da Regional
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre todas as unidades da Regional para sincronizar com listas suspensas e filtros.
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
            disabled={unidades.length === 0}
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
            Nova Unidade
          </button>
        </div>
      </div>

      {/* Search & Counter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
          Total: {filtered.length} unidade(s)
        </span>
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Nome da Unidade</th>
                <th className="p-4">Código</th>
                <th className="p-4">Endereço</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma unidade cadastrada.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <Building2 size={16} className="text-blue-500 flex-shrink-0" />
                      {u.nome}
                    </td>
                    <td className="p-4 text-slate-600">{u.codigo || "-"}</td>
                    <td className="p-4 text-slate-600">
                      {u.endereco ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400" />
                          {u.endereco}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.nome)}
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? "Editar Unidade" : "Cadastrar Nova Unidade"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nome da Unidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campo Grande, Taquara..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Código da Unidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: CG01, TAQ02..."
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Endereço
                </label>
                <textarea
                  placeholder="Endereço completo da unidade..."
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
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
