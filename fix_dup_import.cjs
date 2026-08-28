const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The duplicate imports are ChevronDown and ChevronUp.
code = code.replace("  ChevronDown,\n  ChevronUp,\n", "");

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
