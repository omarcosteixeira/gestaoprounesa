import re

with open('firestore.rules', 'r') as f:
    rules = f.read()

old_linked = r"function isLinkedToMe\(otherUserUid\) \{[\s\S]*?\n    \}"
new_linked = """function isLinkedToMe(otherUserUid) {
      let path1 = /databases/$(database)/documents/artifacts/gestaodeleadspro-d4230/public/data/users/$(otherUserUid);
      let path2 = /databases/$(database)/documents/artifacts/gestaopro-761e1/public/data/users/$(otherUserUid);
      let otherUserData = exists(path1) ? get(path1).data : (exists(path2) ? get(path2).data : {"linkadoA": "none"});
      return otherUserData.linkadoA == request.auth.uid;
    }"""
rules = re.sub(old_linked, new_linked, rules, count=1)

with open('firestore.rules', 'w') as f:
    f.write(rules)
