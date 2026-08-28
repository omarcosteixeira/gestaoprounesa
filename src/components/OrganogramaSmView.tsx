import React, { useState } from "react";
import { FuncionarioSM, UnidadeRegional } from "../types";
import { Crown, User, Shield, GraduationCap, Award, Building2, Phone, Mail, FileText } from "lucide-react";

interface Props {
  funcionarios: FuncionarioSM[];
  unidades: UnidadeRegional[];
}

export function OrganogramaSmView({ funcionarios, unidades }: Props) {
  const [selectedUnidade, setSelectedUnidade] = useState<string>(
    unidades[0]?.nome || ""
  );

  const unitStaff = funcionarios.filter(
    (f) => f.unidade === selectedUnidade && (f.status === "Ativo" || !f.status)
  );

  // Group by exact requested hierarchy scale:
  // 1. Líder
  // 2. 02
  // 3. Outros Administrativos
  // 4. Estagiário
  // 5. Jovem Aprendiz
  const lideres = unitStaff.filter((f) => f.cargo === "Líder");
  const viceLideres = unitStaff.filter((f) => f.cargo === "02");
  const administrativos = unitStaff.filter((f) => f.cargo === "Administrativo");
  const estagiarios = unitStaff.filter((f) => f.cargo === "Estagiário");
  const jovensAprendizes = unitStaff.filter((f) => f.cargo === "Jovem Aprendiz");

  return (
    <div className="space-y-6">
      {/* Unit Selector Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Organograma da Sala de Matrícula
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Selecione uma unidade para visualizar a estrutura hierárquica da equipe da Sala de Matrícula.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-600 uppercase">Unidade:</label>
          <select
            value={selectedUnidade}
            onChange={(e) => setSelectedUnidade(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
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

      {!selectedUnidade ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400">
          Por favor, selecione uma unidade no menu acima para carregar o organograma.
        </div>
      ) : unitStaff.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-2">
          <Building2 size={40} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">Nenhum funcionário cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não existem colaboradores cadastrados para a unidade{" "}
            <strong className="text-slate-800">{selectedUnidade}</strong> no Cadastro SM Regional em Administração.
          </p>
        </div>
      ) : (
        <div className="space-y-8 bg-slate-50/50 p-6 sm:p-8 rounded-3xl border border-slate-200/60">
          {/* Level 1: Líder */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider px-1">
              <Crown size={16} className="text-amber-500" />
              1. Líder da Sala de Matrícula
            </div>

            {lideres.length === 0 ? (
              <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl text-xs text-amber-800 font-medium">
                Sem Líder cadastrado para esta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lideres.map((f) => (
                  <div
                    key={f.id}
                    className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-md border border-amber-400 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-amber-900/40 text-amber-100 px-2.5 py-0.5 rounded-full mb-2">
                          <Crown size={12} /> Líder SM
                        </span>
                        <h4 className="text-base font-bold text-white leading-tight">{f.nome}</h4>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-lg flex-shrink-0">
                        {f.nome.charAt(0)}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/20 text-xs text-amber-100 space-y-1 font-medium">
                      {f.cpf && <div className="flex items-center gap-1.5"><FileText size={12} /> CPF: {f.cpf}</div>}
                      {f.telefone && <div className="flex items-center gap-1.5"><Phone size={12} /> {f.telefone}</div>}
                      {f.email && <div className="flex items-center gap-1.5"><Mail size={12} /> {f.email}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level 2: 02 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider px-1">
              <Shield size={16} className="text-blue-500" />
              2. Sub-Líder / 02
            </div>

            {viceLideres.length === 0 ? (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium">
                Sem 02 cadastrado para esta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viceLideres.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200 hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full mb-2">
                          02 / Sub-Líder
                        </span>
                        <h4 className="text-base font-bold text-slate-800 leading-tight">{f.nome}</h4>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base flex-shrink-0">
                        {f.nome.charAt(0)}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1 font-medium">
                      {f.cpf && <div>CPF: {f.cpf}</div>}
                      {f.telefone && <div className="flex items-center gap-1.5"><Phone size={12} /> {f.telefone}</div>}
                      {f.email && <div className="flex items-center gap-1.5"><Mail size={12} /> {f.email}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level 3: Outros Administrativos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider px-1">
              <User size={16} className="text-purple-500" />
              3. Administrativos
            </div>

            {administrativos.length === 0 ? (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium">
                Sem Administrativos cadastrados nesta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {administrativos.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {f.nome.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{f.nome}</h4>
                        <span className="text-[10px] font-bold text-purple-700 uppercase">
                          Administrativo
                        </span>
                      </div>
                    </div>
                    {(f.telefone || f.email) && (
                      <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
                        {f.telefone && <div>{f.telefone}</div>}
                        {f.email && <div>{f.email}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level 4: Estagiário */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider px-1">
              <GraduationCap size={16} className="text-sky-500" />
              4. Estagiários
            </div>

            {estagiarios.length === 0 ? (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium">
                Sem Estagiários cadastrados nesta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {estagiarios.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {f.nome.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{f.nome}</h4>
                        <span className="text-[10px] font-bold text-sky-700 uppercase">
                          Estagiário
                        </span>
                      </div>
                    </div>
                    {(f.telefone || f.email) && (
                      <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
                        {f.telefone && <div>{f.telefone}</div>}
                        {f.email && <div>{f.email}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level 5: Jovem Aprendiz */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider px-1">
              <Award size={16} className="text-emerald-500" />
              5. Jovem Aprendiz
            </div>

            {jovensAprendizes.length === 0 ? (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium">
                Sem Jovem Aprendiz cadastrado nesta unidade.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jovensAprendizes.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {f.nome.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{f.nome}</h4>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">
                          Jovem Aprendiz
                        </span>
                      </div>
                    </div>
                    {(f.telefone || f.email) && (
                      <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
                        {f.telefone && <div>{f.telefone}</div>}
                        {f.email && <div>{f.email}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
