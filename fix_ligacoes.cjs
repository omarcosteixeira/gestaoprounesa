const fs = require('fs');

function fixRules(file, projectId) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('controle_ligacoes')) {
    const qgLigacoesRule = `match /artifacts/${projectId}/public/data/qg_ligacoes/{id} {`;
    const newRule = `match /artifacts/${projectId}/public/data/controle_ligacoes/{id} {
      allow read, write: if isAuthenticated();
    }
    match /artifacts/${projectId}/public/data/qg_ligacoes/{id} {`;
    
    if (content.includes(qgLigacoesRule)) {
      content = content.replace(qgLigacoesRule, newRule);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed ' + file);
    } else {
      console.log('Could not find qg_ligacoes in ' + file);
    }
  } else {
    console.log('controle_ligacoes already in ' + file);
  }
}

fixRules('firestore.rules', 'gestaopro-761e1');
fixRules('firestore-comercial.rules', 'gestaodeleadspro-d4230');
