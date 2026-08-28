const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');
rules = rules.replace(/gestaopro-761e1/g, 'gestaodeleadspro-d4230');
fs.writeFileSync('firestore-comercial.rules', rules, 'utf8');
console.log("Copied firestore.rules to firestore-comercial.rules and replaced project ID.");
