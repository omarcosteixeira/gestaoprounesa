import fs from 'fs';
let code = fs.readFileSync('src/components/FormulariosView.tsx', 'utf8');

const fallbackCode = `      // Fallback to base64 with compression
      try {
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
                     onToast("Imagem salva em modo offline (tamanho reduzido)", "success");
                 }
             };
             img.src = reader.result as string;
         };
         reader.readAsDataURL(file);
      } catch (fallbackErr) {
         onToast("Erro ao processar imagem.", "error");
      }`;

code = code.replace(
  /\/\/ Fallback to base64 if Firebase Storage fails \[\s\S\]+reader\.readAsDataURL\(file\);\n      \} catch \(fallbackErr\) \{\n         onToast\("Erro ao processar imagem\.", "error"\);\n      \}/g,
  fallbackCode
);

// If the regex replacement doesn't match properly, let's just do it string based:
const targetString = `      // Fallback to base64 if Firebase Storage fails (e.g. missing permissions)
      try {
         const reader = new FileReader();
         reader.onloadend = () => {
             setCurrentForm(prev => prev ? { ...prev, bannerUrl: reader.result as string } : prev);
             onToast("Imagem carregada localmente (modo offline/fallback)", "success");
         };
         reader.readAsDataURL(file);
      } catch (fallbackErr) {
         onToast("Erro ao processar imagem.", "error");
      }`;

code = code.replace(targetString, fallbackCode);

fs.writeFileSync('src/components/FormulariosView.tsx', code);
