const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const shareFunctionSearch = `      onToast("Gerando PDF, aguarde...", "success");
      const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(\`mapao-\${cardName}.pdf\`);
      onToast("PDF gerado com sucesso!", "success");
    } catch (error) {
      console.error('Failed to generate PDF', error);
      onToast("Erro ao gerar PDF.", "error");
    }`;

const shareFunctionReplace = `      onToast("Gerando PDF, aguarde...", "success");
      const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: true });
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas gerado está vazio (tamanho 0). O elemento pode estar oculto.");
      }
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [Math.max(canvas.width, 1), Math.max(canvas.height, 1)]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(\`mapao-\${cardName}.pdf\`);
      onToast("PDF gerado com sucesso!", "success");
    } catch (error: any) {
      console.error('Failed to generate PDF', error);
      onToast(\`Erro ao gerar PDF: \${error.message || "Erro desconhecido"}\`, "error");
    }`;

code = code.replace(shareFunctionSearch, shareFunctionReplace);
fs.writeFileSync('src/App.tsx', code);
