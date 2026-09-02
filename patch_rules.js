import fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf-8');

const replacement = `match /artifacts/{projectId}/public/data/clube_resgates/{id} { allow read, write: if true; }\n    match /artifacts/{projectId}/public/data/{collectionName}/{id} {`;

content = content.replace(/match \/artifacts\/(.+?)\/public\/data\/{collectionName}\/{id} {/g, function(match, projectId) {
  return `match /artifacts/${projectId}/public/data/clube_resgates/{id} { allow read, write: if true; }\n    ${match}`;
});

fs.writeFileSync('firestore.rules', content);
