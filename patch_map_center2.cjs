const fs = require('fs');
let code = fs.readFileSync('src/components/Mapa3D.tsx', 'utf-8');

const oldEffect = /useEffect\(\(\) => \{\s*if \(filterCidade !== "Todas"\) \{[^]*?\}, \[filterCidade, empresas\]\);/;

const newEffect = `useEffect(() => {
    if (filterCidade !== "Todas") {
      setZoom(10);
      // Let's rely on the first marker of the filtered companies
      if (filteredEmpresas.length > 0) {
        // We need to calculate its coordinate quickly
        // getCoordinates is inside the component
        const first = filteredEmpresas[0];
        // The pos is in empresasWithPositions, let's just trigger a re-center if we find it
      }
    } else {
      setCenter([-42.5, -22.2]);
      setZoom(1);
    }
  }, [filterCidade]);

  // Center on first company of the filtered list if city is selected
  useEffect(() => {
     if (filterCidade !== "Todas" && empresasWithPositions.length > 0) {
        setCenter(empresasWithPositions[0].pos);
     }
  }, [filterCidade, empresasWithPositions]);
  `;

code = code.replace(oldEffect, newEffect);

fs.writeFileSync('src/components/Mapa3D.tsx', code);
