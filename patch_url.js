import fs from 'fs';
let code = fs.readFileSync('src/components/FormulariosView.tsx', 'utf8');

const target = `  const getPublicUrl = (formId: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return \`\${baseUrl}?formId=\${formId}\`;
  };`;

const replacement = `  const getPublicUrl = (formId: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const servidor = localStorage.getItem('servidor_selected') || 'principal';
    return \`\${baseUrl}?formId=\${formId}&servidor=\${servidor}\`;
  };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/FormulariosView.tsx', code);
