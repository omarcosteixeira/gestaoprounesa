const fs = require('fs');
let code = fs.readFileSync('src/components/OrganogramaSmView.tsx', 'utf8');

const splitToken = "const AvatarPlaceholder =";
const parts = code.split(splitToken);
if (parts.length > 1) {
  const replacement = `const AvatarPlaceholder = ({ name }: { name?: string }) => (
  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl uppercase">
    {(name || "U")[0]}
  </div>
);

function LevelANode({ f }: { f: any }) {
  return (
    <div className="flex flex-col items-center relative z-10 w-64 mb-4 mx-4 mt-8">
      <div className="w-20 h-20 rounded-full border-[6px] border-white shadow-sm z-30 bg-slate-200 overflow-hidden absolute -top-10">
         <AvatarPlaceholder name={f.nome} />
      </div>
      <div className="bg-white rounded-[2rem] shadow-lg relative w-full pt-10 pb-4 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-8 bg-teal-600 rounded-l-[2rem]"></div>
        <div className="absolute top-0 right-6 bg-teal-600 text-white text-[9px] font-bold px-3 py-1 rounded-b-xl z-20 shadow-sm">LEVEL A</div>
        <div className="relative z-10 pl-2">
          <div className="text-teal-600 font-extrabold text-[12px] uppercase leading-tight truncate">{f.nome}</div>
          <div className="text-slate-400 text-[9px] mt-0.5 font-medium line-clamp-2 leading-snug">{f.funcao || f.cargo || "Gestor"}</div>
        </div>
      </div>
    </div>
  );
}

function LevelBNode({ f }: { f: any }) {
  return (
    <div className="flex items-center relative z-10 w-64 mb-4 mx-4 bg-white rounded-[2rem] shadow-md pr-4 py-2 mt-4 overflow-hidden">
      <div className="absolute top-0 right-6 bg-emerald-500 text-white text-[9px] font-bold px-3 py-1 rounded-b-xl z-20 shadow-sm">LEVEL B</div>
      <div className="absolute top-0 bottom-0 left-0 w-12 bg-emerald-500 rounded-l-[2rem]"></div>
      
      <div className="w-14 h-14 rounded-full border-[4px] border-white shadow-sm bg-slate-200 overflow-hidden relative z-10 -ml-1">
         <AvatarPlaceholder name={f.nome} />
      </div>

      <div className="ml-3 text-left w-full pt-3 relative z-10">
        <div className="text-emerald-600 font-extrabold text-[11px] uppercase leading-tight truncate">{f.nome}</div>
        <div className="text-slate-400 text-[9px] leading-tight line-clamp-2 mt-0.5 font-medium">{f.funcao || f.cargo}</div>
      </div>
    </div>
  );
}

function LevelCNode({ f }: { f: any }) {
  return (
    <div className="flex items-center relative z-10 w-56 mb-4 mx-4 bg-white rounded-[2rem] shadow-md pr-4 py-2 mt-4 overflow-hidden">
      <div className="absolute top-0 right-4 bg-amber-500 text-white text-[9px] font-bold px-3 py-1 rounded-b-xl z-20 shadow-sm">LEVEL C</div>
      <div className="absolute top-0 bottom-0 left-0 w-10 bg-amber-500 rounded-l-[2rem]"></div>
      
      <div className="w-12 h-12 rounded-full border-[4px] border-white shadow-sm bg-slate-200 overflow-hidden relative z-10 ml-0">
         <AvatarPlaceholder name={f.nome} />
      </div>

      <div className="ml-2 text-left w-full pt-3 relative z-10">
        <div className="text-amber-500 font-extrabold text-[10px] uppercase leading-tight truncate">{f.nome}</div>
        <div className="text-slate-400 text-[8px] leading-tight line-clamp-2 mt-0.5 font-medium">{f.funcao || f.cargo}</div>
      </div>
    </div>
  );
}

function LevelDNode({ f }: { f: any }) {
  return (
    <div className="flex flex-col items-center relative z-10 w-32 mb-4 mx-2 mt-2">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute top-0 bottom-0 left-0 right-1/2 bg-orange-500 rounded-l-full"></div>
        <div className="absolute bottom-0 right-0 left-1/2 top-1/2 bg-orange-500 rounded-br-full"></div>
        <div className="w-14 h-14 rounded-full border-[3px] border-white shadow-sm bg-slate-200 overflow-hidden relative z-10">
          <AvatarPlaceholder name={f.nome} />
        </div>
      </div>
      <div className="text-center mt-3 relative z-10 w-full bg-slate-50/50 rounded-xl p-1 backdrop-blur-sm">
        <div className="text-slate-600 font-extrabold text-[10px] uppercase leading-tight truncate">{f.nome}</div>
        <div className="text-slate-500 text-[8px] line-clamp-2 font-medium leading-snug">{f.funcao || f.cargo}</div>
      </div>
    </div>
  );
}
`;
  
  // Cut everything after splitToken and append replacement
  const finalCode = parts[0] + replacement;
  fs.writeFileSync('src/components/OrganogramaSmView.tsx', finalCode);
  console.log("Replaced successfully");
} else {
  console.log("Could not find token");
}
