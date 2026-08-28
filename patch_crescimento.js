import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /const unsubscribe = onSnapshot\(q, \(snapshot\) => {\n      const list = snapshot\.docs\.map\(\(doc\) => \(\{\n        id: doc\.id,\n        \.\.\.doc\.data\(\),\n      \}\)\) as AnalysisScheme\[\];\n      setAnalysisSchemes\(list\);\n    }\);/g,
  `const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AnalysisScheme[];
      setAnalysisSchemes(list);
    }, (err) => {
      console.log("Crescimento Anual snapshot error:", err);
    });`
);
fs.writeFileSync('src/App.tsx', code);
