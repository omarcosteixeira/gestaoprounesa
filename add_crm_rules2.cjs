const fs = require('fs');

function addCrmRules(filename, projectId) {
  let content = fs.readFileSync(filename, 'utf8');
  
  const rules = `
    match /artifacts/${projectId}/public/data/conversations/{id} {
      allow read, write: if isAuthenticated();
    }
    match /artifacts/${projectId}/public/data/messages/{id} {
      allow read, write: if isAuthenticated();
    }
    match /artifacts/${projectId}/public/data/bot_config/{id} {
      allow read, write: if isAuthenticated();
    }
    match /artifacts/${projectId}/public/data/bot_reports/{id} {
      allow read, write: if isAuthenticated();
    }
`;
  
  content = content.replace(/}[ \n\r]*}[ \n\r]*$/, rules + '  }\n}');
  fs.writeFileSync(filename, content);
}

addCrmRules('firestore.rules', 'gestaopro-761e1');
addCrmRules('firestore-comercial.rules', 'gestaodeleadspro-d4230');
