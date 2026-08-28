import fs from 'fs';
let code = fs.readFileSync('src/components/FormulariosView.tsx', 'utf8');

const newUploadFn = `  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      const reader = new FileReader();
      reader.onloadend = () => {
          const img = new window.Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1024;
              const MAX_HEIGHT = 1024;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                  if (width > MAX_WIDTH) {
                      height *= MAX_WIDTH / width;
                      width = MAX_WIDTH;
                  }
              } else {
                  if (height > MAX_HEIGHT) {
                      width *= MAX_HEIGHT / height;
                      height = MAX_HEIGHT;
                  }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                  setCurrentForm(prev => prev ? { ...prev, bannerUrl: dataUrl } : prev);
                  onToast("Imagem carregada com sucesso!", "success");
              }
              setIsUploading(false);
          };
          img.onerror = () => {
              onToast("Erro ao ler a imagem.", "error");
              setIsUploading(false);
          };
          img.src = reader.result as string;
      };
      reader.onerror = () => {
          onToast("Erro ao processar imagem.", "error");
          setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erro no processamento:", err);
      onToast("Erro ao processar imagem.", "error");
      setIsUploading(false);
    }
  };`;

// We'll replace the existing function.
const match = code.match(/const handleImageUpload = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]+?finally \{\s+setIsUploading\(false\);\s+\}\s+\};/);
if (match) {
  code = code.replace(match[0], newUploadFn);
  fs.writeFileSync('src/components/FormulariosView.tsx', code);
  console.log("Upload function replaced.");
} else {
  console.log("Could not find the target function to replace.");
}
