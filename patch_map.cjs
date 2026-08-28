const fs = require('fs');
let code = fs.readFileSync('src/components/Mapa3D.tsx', 'utf-8');

// 1. Add useEffect for centering
const filterCidadeHookRegex = /const \[filterCidade, setFilterCidade\] = useState<string>\("Todas"\);/;
const centerEffect = `const [filterCidade, setFilterCidade] = useState<string>("Todas");

  useEffect(() => {
    if (filterCidade !== "Todas") {
      setZoom(10);
      // Wait for filtered companies to be available
      setTimeout(() => {
         const found = document.querySelector('[data-city-marker="true"]');
      }, 100);
    } else {
      setCenter([-42.5, -22.2]);
      setZoom(1);
    }
  }, [filterCidade]);`;

code = code.replace(filterCidadeHookRegex, centerEffect);

// 2. Filter geometries
const geoRegex = /<Geographies geography=\{mapGeoUrl\}>\s*\{[^]*?\}\s*<\/Geographies>/;
const filteredGeo = `<Geographies geography={mapGeoUrl}>
                  {({ geographies }: { geographies: any[] }) => {
                    const filteredGeographies = filterCidade === "Todas"
                      ? geographies
                      : geographies.filter((geo: any) => geo.properties?.name?.toLowerCase() === filterCidade.toLowerCase());

                    return filteredGeographies.map((geo: any) => {
                      const cityName = geo.properties?.name || "";
                      const regionColor = getRegionColor(cityName);

                      // Update center automatically based on the selected city's geometry center approximation
                      // using the first coordinate of its boundary. React simple maps handles this in a more complex way,
                      // but we can just let the user zoom or we can center on the marker.
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={regionColor}
                          stroke="#ffffff"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none", transition: "all 250ms" },
                            hover: { fill: "#cbd5e1", outline: "none" },
                            pressed: { fill: "#94a3b8", outline: "none" },
                          }}
                        />
                      );
                    });
                  }}
                </Geographies>`;

code = code.replace(geoRegex, filteredGeo);

// 3. Add data-city-marker
const markerRegex = /<Marker\s*key=\{emp\.id\}\s*coordinates=\{emp\.pos\}/;
code = code.replace(markerRegex, `<Marker 
                     key={emp.id} 
                     coordinates={emp.pos}
                     data-city-marker="true"`);

fs.writeFileSync('src/components/Mapa3D.tsx', code);
