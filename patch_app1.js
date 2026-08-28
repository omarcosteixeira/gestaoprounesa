const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const target = `    if (profile && VIEW_PERMISSIONS.dashboard.includes(profile.role)) {
      unsubMetaDia = onSnapshot(
        collection(db, COLLECTIONS.META_DIA),
        (snap) => {
          setMetaDia(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MetaDia),
          );
        },
        (err) =>
          handleFirestoreError(err, OperationType.LIST, COLLECTIONS.META_DIA),
      );
    }`;
const replacement = target + `

    let unsubMetaSM = () => {};
    if (profile && VIEW_PERMISSIONS.dashboard.includes(profile.role)) {
      unsubMetaSM = onSnapshot(
        collection(db, COLLECTIONS.META_SM),
        (snap) => {
          setMetaSM(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MetaSM),
          );
        },
        (err) =>
          handleFirestoreError(err, OperationType.LIST, COLLECTIONS.META_SM),
      );
    }`;

code = code.replace(target, replacement);

// Don't forget to call unsubMetaSM() in the cleanup function
const cleanupTarget = `      unsubMetaDia();
      unsubQgLigacoes();`;
const cleanupReplacement = `      unsubMetaDia();
      unsubMetaSM();
      unsubQgLigacoes();`;
code = code.replace(cleanupTarget, cleanupReplacement);

fs.writeFileSync('src/App.tsx', code);
