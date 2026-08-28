import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    let unsubLeads = () => {};`;
const replacement = `    let unsubSalesContacts = () => {};
    let unsubLeads = () => {};`;
code = code.replace(target, replacement);

const target2 = `      unsubLeads = onSnapshot(
        leadsQuery,
        (snap) => {
          setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead));
        },
        (err) =>
          handleFirestoreError(err, OperationType.LIST, COLLECTIONS.LEADS),
      );`;

const replacement2 = target2 + `
      
      unsubSalesContacts = onSnapshot(
        query(collection(db, COLLECTIONS.SALES_CONTACTS), orderBy("createdAt", "desc")),
        (snap) => {
          setSalesContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalesContact));
        },
        (err) => console.error("Error loading sales contacts:", err)
      );`;

code = code.replace(target2, replacement2);

const target3 = `        unsubLeads();`;
const replacement3 = `        unsubLeads();\n        unsubSalesContacts();`;
code = code.replace(target3, replacement3);

fs.writeFileSync('src/App.tsx', code);
