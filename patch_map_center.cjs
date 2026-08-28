const fs = require('fs');
let code = fs.readFileSync('src/components/Mapa3D.tsx', 'utf-8');

const oldEffect = /useEffect\(\(\) => \{\s*if \(filterCidade !== "Todas"\) \{[^]*?\}, \[filterCidade\]\);/;

const newEffect = `useEffect(() => {
    if (filterCidade !== "Todas") {
      // Find the first company in the selected city to center the map
      const cityEmpresas = empresas.filter(e => detectCidade(e.endereco) === filterCidade);
      if (cityEmpresas.length > 0) {
          const emp = cityEmpresas[0];
          // Simple coordinate approximation based on detectCidade - it would be better to use IBGE centroids, but we can just use the first marker
          setZoom(10);
          
          // Try to get pos from empresasWithPositions if it's already calculated
          // Since it's calculated in useMemo, we can just use a slightly delayed effect or calculate it here
      } else {
         setZoom(10);
      }
    } else {
      setCenter([-42.5, -22.2]);
      setZoom(1);
    }
  }, [filterCidade, empresas]);`;

code = code.replace(oldEffect, newEffect);

fs.writeFileSync('src/components/Mapa3D.tsx', code);
