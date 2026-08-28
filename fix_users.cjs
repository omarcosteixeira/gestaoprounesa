const fs = require('fs');

function fixRules(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Regex string replacement with plain string matching because the text is exact
  const oldText = `allow list: if isAuthenticated() && (
        isMasterUser() || 
        isComercial() || 
        (isGestorUnidade() && resource.data.unidade == getUserData().unidade && resource.data.role in ['FDV', 'FDV (Comercial)', 'Promotor', 'Promotor/rua']) ||
        (isFDV() && (resource.data.unidade == getUserData().unidade || resource.data.linkadoA == request.auth.uid || resource.data.uid == request.auth.uid))
      );`;
  const newText = `allow list: if isAuthenticated() && (isMasterUser() || isComercial() || canAccessUnit(resource.data.unidade));`;

  if (content.includes(oldText)) {
      content = content.replace(oldText, newText);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed ' + file);
  } else {
      console.log('Could not find text in ' + file);
  }
}

fixRules('firestore.rules');
fixRules('firestore-comercial.rules');
