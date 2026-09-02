import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const publicValidadorInjection = `
  if (currentView === "validador-vouchers") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <AnimatePresence>
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>
        <PublicValidadorVouchers onToast={showToast} />
      </div>
    );
  }

  if (!user) {`;

content = content.replace("  if (!user) {", publicValidadorInjection);

fs.writeFileSync('src/App.tsx', content);
