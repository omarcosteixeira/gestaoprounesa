import React, { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  X,
  Users,
  ExternalLink,
} from "lucide-react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { EmpresaParceira, UserProfile, Lead, CalendarioAcao, CursoDisponivel, BotConfig } from "../types";
import { formatPhone, getWhatsAppUrl } from "../lib/utils";
import * as XLSX from "xlsx";

interface EmpresasParceirasViewProps {
  data: EmpresaParceira[];
  leads: Lead[];
  acoes: CalendarioAcao[];
  onToast: (message: string, type?: "success" | "error") => void;
  cursos: CursoDisponivel[];
  users: UserProfile[];
  onSendWhatsApp?: (tel: string, msg: string) => Promise<void>;
  botConfig: BotConfig;
  uniqueUnidades: string[];
  profile: UserProfile;
  onGenerateAction?: (empresa: EmpresaParceira) => void;
}

export function EmpresasParceirasView({
  data,
  onToast,
  profile,
  onGenerateAction,
}: EmpresasParceirasViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaParceira | null>(null);

  const [formData, setFormData] = useState<Partial<EmpresaParceira>>({
    nome: "",
    cnpj: "",
    responsavel: "",
    telefone: "",
    email: "",
    endereco: "",
    bairro: "",
    cidade: "",
    linkMaps: "",
    statusEmpresa: "Conveniada",
    classificacao: "Prata",
    seguimento: "",
    unidadesVinculadas: [],
  });

  const filteredEmpresas = useMemo(() => {
    return data.filter((e) => {
      return (
        !searchTerm ||
        e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.responsavel && e.responsavel.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.endereco && e.endereco.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [data, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmpresa) {
        await updateDoc(doc(db, COLLECTIONS.EMPRESAS_PARCEIRAS, editingEmpresa.id), {
          ...formData,
          telefone: (formData.telefone || "").replace(/\D/g, ""),
        });
        onToast("Empresa parceira atualizada!");
      } else {
        await addDoc(collection(db, COLLECTIONS.EMPRESAS_PARCEIRAS), {
          ...formData,
          telefone: (formData.telefone || "").replace(/\D/g, ""),
          consultorId: profile.uid,
          consultorNome: profile.name,
          createdAt: serverTimestamp(),
        });
        onToast("Empresa parceira cadastrada!");
      }
      setIsModalOpen(false);
      setEditingEmpresa(null);
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir esta empresa parceira?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.EMPRESAS_PARCEIRAS, id));
      onToast("Empresa excluída com sucesso!");
    } catch (err: any) {
      onToast(err.message, "error");
    }
  };

  const handleExport = () => {
    const exportData = filteredEmpresas.map((e) => ({
      Nome: e.nome,
      CNPJ: e.cnpj || "",
      Responsável: e.responsavel,
      Telefone: e.telefone,
      Email: e.email || "",
      Endereço: e.endereco || "",
      Bairro: e.bairro || "",
      Cidade: e.cidade || "",
      Status: e.statusEmpresa || "",
      Classificação: e.classificacao || "",
      Seguimento: e.seguimento || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EmpresasParceiras");
    XLSX.writeFile(workbook, "Empresas_Parceiras.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" size={28} />
            Empresas Parceiras (Convênios)
          </h2>
          <p className="text-sm text-slate-500">
            Cadastre empresas conveniadas, agende ações e contatos comerciais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEditingEmpresa(null);
              setFormData({
                nome: "",
                cnpj: "",
                responsavel: "",
                telefone: "",
                email: "",
                endereco: "",
                bairro: "",
                cidade: "",
                linkMaps: "",
                statusEmpresa: "Conveniada",
                classificacao: "Prata",
                seguimento: "",
                unidadesVinculadas: [],
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            <span>Nova Empresa</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-slate-200 transition-all text-sm font-bold"
          >
            <Download size={18} />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome da empresa, responsável ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmpresas.map((empresa) => (
          <div
            key={empresa.id}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-200 transition-all"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-full text-xs">
                  {empresa.statusEmpresa || "Conveniada"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingEmpresa(empresa);
                      setFormData(empresa);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(empresa.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{empresa.nome}</h3>
                {empresa.responsavel && (
                  <p className="text-xs text-slate-500 mt-1">Contato: {empresa.responsavel}</p>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {empresa.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-emerald-500" />
                    <span>{formatPhone(empresa.telefone)}</span>
                  </div>
                )}
                {empresa.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-blue-500" />
                    <span className="truncate">{empresa.email}</span>
                  </div>
                )}
                {empresa.endereco && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-rose-500 shrink-0" />
                    <span className="truncate">{empresa.endereco}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              {empresa.telefone && (
                <a
                  href={getWhatsAppUrl(empresa.telefone, `Olá ${empresa.responsavel || ""}, tudo bem? Falamos da universidade!`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                  title="WhatsApp"
                >
                  <Phone size={16} />
                </a>
              )}
              {onGenerateAction && (
                <button
                  onClick={() => onGenerateAction(empresa)}
                  className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Calendar size={14} />
                  <span>Agendar Ação</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredEmpresas.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 italic">
            Nenhuma empresa parceira cadastrada.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {editingEmpresa ? "Editar Empresa Parceira" : "Nova Empresa Parceira"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEmpresa(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nome da Empresa *
                </label>
                <input
                  required
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Empresa XYZ Ltda"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Responsável / Contato
                  </label>
                  <input
                    value={formData.responsavel || ""}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nome do RH ou Gestor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    required
                    value={formData.telefone || ""}
                    onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.statusEmpresa || "Conveniada"}
                    onChange={(e) => setFormData({ ...formData, statusEmpresa: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  >
                    <option value="Conveniada">Conveniada</option>
                    <option value="Em tratativa">Em tratativa</option>
                    <option value="Não visitada">Não visitada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Endereço
                </label>
                <input
                  value={formData.endereco || ""}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
              >
                {editingEmpresa ? "Salvar Alterações" : "Cadastrar Empresa"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
