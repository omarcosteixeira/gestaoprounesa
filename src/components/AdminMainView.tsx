import React, { useState } from "react";
import {
  UserProfile,
  UnidadeRegional,
  FuncionarioSM,
  Tarefa,
  UserRole,
  ClubeParceiro,
  ClubeResgate,
  MetaSM,
  MetaCurso,
  AnalysisScheme,
  WhatsAppMessage,
  BotConfig,
} from "../types";
import { ROLES } from "../types";
import { db, secondaryAuth, COLLECTIONS } from "../firebase";
import {
  doc,
  collection,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import {
  Users,
  Building2,
  UserCheck,
  CheckSquare,
  Gift,
  Plus,
  Search,
  Lock,
  Unlock,
  Edit,
  ShieldAlert,
  GraduationCap,
  Target,
  BookOpen,
  TrendingUp,
  MessageSquare,
  Bot,
  Trash2,
  Sparkles,
} from "lucide-react";
import { UnidadesRegionalView } from "./UnidadesRegionalView";
import { CadastroSmRegionalView } from "./CadastroSmRegionalView";
import { CadastroTarefasView } from "./CadastroTarefasView";
import { AdminClubeLocalView } from "./AdminClubeLocalView";
import { AdminFuncionariosView } from "./AdminFuncionariosView";
import MetaSMView from "./MetaSMView";
import MetaCursosView from "./MetaCursosView";
import CrescimentoAnualAdmin from "./CrescimentoAnualAdmin";
import { WhatsAppMessageEditor } from "./WhatsAppMessageEditor";

interface Props {
  profile: UserProfile;
  users: UserProfile[];
  unidadesRegional: UnidadeRegional[];
  funcionariosSM: FuncionarioSM[];
  tarefas: Tarefa[];
  clubeParceiros?: ClubeParceiro[];
  clubeResgates?: ClubeResgate[];
  uniqueUnidades?: string[];
  metaSM?: MetaSM[];
  metaCursos?: MetaCurso[];
  analysisSchemes?: AnalysisScheme[];
  onSaveAnalysisScheme?: (scheme: Partial<AnalysisScheme>) => Promise<void>;
  onDeleteAnalysisScheme?: (id: string) => Promise<void>;
  whatsappMessages?: WhatsAppMessage[];
  botConfig?: BotConfig;
  onToast: (msg: string, type?: "success" | "error") => void;
}

const ALL_ROLES: UserRole[] = [
  "Admin Master",
  "Regional",
  "Líder SM",
  "Sala de Matrícula",
  "SM",
  "QG",
  "Gestor",
  "Gestor Unidade",
  "Gestor Comercial",
  "Líder/FDV",
  "FDV",
  "Promotor",
  "Promotor/rua",
  "Gerente Comercial (Comercial)",
  "FDV (Comercial)",
  "SSA",
  "Acadêmico",
  "Financeiro",
  "Técnico",
];

export function AdminMainView({
  profile,
  users,
  unidadesRegional,
  funcionariosSM,
  tarefas,
  clubeParceiros = [],
  clubeResgates = [],
  uniqueUnidades = [],
  metaSM = [],
  metaCursos = [],
  analysisSchemes = [],
  onSaveAnalysisScheme,
  onDeleteAnalysisScheme,
  whatsappMessages = [],
  botConfig,
  onToast,
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<
    | "usuarios"
    | "unidades"
    | "cadastroSm"
    | "tarefas"
    | "clubeLocal"
    | "funcionarios"
    | "metaSM"
    | "metaCursos"
    | "crescimento"
    | "mensagens"
  >("usuarios");

  // User Management States
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("TODOS");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("123456");
  const [newUserRole, setNewUserRole] = useState<UserRole>("Sala de Matrícula");
  const [newUserUnidade, setNewUserUnidade] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  // Edit User State
  const [editRole, setEditRole] = useState<UserRole>("Sala de Matrícula");
  const [editUnidade, setEditUnidade] = useState("");

  // WhatsApp Messages Management
  const [isAddMsgModalOpen, setIsAddMsgModalOpen] = useState(false);
  const [newMsgTipo, setNewMsgTipo] = useState("geral");
  const [newMsgTexto, setNewMsgTexto] = useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      onToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    setUserLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        newUserEmail.trim(),
        newUserPassword.trim()
      );

      const targetServidor = profile.servidor || "unesa";
      await updateProfile(userCred.user, {
        displayName: `${newUserName.trim()}|${targetServidor}`,
      });

      const newUid = userCred.user.uid;
      const profileData: UserProfile = {
        uid: newUid,
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        servidor: targetServidor,
        unidade: newUserUnidade || undefined,
        blocked: false,
        mustChangePassword: true,
        createdAt: serverTimestamp(),
        dashboardWidgets: {
          stats: true,
          links: true,
          planner: true,
          campanhas: true,
          bomDia: true,
          forecast: true,
          periodo: true,
        },
      };

      await setDoc(doc(db, COLLECTIONS.USERS, newUid), profileData);
      await signOut(secondaryAuth);

      onToast(`Usuário criado com sucesso! Senha temporária: ${newUserPassword}`);
      setIsAddUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("123456");
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err);
      let msg = err.message;
      if (err.code === "auth/email-already-in-use") msg = "Este e-mail já está em uso.";
      onToast(`Erro ao criar usuário: ${msg}`, "error");
    } finally {
      setUserLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUserLoading(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, editingUser.uid), {
        role: editRole,
        unidade: editUnidade || undefined,
        updatedAt: serverTimestamp(),
      });
      onToast("Perfil de usuário atualizado com sucesso!");
      setEditingUser(null);
    } catch (err: any) {
      console.error("Erro ao atualizar usuário:", err);
      onToast(`Erro ao atualizar: ${err.message}`, "error");
    } finally {
      setUserLoading(false);
    }
  };

  const handleToggleBlock = async (targetUser: UserProfile) => {
    const newBlockedState = !targetUser.blocked;
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, targetUser.uid), {
        blocked: newBlockedState,
      });
      onToast(
        `Usuário ${targetUser.name} ${newBlockedState ? "bloqueado" : "desbloqueado"} com sucesso.`
      );
    } catch (err: any) {
      console.error("Erro ao alterar bloqueio:", err);
      onToast(`Erro ao alterar status: ${err.message}`, "error");
    }
  };

  const handleUpdateWhatsappMsg = async (id: string, novoTexto: string) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.WHATSAPP_MESSAGES, id), {
        texto: novoTexto,
        updatedAt: serverTimestamp(),
      });
      onToast("Mensagem atualizada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao atualizar mensagem:", err);
      onToast(`Erro ao salvar: ${err.message}`, "error");
    }
  };

  const handleDeleteWhatsappMsg = async (id: string) => {
    if (!confirm("Deseja realmente excluir este modelo de mensagem?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.WHATSAPP_MESSAGES, id));
      onToast("Mensagem excluída com sucesso!");
    } catch (err: any) {
      console.error("Erro ao excluir mensagem:", err);
      onToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  const handleCreateWhatsappMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgTexto.trim()) {
      onToast("Insira o texto da mensagem.", "error");
      return;
    }
    try {
      await addDoc(collection(db, COLLECTIONS.WHATSAPP_MESSAGES), {
        tipo: newMsgTipo.trim(),
        texto: newMsgTexto.trim(),
        createdAt: serverTimestamp(),
      });
      onToast("Novo modelo de mensagem adicionado!");
      setIsAddMsgModalOpen(false);
      setNewMsgTexto("");
    } catch (err: any) {
      console.error("Erro ao criar mensagem:", err);
      onToast(`Erro ao criar modelo: ${err.message}`, "error");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.unidade && u.unidade.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "TODOS" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const subTabsConfig = [
    { id: "usuarios", label: "Usuários & Permissões", icon: Users },
    { id: "unidades", label: "Unidades da Regional", icon: Building2 },
    { id: "cadastroSm", label: "Cadastro SM Regional", icon: UserCheck },
    { id: "tarefas", label: "Cadastro de Tarefas", icon: CheckSquare },
    { id: "clubeLocal", label: "Clube Local (Vouchers)", icon: Gift },
    { id: "funcionarios", label: "Docentes & Administrativos", icon: GraduationCap },
    { id: "metaSM", label: "Metas SM", icon: Target },
    { id: "metaCursos", label: "Metas Cursos", icon: BookOpen },
    { id: "crescimento", label: "Crescimento Anual", icon: TrendingUp },
    { id: "mensagens", label: "Mensagens WhatsApp", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs Navigation */}
      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-2">
        {subTabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === "unidades" && (
        <UnidadesRegionalView unidades={unidadesRegional} onToast={onToast} />
      )}

      {activeSubTab === "cadastroSm" && (
        <CadastroSmRegionalView
          funcionarios={funcionariosSM}
          unidades={unidadesRegional}
          onToast={onToast}
        />
      )}

      {activeSubTab === "tarefas" && (
        <CadastroTarefasView
          tarefas={tarefas}
          unidades={unidadesRegional}
          profile={profile}
          onToast={onToast}
        />
      )}

      {activeSubTab === "clubeLocal" && (
        <AdminClubeLocalView
          parceiros={clubeParceiros}
          resgates={clubeResgates}
          unidades={unidadesRegional}
          profile={profile}
          onToast={onToast}
        />
      )}

      {activeSubTab === "funcionarios" && (
        <AdminFuncionariosView
          onToast={onToast}
          uniqueUnidades={uniqueUnidades}
        />
      )}

      {activeSubTab === "metaSM" && (
        <MetaSMView metaSM={metaSM} onToast={onToast} />
      )}

      {activeSubTab === "metaCursos" && (
        <MetaCursosView metaCursos={metaCursos} onToast={onToast} />
      )}

      {activeSubTab === "crescimento" && (
        <CrescimentoAnualAdmin
          schemes={analysisSchemes}
          onSave={onSaveAnalysisScheme || (async () => {})}
          onDelete={onDeleteAnalysisScheme || (async () => {})}
        />
      )}

      {activeSubTab === "mensagens" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={24} />
                Gestão de Mensagens WhatsApp
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure os modelos de mensagens utilizados nos disparos automáticos e contatos manuais.
              </p>
            </div>

            <button
              onClick={() => setIsAddMsgModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Novo Modelo de Mensagem</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {whatsappMessages.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 text-slate-400">
                <MessageSquare className="mx-auto mb-3 text-slate-300" size={48} />
                <p className="text-sm font-semibold">Nenhum modelo cadastrado no servidor.</p>
                <p className="text-xs text-slate-400 mt-1">Clique em "Novo Modelo de Mensagem" para adicionar.</p>
              </div>
            ) : (
              whatsappMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"
                >
                  <WhatsAppMessageEditor
                    msgId={msg.id}
                    initialText={msg.texto}
                    label={msg.tipo ? `Tipo: ${msg.tipo}` : "Mensagem Padrão"}
                    onUpdate={(newTxt) => handleUpdateWhatsappMsg(msg.id, newTxt)}
                    onDelete={() => handleDeleteWhatsappMsg(msg.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Novo Modelo de Mensagem */}
      {isAddMsgModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="text-blue-600" size={20} />
              Adicionar Modelo de Mensagem
            </h3>
            <form onSubmit={handleCreateWhatsappMsg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tipo / Categoria
                </label>
                <input
                  type="text"
                  value={newMsgTipo}
                  onChange={(e) => setNewMsgTipo(e.target.value)}
                  placeholder="Ex: Geral, Cobrança, Matrícula, Retenção..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Texto da Mensagem
                </label>
                <textarea
                  rows={5}
                  value={newMsgTexto}
                  onChange={(e) => setNewMsgTexto(e.target.value)}
                  placeholder="Olá [nome], tudo bem? Vimos seu interesse no curso [curso]..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Variáveis disponíveis: <code className="bg-slate-100 px-1 rounded">[nome]</code>,{" "}
                  <code className="bg-slate-100 px-1 rounded">[curso]</code>,{" "}
                  <code className="bg-slate-100 px-1 rounded">[unidade]</code>,{" "}
                  <code className="bg-slate-100 px-1 rounded">[saudacao]</code>,{" "}
                  <code className="bg-slate-100 px-1 rounded">[data_contato]</code>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddMsgModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === "usuarios" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-blue-600" size={24} />
                Gerenciamento de Usuários
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Administre os perfis de acesso (SM, QG, Líder SM, Regional, etc.), unidades e permissões.
              </p>
            </div>

            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Novo Usuário</span>
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar por nome, email ou unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-xs font-bold text-slate-500">Perfil:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os Perfis</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela de Usuários */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nome</th>
                    <th className="py-3.5 px-4">E-mail</th>
                    <th className="py-3.5 px-4">Perfil (Role)</th>
                    <th className="py-3.5 px-4">Unidade</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.uid}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          u.blocked ? "bg-red-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs uppercase">
                            {u.name?.charAt(0) || "U"}
                          </div>
                          {u.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              u.role === "Admin Master"
                                ? "bg-purple-100 text-purple-700"
                                : u.role === "Regional"
                                ? "bg-amber-100 text-amber-700"
                                : u.role === "Líder SM"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {u.unidade || "Todas / Regional"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              u.blocked
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {u.blocked ? "Bloqueado" : "Ativo"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditRole(u.role);
                                setEditUnidade(u.unidade || "");
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar Perfil"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleBlock(u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.blocked
                                  ? "text-emerald-600 hover:bg-emerald-50"
                                  : "text-amber-600 hover:bg-amber-50"
                              }`}
                              title={u.blocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                            >
                              {u.blocked ? <Unlock size={16} /> : <Lock size={16} />}
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
        </div>
      )}

      {/* Modal Adicionar Usuário */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              Cadastrar Novo Usuário
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do usuário"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="usuario@estacio.br"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Senha Inicial *
                </label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Perfil de Acesso (Cargo)
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Unidade Responsável
                </label>
                <select
                  value={newUserUnidade}
                  onChange={(e) => setNewUserUnidade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas / Regional (Acesso Global)</option>
                  {unidadesRegional.map((u) => (
                    <option key={u.id} value={u.nome}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  disabled={userLoading}
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={userLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {userLoading ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit className="text-blue-600" size={20} />
              Editar Usuário: {editingUser.name}
            </h3>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Unidade Responsável
                </label>
                <select
                  value={editUnidade}
                  onChange={(e) => setEditUnidade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas / Regional (Acesso Global)</option>
                  {unidadesRegional.map((u) => (
                    <option key={u.id} value={u.nome}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  disabled={userLoading}
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={userLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {userLoading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
