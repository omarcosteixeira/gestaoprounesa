import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /setAdminRequests\(list\);\n        setLoadingAdminRequests\(false\);\n      }\n    \);/g,
  `setAdminRequests(list);
        setLoadingAdminRequests(false);
      },
      (err) => {
        console.log("Solicitacao Folga snapshot error:", err);
      }
    );`
);
fs.writeFileSync('src/App.tsx', code);
