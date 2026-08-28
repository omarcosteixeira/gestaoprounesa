import re

with open('firestore.rules', 'r') as f:
    rules = f.read()

# Replace getUserData
old_get_user_data = r"function getUserData\(\) \{[\s\S]*?\n    \}"
new_get_user_data = """function getUserData() {
      let path1 = /databases/$(database)/documents/artifacts/gestaodeleadspro-d4230/public/data/users/$(request.auth.uid);
      let path2 = /databases/$(database)/documents/artifacts/gestaopro-761e1/public/data/users/$(request.auth.uid);
      return exists(path1) ? get(path1).data : (exists(path2) ? get(path2).data : {"role": "none", "unidade": "none"});
    }"""
rules = re.sub(old_get_user_data, new_get_user_data, rules, count=1)

# Replace isMasterUser
old_is_master = r"function isMasterUser\(\) \{[\s\S]*?\n    \}"
new_is_master = """function isMasterUser() {
      let path1 = /databases/$(database)/documents/artifacts/gestaodeleadspro-d4230/public/data/users/$(request.auth.uid);
      let path2 = /databases/$(database)/documents/artifacts/gestaopro-761e1/public/data/users/$(request.auth.uid);
      let doc1 = exists(path1) ? get(path1).data : {"email": "none", "role": "none"};
      let doc2 = exists(path2) ? get(path2).data : {"email": "none", "role": "none"};
      return isAuthenticated() && (
        request.auth.token.email in ["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"] || 
        doc1.email in ["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"] ||
        doc2.email in ["canaldonutri@gmail.com", "marcos.teixeira@estacio.br"] ||
        doc1.role == "Admin Master" || 
        doc2.role == "Admin Master" || 
        doc1.role == "Líder/FDV" ||
        doc2.role == "Líder/FDV"
      );
    }"""
rules = re.sub(old_is_master, new_is_master, rules, count=1)

with open('firestore.rules', 'w') as f:
    f.write(rules)
