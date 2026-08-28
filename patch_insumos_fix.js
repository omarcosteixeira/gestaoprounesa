import fs from 'fs';
let code = fs.readFileSync('src/components/ControleInsumosView.tsx', 'utf8');

code = code.replace(
  '          )}</button>', // Wait, no, it's just `</button>`
  '' // Not using replace this way. Let's do it right.
);

// We need to find the `</button>` for each of the three buttons. 
code = code.replace(
  /(\s*\{pedidos\.filter\(\(p\) => p\.status === "Pendente"\)\.length\}[\s\S]*?<\/span>\s*\n\s*\)}[\s\S]*?<\/button>)/,
  '$1}'
);
code = code.replace(
  /(<span>Físico \/ Estoque \(\{estoque\.length\}\)<\/span>\s*\n\s*<\/button>)/,
  '$1}'
);
code = code.replace(
  /(\s*\{comprasList\.length\}[\s\S]*?<\/span>\s*\n\s*\)}[\s\S]*?<\/button>)/,
  '$1}'
);

fs.writeFileSync('src/components/ControleInsumosView.tsx', code);
