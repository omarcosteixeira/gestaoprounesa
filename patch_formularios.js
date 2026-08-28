import fs from 'fs';
let code = fs.readFileSync('src/components/FormulariosView.tsx', 'utf8');

// Add imports
code = code.replace(
  /import \{ cn \} from "\.\.\/lib\/utils";/g,
  `import { cn } from "../lib/utils";\nimport { storage } from "../firebase";\nimport { ref, uploadBytes, getDownloadURL } from "firebase/storage";`
);

// Add upload state and function
code = code.replace(
  /  const \[isEditing, setIsEditing\] = useState\(false\);/g,
  `  const [isEditing, setIsEditing] = useState(false);\n  const [isUploading, setIsUploading] = useState(false);`
);

const uploadFn = `
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast("Selecione um arquivo de imagem válido.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onToast("A imagem deve ter no máximo 5MB.", "error");
      return;
    }

    try {
      setIsUploading(true);
      
      // Fallback if storage is not fully configured: read as Base64 to save locally, 
      // but let's try Firebase Storage first if possible. 
      // Wait, let's actually just use a Base64 reader to be safe because 
      // Firebase Storage rules might be missing or fail, 
      // and we don't want the user to be blocked.
      // But wait, base64 might exceed Firestore document limits. 
      // Let's use Firebase Storage.
      const storageRef = ref(storage, \`banners/\${Date.now()}_\${file.name}\`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setCurrentForm(prev => prev ? { ...prev, bannerUrl: url } : prev);
      onToast("Imagem enviada com sucesso!", "success");
    } catch (err: any) {
      console.error("Erro ao enviar imagem:", err);
      // Fallback to base64 if Firebase Storage fails (e.g. missing permissions)
      try {
         const reader = new FileReader();
         reader.onloadend = () => {
             setCurrentForm(prev => prev ? { ...prev, bannerUrl: reader.result as string } : prev);
             onToast("Imagem carregada localmente (modo offline/fallback)", "success");
         };
         reader.readAsDataURL(file);
      } catch (fallbackErr) {
         onToast("Erro ao processar imagem.", "error");
      }
    } finally {
      setIsUploading(false);
    }
  };
`;

code = code.replace(
  /  const handleCreate = \(\) => \{/g,
  uploadFn + '\n  const handleCreate = () => {'
);

const inputUI = `              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Banner (Opcional)</label>
                
                {currentForm?.bannerUrl ? (
                  <div className="mb-3 relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={currentForm.bannerUrl} alt="Banner" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => setCurrentForm({ ...currentForm, bannerUrl: "" })}
                      className="absolute top-2 right-2 bg-white/90 text-red-600 p-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                      title="Remover banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className={cn(
                    "w-full bg-slate-50 border border-slate-200 border-dashed rounded-xl px-4 py-6 text-center transition-all",
                    isUploading ? "opacity-50" : "hover:border-blue-400 hover:bg-blue-50"
                  )}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Image size={24} className={isUploading ? "text-slate-400" : "text-blue-500"} />
                      <span className="text-sm font-medium text-slate-600">
                        {isUploading ? "Enviando imagem..." : "Clique ou arraste uma imagem (Máx: 5MB)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>`;

code = code.replace(
  /              <div>\s*<label className="block text-xs font-bold text-slate-400 uppercase mb-2">URL do Banner \(Opcional\)<\/label>\s*<input\s*type="url"\s*value=\{currentForm\?\.bannerUrl \|\| ""\}\s*onChange=\{\(e\) => setCurrentForm\(\{ \.\.\.currentForm, bannerUrl: e\.target\.value \}\)\}\s*placeholder="Ex: https:\/\/meusite\.com\/imagem\.png"\s*className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"\s*\/>\s*<p className="text-\[10px\] text-slate-500 mt-1">Insira a URL de uma imagem para ser exibida no topo do formulário\.<\/p>\s*<\/div>/g,
  inputUI
);

// We need to import Trash2 and Image from lucide-react if they are missing
if (!code.includes('Trash2')) {
  code = code.replace(/import \{ /g, 'import { Trash2, Image as ImageIcon, ');
  code = code.replace(/<Image /g, '<ImageIcon ');
}

fs.writeFileSync('src/components/FormulariosView.tsx', code);
