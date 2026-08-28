import React from "react";
import { Wrench, AlertCircle } from "lucide-react";

export function ChecklistView() {
  return (
    <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center space-y-4 max-w-2xl mx-auto my-12">
      <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <Wrench size={32} />
      </div>
      
      <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
        Check List
      </h2>
      
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 font-extrabold text-xs rounded-full border border-amber-300">
        <AlertCircle size={14} />
        EM MANUTENÇÃO
      </div>
      
      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        Esta funcionalidade está sendo atualizada no momento. Em breve novas ferramentas e listas de verificação estarão disponíveis.
      </p>
    </div>
  );
}
