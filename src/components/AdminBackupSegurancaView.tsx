import React, { useState } from "react";
import {
  Shield,
  Download,
  Upload,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Server,
  Lock,
  HardDrive
} from "lucide-react";
import { UserProfile } from "../types";
import { db, COLLECTIONS } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch
} from "firebase/firestore";

interface Props {
  profile: UserProfile;
  setShowInjectModal?: (show: boolean) => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function AdminBackupSegurancaView({
  profile,
  setShowInjectModal,
  onToast,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const backupData: Record<string, any[]> = {};
      const collectionsToExport = [
        "USERS",
        "UNIDADES_REGIONAL",
        "FUNCIONARIOS_SM",
        "TAREFAS",
        "META_SM",
        "META_CURSOS",
        "CRESCIMENTO_ANUAL",
        "SOLICITACAO_FOLGA",
        "BOM_DIA",
        "FORECAST",
        "QG_LIGACOES",
        "PLANNER",
        "PERIODO_CAPTACAO",
        "WHATSAPP_MESSAGES",
        "LINKS",
        "CLUBE_PARCEIROS",
        "CLUBE_RESGATES",
      ];

      for (const collKey of collectionsToExport) {
        const path = (COLLECTIONS as any)[collKey];
        if (path) {
          try {
            const snap = await getDocs(collection(db, path));
            backupData[collKey] = snap.docs.map((d) => ({
              _id: d.id,
              ...d.data(),
            }));
          } catch (e) {
            console.warn(`Erro ao exportar coleção ${collKey}:`, e);
          }
        }
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `backup_gestaopro_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      onToast("Backup exportado com sucesso em arquivo JSON!");
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao exportar backup: ${err.message}`, "error");
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      onToast("Selecione um arquivo de backup (.json).", "error");
      return;
    }

    if (
      !confirm(
        "Atenção: A restauração de backup gravará/atualizará os dados no banco de dados. Deseja prosseguir?"
      )
    ) {
      return;
    }

    setImporting(true);
    try {
      const fileText = await importFile.text();
      const backupData = JSON.parse(fileText);

      let importedCount = 0;
      for (const [collKey, records] of Object.entries(backupData)) {
        const path = (COLLECTIONS as any)[collKey];
        if (path && Array.isArray(records)) {
          for (const item of records) {
            const docId = item._id || item.id;
            const { _id, ...dataToSave } = item;
            if (docId) {
              await setDoc(doc(db, path, docId), dataToSave, { merge: true });
              importedCount++;
            }
          }
        }
      }

      onToast(`Backup restaurado com sucesso! (${importedCount} registros processados)`, "success");
      setImportFile(null);
    } catch (err: any) {
      console.error(err);
      onToast(`Erro ao restaurar backup: ${err.message}`, "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-blue-600" size={24} />
            Backup & Segurança do Sistema
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Exportação de segurança dos dados, restauração de arquivos JSON e diagnósticos do servidor.
          </p>
        </div>

        {setShowInjectModal && (
          <button
            onClick={() => setShowInjectModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Database size={15} />
            <span>Gerenciador de Injeção de Dados</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Exportar Backup Completo</h3>
              <p className="text-xs text-slate-500">Baixe um arquivo JSON com todas as tabelas e parâmetros.</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5 font-medium">
            <p>• Inclui: Usuários, Unidades, Tarefas, Metas SM e Cursos, WhatsApp, Forecast, Bom Dia e Links.</p>
            <p>• Formato universal JSON para fácil restauração e arquivamento local seguro.</p>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Download size={16} />
            <span>{exporting ? "Gerando Backup JSON..." : "Baixar Backup Geral (JSON)"}</span>
          </button>
        </div>

        {/* Import / Restore Backup Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Restaurar / Importar Backup</h3>
              <p className="text-xs text-slate-500">Importe dados a partir de um arquivo JSON previamente exportado.</p>
            </div>
          </div>

          <form onSubmit={handleImportBackup} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Selecione o arquivo de backup (.json)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={importing || !importFile}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Upload size={16} />
              <span>{importing ? "Restaurando Dados..." : "Executar Restauração de Backup"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* System Security Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Server className="text-slate-700" size={18} />
          Informações de Conexão & Segurança
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Servidor Ativo</span>
            <strong className="text-slate-800 text-xs uppercase">{profile?.servidor || "principal"}</strong>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Administrador Conectado</span>
            <strong className="text-slate-800 text-xs truncate block">{profile?.email}</strong>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Perfil de Segurança</span>
            <strong className="text-blue-700 text-xs">{profile?.role}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
