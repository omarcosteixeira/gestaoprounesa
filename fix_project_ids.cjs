
const fs = require('fs');

function fixRules(filename, projectId) {
  let content = fs.readFileSync(filename, 'utf8');
  
  // Replace all instances of gestaodeleadspro-d4230 or any other project ID in paths
  content = content.replace(/\/artifacts\/[a-z0-9-]+\/public/g, `/artifacts/${projectId}/public`);
  
  fs.writeFileSync(filename, content);
  console.log(`Updated ${filename} with project ID ${projectId}`);
}

fixRules('firestore.rules', 'gestaopro-761e1');
fixRules('firestore-comercial.rules', 'gestaodeleadspro-d4230');
