const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find VIEW_PERMISSIONS
const viewPermsRegex = /const VIEW_PERMISSIONS: Record<string, UserRole\[\]> = {([\s\S]*?)};\n\n\/\/ --- Components ---/;
const match = content.match(viewPermsRegex);

if (match) {
  let permsContent = match[1];
  
  // We want to add ROLES.LIDER_FDV to every view
  // and ROLES.SALA_MATRICULA to specific ones
  
  const salaMatriculaViews = [
    'cadastro', 'historico', 'bases', 'gap', 'isencoes', 'fiesProuni', 
    'cursos', 'campanhas', 'calendario', 'empresas', 'controleConcorrencia', 'calculo'
  ];

  // A simple way to do this is parse the object but it's typescript string.
  // We can just use string replacement.
  
  const views = permsContent.split('],');
  const updatedViews = views.map(viewStr => {
    if (!viewStr.trim()) return viewStr;
    const parts = viewStr.split(': [');
    if (parts.length < 2) return viewStr;
    const viewName = parts[0].trim();
    let roles = parts[1];
    
    // add ROLES.LIDER_FDV
    if (!roles.includes('ROLES.LIDER_FDV')) {
      roles += '\n    ROLES.LIDER_FDV,';
    }
    
    // add ROLES.SALA_MATRICULA if in list
    if (salaMatriculaViews.includes(viewName) && !roles.includes('ROLES.SALA_MATRICULA')) {
      roles += '\n    ROLES.SALA_MATRICULA,';
    }
    
    return `${parts[0]}: [${roles}`;
  });

  const newPermsContent = updatedViews.join('],');
  const newContent = content.replace(match[1], newPermsContent);
  fs.writeFileSync('src/App.tsx', newContent, 'utf8');
  console.log("Updated permissions");
} else {
  console.log("Not found");
}
