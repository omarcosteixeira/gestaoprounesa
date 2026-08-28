const candidates = [
  { id: '1', status: 'Convertido' },
  { id: '2', status: '' }, // never called
  { id: '3', status: '' }, // called yesterday
  { id: '4', status: '' } // called today
];
const ligacoes = [
  { candidatoId: '3', createdAt: { seconds: Date.now() / 1000 - 86400 } },
  { candidatoId: '4', createdAt: { seconds: Date.now() / 1000 } }
];

const today = new Date().toISOString().split('T')[0];
const filtered = candidates.filter(c => c.status !== 'Convertido');

const withCallInfo = filtered.map(c => {
  const lastCall = ligacoes
    .filter(l => l.candidatoId === c.id)
    .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)[0];
  return { candidate: c, lastCall };
});

const available = withCallInfo.filter(item => {
  if (!item.lastCall || !item.lastCall.createdAt) return true;
  const callDate = new Date(item.lastCall.createdAt.seconds * 1000).toISOString().split('T')[0];
  return callDate !== today;
});

available.sort((a, b) => {
  if (!a.lastCall) return -1;
  if (!b.lastCall) return 1;
  return (a.lastCall.createdAt?.seconds || 0) - (b.lastCall.createdAt?.seconds || 0);
});

console.log(available.map(a => a.candidate.id));
