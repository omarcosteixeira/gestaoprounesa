import fs from 'fs';
let code = fs.readFileSync('src/components/RelatoriosView.tsx', 'utf8');

const definitions = `
  const filteredIsencoes = useMemo(() => isPrivileged ? isencoes : isencoes.filter(i => i.unidade === profile.unidade), [isencoes, profile, isPrivileged]);
  const filteredEmpresasParceiras = useMemo(() => isPrivileged ? empresasParceiras : empresasParceiras.filter(e => e.unidadesVinculadas?.includes(profile.unidade || "") || e.unidade === profile.unidade), [empresasParceiras, profile, isPrivileged]);
  const filteredPedidosCursos = useMemo(() => isPrivileged ? (pedidosCursos || []) : (pedidosCursos || []), [pedidosCursos, isPrivileged]); // Pedidos doesn't have unidade in type right now, keep as is or filter? Wait, if it has no unidade, we can't filter.
  const filteredInsumosPedidos = useMemo(() => isPrivileged ? insumosPedidos : insumosPedidos.filter(i => i.unidade === profile.unidade), [insumosPedidos, profile, isPrivileged]);
  const filteredInsumosBaixas = useMemo(() => isPrivileged ? insumosBaixas : insumosBaixas.filter(i => i.unidade === profile.unidade), [insumosBaixas, profile, isPrivileged]);
  const filteredMetaDia = useMemo(() => isPrivileged ? (metaDia || []) : (metaDia || []).filter(m => m.unidade === profile.unidade), [metaDia, profile, isPrivileged]);
  const filteredSolicitacoesManutencao = useMemo(() => isPrivileged ? (solicitacoesManutencao || []) : (solicitacoesManutencao || []).filter(s => s.unidade === profile.unidade), [solicitacoesManutencao, profile, isPrivileged]);
  const filteredAnalysisSchemes = useMemo(() => isPrivileged ? (analysisSchemes || []) : (analysisSchemes || []).filter(a => a.unidade === profile.unidade), [analysisSchemes, profile, isPrivileged]);
`;

code = code.replace(/const filteredCalendarioAcoes = useMemo\(\(\) => \{/, definitions + '\n  const filteredCalendarioAcoes = useMemo(() => {');

// Replacements
code = code.replace(/\bempresasParceiras\./g, 'filteredEmpresasParceiras.');
code = code.replace(/\[empresasParceiras\]/g, '[filteredEmpresasParceiras]');
code = code.replace(/, empresasParceiras\]/g, ', filteredEmpresasParceiras]');

code = code.replace(/\binsumosPedidos\./g, 'filteredInsumosPedidos.');
code = code.replace(/\[insumosPedidos/g, '[filteredInsumosPedidos');
code = code.replace(/, insumosPedidos/g, ', filteredInsumosPedidos');

code = code.replace(/\binsumosBaixas\./g, 'filteredInsumosBaixas.');
code = code.replace(/\[insumosBaixas/g, '[filteredInsumosBaixas');
code = code.replace(/, insumosBaixas/g, ', filteredInsumosBaixas');

code = code.replace(/\bsolicitacoesManutencao\./g, 'filteredSolicitacoesManutencao.');
code = code.replace(/\[solicitacoesManutencao/g, '[filteredSolicitacoesManutencao');
code = code.replace(/, solicitacoesManutencao/g, ', filteredSolicitacoesManutencao');

code = code.replace(/\banalysisSchemes\./g, 'filteredAnalysisSchemes.');
code = code.replace(/\[analysisSchemes/g, '[filteredAnalysisSchemes');
code = code.replace(/, analysisSchemes/g, ', filteredAnalysisSchemes');

code = code.replace(/\bpedidosCursos\./g, 'filteredPedidosCursos.');
code = code.replace(/\[pedidosCursos/g, '[filteredPedidosCursos');
code = code.replace(/, pedidosCursos/g, ', filteredPedidosCursos');

// ligacoes filtering needs update
code = code.replace(/ligacoes\.filter/g, 'ligacoes.filter((l) => isPrivileged ? true : l.unidade === profile.unidade).filter');
code = code.replace(/\[ligacoes,/g, '[ligacoes, profile, isPrivileged,');
code = code.replace(/\[metaDia,/g, '[filteredMetaDia,');
code = code.replace(/, metaDia/g, ', filteredMetaDia');
code = code.replace(/\bmetaDia\./g, 'filteredMetaDia.');

fs.writeFileSync('src/components/RelatoriosView.tsx', code);
