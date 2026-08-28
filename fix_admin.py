
import sys

def replace_lines(file_path, start_line, end_line, new_content):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # start_line and end_line are 1-indexed
    # lines[start_line-1:end_line] will be replaced
    lines[start_line-1:end_line] = [new_content + '\n']
    
    with open(file_path, 'w') as f:
        f.writelines(lines)

new_code = r'''          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Mensagens Padrão do WhatsApp
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Gerencie múltiplos modelos de mensagens para cada categoria
                  </p>
                </div>
                <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 scrollbar-hide">
                  {[
                    { id: "historico", label: "Histórico", icon: <History size={16} /> },
                    { id: "bases", label: "Bases", icon: <Database size={16} /> },
                    { id: "gap", label: "GAP Acadêmico", icon: <GraduationCap size={16} /> },
                    { id: "fiesProuni", label: "Fies/Prouni", icon: <FileText size={16} /> },
                    { id: "bases_renovacao", label: "Base Líquida", icon: <RefreshCw size={16} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveWhatsappTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm",
                        activeWhatsappTab === tab.id
                          ? "bg-blue-600 text-white shadow-blue-100"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6">
              {[
                {
                  id: "historico",
                  label: "Histórico",
                  multi: true,
                  icon: <History size={18} />,
                },
                {
                  id: "bases",
                  label: "Bases",
                  multi: true,
                  icon: <Database size={18} />,
                },
                {
                  id: "gap",
                  label: "GAP Acadêmico",
                  multi: false,
                  icon: <GraduationCap size={18} />,
                  subLabels: [
                    "Padrão",
                    "Matrícula Acadêmica OK",
                    "Indicação de Amigo",
                  ],
                },
                {
                  id: "fiesProuni",
                  label: "Fies/Prouni",
                  multi: false,
                  icon: <FileText size={18} />,
                  subLabels: ["Padrão", "Matrícula Acadêmica OK"],
                },
                {
                  id: "bases_renovacao",
                  label: "Base Líquida",
                  multi: true,
                  icon: <RefreshCw size={18} />,
                },
              ]
                .filter((tipo) => tipo.id === activeWhatsappTab)
                .map((tipo) => {
                  const messages = tipo.multi
                    ? whatsappMessages.filter((m) => m.tipo === tipo.id)
                    : (tipo.subLabels || []).map((label, idx) => {
                        const subtypeId = `${tipo.id}_${idx}`;
                        const msg = whatsappMessages.find(
                          (m) => m.tipo === subtypeId,
                        );
                        return {
                          id: msg?.id || subtypeId,
                          tipo: subtypeId,
                          texto: msg?.texto || "",
                          nome: label,
                          isVirtual: !msg,
                        };
                      });

                  const selectedKey = activeWhatsappTemplates[tipo.id];
                  const selectedMsg = messages.find((m) =>
                    tipo.multi ? m.id === selectedKey : m.tipo === selectedKey,
                  );

                  return (
                    <div key={tipo.id} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between bg-blue-50/50 p-5 rounded-2xl border border-blue-100 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                            {tipo.icon}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                              {tipo.label}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {messages.length} modelo(s) disponível(is)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1 md:max-w-md">
                          <select
                            value={selectedKey || ""}
                            onChange={(e) =>
                              setActiveWhatsappTemplates((prev) => ({
                                ...prev,
                                [tipo.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                          >
                            <option value="">Selecione um modelo...</option>
                            {messages.map((m, idx) => (
                              <option
                                key={m.id}
                                value={tipo.multi ? m.id : m.tipo}
                              >
                                {m.nome || `Modelo ${idx + 1}`}
                              </option>
                            ))}
                          </select>

                          {tipo.multi && (
                            <button
                              onClick={async () => {
                                try {
                                  const docRef = await addDoc(
                                    collection(
                                      db,
                                      COLLECTIONS.WHATSAPP_MESSAGES,
                                    ),
                                    {
                                      tipo: tipo.id,
                                      texto: "",
                                      nome: `Novo Modelo ${messages.length + 1}`,
                                      createdAt: serverTimestamp(),
                                    },
                                  );
                                  setActiveWhatsappTemplates((prev) => ({
                                    ...prev,
                                    [tipo.id]: docRef.id,
                                  }));
                                  onToast("Novo modelo adicionado!");
                                } catch (err: any) {
                                  onToast("Erro ao adicionar modelo.", "error");
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-sm transition-all flex-shrink-0"
                              title="Adicionar Novo Modelo"
                            >
                              <Plus size={20} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50/30 rounded-2xl border border-slate-100 p-6">
                        {selectedMsg ? (
                          <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                                  Nome do Modelo
                                </label>
                                <input
                                  type="text"
                                  value={selectedMsg.nome || ""}
                                  readOnly={!tipo.multi}
                                  onChange={async (e) => {
                                    if (!tipo.multi) return;
                                    const newName = e.target.value;
                                    try {
                                      await updateDoc(
                                        doc(
                                          db,
                                          COLLECTIONS.WHATSAPP_MESSAGES,
                                          selectedMsg.id,
                                        ),
                                        { nome: newName },
                                      );
                                    } catch (err) {}
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold shadow-sm",
                                    !tipo.multi
                                      ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                      : "bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none",
                                  )}
                                  placeholder="Dê um nome a este modelo..."
                                />
                              </div>
                              {tipo.multi && (
                                <button
                                  onClick={async () => {
                                    if (
                                      window.confirm("Excluir este modelo?")
                                    ) {
                                      await deleteDoc(
                                        doc(
                                          db,
                                          COLLECTIONS.WHATSAPP_MESSAGES,
                                          selectedMsg.id,
                                        ),
                                      );
                                      setActiveWhatsappTemplates((prev) => {
                                        const next = { ...prev };
                                        delete next[tipo.id];
                                        return next;
                                      });
                                      onToast("Modelo removido.");
                                    }
                                  }}
                                  className="mt-5 p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Excluir Modelo"
                                >
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </div>

                            <WhatsAppMessageEditor
                              key={selectedMsg.id}
                              msgId={selectedMsg.id}
                              initialText={selectedMsg.texto}
                              label={`Editando: ${selectedMsg.nome || "Modelo"}`}
                              onUpdate={async (novoTexto) => {
                                if (novoTexto === selectedMsg.texto) return;
                                try {
                                  if ((selectedMsg as any).isVirtual) {
                                    const docRef = await addDoc(
                                      collection(
                                        db,
                                        COLLECTIONS.WHATSAPP_MESSAGES,
                                      ),
                                      {
                                        tipo: (selectedMsg as any).tipo,
                                        texto: novoTexto,
                                        nome: selectedMsg.nome,
                                        createdAt: serverTimestamp(),
                                      },
                                    );
                                  } else {
                                    await updateDoc(
                                      doc(
                                        db,
                                        COLLECTIONS.WHATSAPP_MESSAGES,
                                        selectedMsg.id,
                                      ),
                                      {
                                        texto: novoTexto,
                                        updatedAt: serverTimestamp(),
                                      },
                                    );
                                  }
                                  onToast("Modelo atualizado!");
                                } catch (err: any) {
                                  onToast("Erro ao salvar.", "error");
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                              <MessageSquare size={32} />
                            </div>
                            <p className="text-sm font-medium text-center">
                              Selecione um modelo no menu acima para começar a
                              editar e ver a prévia.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>'''

replace_lines('src/App.tsx', 23313, 23745, new_code)
