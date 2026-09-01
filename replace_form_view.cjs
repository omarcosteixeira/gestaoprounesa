const fs = require('fs');
const file = 'src/components/AdminMainView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the import
code = code.replace(
  `import { AdminFormulariosView } from "./AdminFormulariosView";`,
  `import { FormulariosView } from "./FormulariosView";`
);

// Replace the render
code = code.replace(
  `      {activeSubTab === "formularios" && (
        <AdminFormulariosView
          profile={profile}
          onToast={onToast}
        />
      )}`,
  `      {activeSubTab === "formularios" && (
        <FormulariosView
          user={profile}
          onToast={onToast}
        />
      )}`
);

fs.writeFileSync(file, code);
console.log("Updated AdminMainView.tsx");
