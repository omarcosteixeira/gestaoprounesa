const fs = require('fs');
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

const cardsAnchor = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <ModalidadeCard 
                    title="B.U Presencial" 
                    aa={section.stats.aaPresencial + section.stats.aaSemipresencial} 
                    realizado={section.stats.realizadoPresencial + section.stats.realizadoSemipresencial} 
                  />
                  <ModalidadeCard 
                    title="Presencial" 
                    aa={section.stats.aaPresencial} 
                    realizado={section.stats.realizadoPresencial} 
                  />
                  <ModalidadeCard 
                    title="Semipresencial" 
                    aa={section.stats.aaSemipresencial} 
                    realizado={section.stats.realizadoSemipresencial} 
                  />
                  <ModalidadeCard 
                    title="EAD (Digital)" 
                    aa={section.stats.aaDigital} 
                    realizado={section.stats.realizadoDigital} 
                  />
                  <ModalidadeCard 
                    title="Curso Técnico" 
                    aa={section.stats.aaTecnico} 
                    realizado={section.stats.realizadoTecnico} 
                  />
                  <ModalidadeCard 
                    title="Pós-Graduação" 
                    aa={section.stats.aaPosGraduacao} 
                    realizado={section.stats.realizadoPosGraduacao} 
                  />
                </div>`;

const cardsReplacement = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <ModalidadeCard 
                    title="B.U Presencial" 
                    aa={section.stats.aaPresencial + section.stats.aaSemipresencial} 
                    meta={section.stats.ytdPresencial + section.stats.ytdSemipresencial}
                    realizado={section.stats.realizadoPresencial + section.stats.realizadoSemipresencial} 
                  />
                  <ModalidadeCard 
                    title="Presencial" 
                    aa={section.stats.aaPresencial} 
                    meta={section.stats.ytdPresencial}
                    realizado={section.stats.realizadoPresencial} 
                  />
                  <ModalidadeCard 
                    title="Semipresencial" 
                    aa={section.stats.aaSemipresencial} 
                    meta={section.stats.ytdSemipresencial}
                    realizado={section.stats.realizadoSemipresencial} 
                  />
                  <ModalidadeCard 
                    title="EAD (Digital)" 
                    aa={section.stats.aaDigital} 
                    meta={section.stats.ytdDigital}
                    realizado={section.stats.realizadoDigital} 
                  />
                  <ModalidadeCard 
                    title="Curso Técnico" 
                    aa={section.stats.aaTecnico} 
                    meta={section.stats.ytdTecnico}
                    realizado={section.stats.realizadoTecnico} 
                  />
                  <ModalidadeCard 
                    title="Pós-Graduação" 
                    aa={section.stats.aaPosGraduacao} 
                    meta={section.stats.ytdPosGraduacao}
                    realizado={section.stats.realizadoPosGraduacao} 
                  />
                </div>`;

const componentAnchor = `const ModalidadeCard = ({ title, aa, realizado }: { title: string, aa: number, realizado: number }) => {
  const percent = aa > 0 ? ((realizado / aa) * 100).toFixed(1) : 0;
  return (
    <div className="p-4 rounded-xl border border-slate-100 shadow-sm bg-white flex flex-col justify-between">
      <div>
        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 leading-tight h-8">{title}</h5>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Realizado</div>
            <div className="text-xl font-black text-slate-800">{realizado}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase">A.A</div>
            <div className="text-sm font-bold text-slate-600">{aa}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Curva A.A</span>
        <span className={cn("text-xs font-bold", realizado >= aa ? "text-emerald-600" : "text-rose-500")}>
          {percent}%
        </span>
      </div>
    </div>
  );
};`;

const componentReplacement = `const ModalidadeCard = ({ title, aa, meta, realizado }: { title: string, aa: number, meta: number, realizado: number }) => {
  const percentAa = aa > 0 ? ((realizado / aa) * 100).toFixed(1) : 0;
  const percentMeta = meta > 0 ? ((realizado / meta) * 100).toFixed(1) : 0;
  return (
    <div className="p-4 rounded-xl border border-slate-100 shadow-sm bg-white flex flex-col justify-between">
      <div>
        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 leading-tight h-8">{title}</h5>
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Realizado</div>
            <div className="text-xl font-black text-slate-800">{realizado}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Meta</div>
            <div className="text-sm font-bold text-indigo-600">{meta}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase">A.A</div>
            <div className="text-sm font-bold text-slate-600">{aa}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-50 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Curva Meta</span>
          <span className={cn("text-xs font-bold", Number(percentMeta) >= 100 ? "text-emerald-600" : "text-rose-500")}>
            {percentMeta}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Curva A.A</span>
          <span className={cn("text-xs font-bold", Number(percentAa) >= 100 ? "text-emerald-600" : "text-rose-500")}>
            {percentAa}%
          </span>
        </div>
      </div>
    </div>
  );
};`;

if(code.includes(cardsAnchor)) {
  code = code.replace(cardsAnchor, cardsReplacement);
  console.log("Replaced cards");
} else {
  console.log("Could not find cardsAnchor");
}

if(code.includes(componentAnchor)) {
  code = code.replace(componentAnchor, componentReplacement);
  console.log("Replaced component");
} else {
  console.log("Could not find componentAnchor");
}

fs.writeFileSync('src/components/RelatoriosView.tsx', code, 'utf8');
