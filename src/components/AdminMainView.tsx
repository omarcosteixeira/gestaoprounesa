import React, { useState } from "react";
import { UserProfile, UnidadeRegional, FuncionarioSM, Tarefa, UserRole, ClubeParceiro, ClubeResgate } from "../types";
import { ROLES } from "../types";
import { db, secondaryAuth, COLLECTIONS } from "../firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
} from "lucide-react";
import { UnidadesRegionalView } from "./UnidadesRegionalView";
import { CadastroSmRegionalView } from "./CadastroSmRegionalView";
import { CadastroTarefasView } from "./CadastroTarefasView";
import { AdminClubeLocalView } from "./AdminClubeLocalView";

interface Props {
  profile: UserProfile;
  users: UserProfile[];
  unidadesRegional: UnidadeRegional[];
  funcionariosSM: FuncionarioSM[];
  tarefas: Tarefa[];
  clubeParceiros?: ClubeParceiro[];
  clubeResgates?: ClubeResgate[];
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
  onToast,
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<
    "usuarios" | "unidades" | "cadastroSm" | "tarefas" | "clubeLocal"
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
        dashboardWidgets: { stats: true, links: true, planner: true, campanhas: true, bomDia: true, forecast: true, periodo: true },
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.unidade && u.unidade.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "TODOS" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Sub-tabs Navigation */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab("usuarios")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "usuarios"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users size={16} />
          <span>Usuários & Permissões</span>
        </button>

        <button
          onClick={() => setActiveSubTab("unidades")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "unidades"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Building2 size={16} />
          <span>Unidades da Regional</span>
        </button>

        <button
          onClick={() => setActiveSubTab("cadastroSm")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "cadastroSm"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <UserCheck size={16} />
          <span>Cadastro SM Regional</span>
        </button>

        <button
          onClick={() => setActiveSubTab("tarefas")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "tarefas"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CheckSquare size={16} />
          <span>Cadastro de Tarefas</span>
        </button>

        <button
          onClick={() => setActiveSubTab("clubeLocal")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "clubeLocal"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Gift size={16} />
          <span>Clube Local (Vouchers & Banners)</span>
        </button>
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
              Criar Novo Usuário
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome, e-mail, unidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os Perfis</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-end md:self-auto">
              Total: {filteredUsers.length} usuário(s)
            </span>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Nome / E-mail</th>
                    <th className="p-4">Perfil / Cargo</th>
                    <th className="p-4">Unidade</th>
                    <th className="p-4">Servidor</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{u.name || u.nome}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-extrabold">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">{u.unidade || "-"}</td>
                        <td className="p-4 text-xs font-bold uppercase text-slate-500">
                          {u.servidor || "principal"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.blocked
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {u.blocked ? "Bloqueado" : "Ativo"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditRole(u.role);
                              setEditUnidade(u.unidade || "");
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Perfil"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleBlock(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.blocked
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-amber-600 hover:bg-amber-50"
                            }`}
                            title={u.blocked ? "Desbloquear" : "Bloquear"}
                          >
                            {u.blocked ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Modal */}
          {isAddUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Cadastrar Novo Usuário</h3>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome do usuário"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@estacio.br"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Senha Provisória *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Perfil / Função *
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Unidade
                      </label>
                      <select
                        value={newUserUnidade}
                        onChange={(e) => setNewUserUnidade(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      >
                        <option value="">Nenhuma / Regional</option>
                        {unidadesRegional.map((u) => (
                          <option key={u.id} value={u.nome}>
                            {u.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddUserModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={userLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
                    >
                      {userLoading ? "Criando..." : "Cadastrar Conta"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Editar Usuário: {editingUser.name || editingUser.email}
                </h3>

                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Perfil / Função *
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Unidade de Lotação
                    </label>
                    <select
                      value={editUnidade}
                      onChange={(e) => setEditUnidade(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                      <option value="">Geral / Regional</option>
                      {unidadesRegional.map((u) => (
                        <option key={u.id} value={u.nome}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={userLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
                    >
                      {userLoading ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
