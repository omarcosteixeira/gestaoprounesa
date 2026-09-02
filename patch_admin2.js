import fs from 'fs';
let content = fs.readFileSync('src/components/AdminClubeLocalView.tsx', 'utf-8');

const linkButton = `        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800">Validação de Vouchers</h3>
          <p className="text-sm text-slate-500">
            Digite o <strong>Código Único de Resgate</strong> (6 caracteres) apresentado pelo aluno para verificar a validade e registrar o uso.
          </p>
          <div className="pt-2">
            <button 
              onClick={() => {
                const url = window.location.origin + "/?view=validador-vouchers";
                navigator.clipboard.writeText(url);
                onToast("Link público copiado! Envie para o parceiro validar vouchers sem precisar de senha.", "success");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors text-sm"
            >
              <ExternalLink size={16} />
              Copiar Link de Acesso Público para o Parceiro
            </button>
          </div>
        </div>`;

content = content.replace(`        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800">Validação de Vouchers</h3>
          <p className="text-sm text-slate-500">
            Digite o <strong>Código Único de Resgate</strong> (6 caracteres) apresentado pelo aluno para verificar a validade e registrar o uso.
          </p>
        </div>`, linkButton);

// Ensure ExternalLink is imported
if (!content.includes('ExternalLink')) {
    content = content.replace('import {', 'import { ExternalLink,');
}

fs.writeFileSync('src/components/AdminClubeLocalView.tsx', content);
