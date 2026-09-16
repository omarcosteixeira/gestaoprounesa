import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db, COLLECTIONS } from '../firebase';
import { Docente } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Search, 
  Save, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2,
  Phone,
  Mail,
  User,
  Link as LinkIcon,
  BookOpen,
  Calendar,
  FileText
} from 'lucide-react';

const AREAS_ATUACAO = [
  'Juridico', 
  'Saúde', 
  'Ciências Biologicas', 
  'Pedagogia', 
  'Técnico', 
  'Engenharia', 
  'Gestão', 
  'Tecnologia'
];

const FORMACOES = [
  'Superior', 
  'Pós Graduado', 
  'Mestrado', 
  'Doutorado'
];

const DIAS_SEMANA = [
  'Segunda', 
  'Terça', 
  'Quarta', 
  'Quinta', 
  'Sexta', 
  'Sábado'
];

export function PublicDocenteForm() {
  const [step, setStep] = useState<'search' | 'form' | 'success'>('search');
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docenteData, setDocenteData] = useState<Partial<Docente>>({
    nome: '',
    matricula: '',
    telefone: '',
    email: '',
    lattes: '',
    areasAtuacao: [],
    formacao: [],
    diasDisponiveis: [],
    obs: ''
  });

  // Ensure an authenticated session (anonymous if public) for Firestore security rules
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        console.warn('Silent anonymous auth fallback notice:', err);
      });
    }
  }, []);

  const ensureAuth = async () => {
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn('Could not establish anonymous session:', e);
      }
    }
  };

  const handleStartNew = () => {
    setError(null);
    setDocenteData({
      nome: '',
      matricula: matricula.trim(),
      telefone: '',
      email: '',
      lattes: '',
      areasAtuacao: [],
      formacao: [],
      diasDisponiveis: [],
      obs: ''
    });
    setStep('form');
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!matricula.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await ensureAuth();
      const q = query(collection(db, COLLECTIONS.DOCENTES), where('matricula', '==', matricula.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        setDocenteData({
          ...docData,
          id: querySnapshot.docs[0].id
        } as Docente);
      } else {
        setDocenteData({
          nome: '',
          matricula: matricula.trim(),
          telefone: '',
          email: '',
          lattes: '',
          areasAtuacao: [],
          formacao: [],
          diasDisponiveis: [],
          obs: ''
        });
      }
      setStep('form');
    } catch (err: any) {
      console.warn('Erro ao buscar docente na base:', err);
      // Fallback: don't block the teacher from registering! Allow them to proceed to the form
      setDocenteData(prev => ({
        ...prev,
        matricula: matricula.trim()
      }));
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArray = (field: keyof Docente, value: string) => {
    const currentArray = (docenteData[field] as string[]) || [];
    if (currentArray.includes(value)) {
      setDocenteData(prev => ({
        ...prev,
        [field]: currentArray.filter(item => item !== value)
      }));
    } else {
      setDocenteData(prev => ({
        ...prev,
        [field]: [...currentArray, value]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteData.nome?.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (!docenteData.matricula?.trim() && !matricula.trim()) {
      setError('Por favor, informe sua matrícula.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ensureAuth();

      const finalMatricula = (docenteData.matricula || matricula).trim();
      const payload: any = {
        nome: (docenteData.nome || '').trim(),
        matricula: finalMatricula,
        telefone: (docenteData.telefone || '').trim(),
        email: (docenteData.email || '').trim(),
        lattes: (docenteData.lattes || '').trim(),
        areasAtuacao: Array.isArray(docenteData.areasAtuacao) ? docenteData.areasAtuacao : [],
        formacao: Array.isArray(docenteData.formacao) ? docenteData.formacao : [],
        diasDisponiveis: Array.isArray(docenteData.diasDisponiveis) ? docenteData.diasDisponiveis : [],
        obs: (docenteData.obs || '').trim(),
        updatedAt: serverTimestamp()
      };

      if (docenteData.id) {
        await updateDoc(doc(db, COLLECTIONS.DOCENTES, docenteData.id), payload);
      } else {
        await addDoc(collection(db, COLLECTIONS.DOCENTES), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setStep('success');
    } catch (err: any) {
      console.error('Erro ao salvar docente:', err);
      setError(`Ocorreu um erro ao salvar os dados: ${err.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Cadastro Concluído com Sucesso!</h2>
          {docenteData.nome && (
            <p className="text-slate-700 font-semibold mb-1">
              {docenteData.nome}
            </p>
          )}
          {(docenteData.matricula || matricula) && (
            <p className="text-xs text-slate-500 font-mono bg-slate-100 py-1.5 px-3 rounded-lg inline-block mb-4">
              Matrícula: {docenteData.matricula || matricula}
            </p>
          )}
          <p className="text-slate-500 text-sm mb-8">
            Suas informações e disponibilidades foram gravadas com sucesso na base de dados de Alocação Docente.
          </p>
          <button 
            onClick={() => {
              setStep('search');
              setMatricula('');
              setDocenteData({
                nome: '',
                matricula: '',
                telefone: '',
                email: '',
                lattes: '',
                areasAtuacao: [],
                formacao: [],
                diasDisponiveis: [],
                obs: ''
              });
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20"
          >
            Realizar Outro Cadastro / Voltar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Cadastro de Docente
          </h1>
          <p className="text-slate-500 mt-2">
            Preencha seus dados para alocação docente
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'search' ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Search size={20} className="text-blue-500" />
                Identificação
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Informe sua matrícula para localizar seus dados ou iniciar um novo cadastro.
              </p>
              
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Matrícula
                  </label>
                  <input 
                    type="text" 
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Digite sua matrícula..."
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-slate-700 bg-slate-50 transition-all"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading || !matricula.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Localizar Matrícula
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline py-1 transition-colors"
                  >
                    Primeiro cadastro ou não sabe a matrícula? Clique aqui para preencher diretamente
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Dados Básicos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <User size={18} className="text-blue-500" />
                    Dados Básicos
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text"
                          required
                          value={docenteData.nome}
                          onChange={e => setDocenteData({...docenteData, nome: e.target.value})}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="tel"
                          required
                          value={docenteData.telefone}
                          onChange={e => setDocenteData({...docenteData, telefone: e.target.value})}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 bg-slate-50"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="email"
                          required
                          value={docenteData.email}
                          onChange={e => setDocenteData({...docenteData, email: e.target.value})}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Currículo Lattes (Link)</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="url"
                          value={docenteData.lattes}
                          onChange={e => setDocenteData({...docenteData, lattes: e.target.value})}
                          placeholder="http://lattes.cnpq.br/..."
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Área de Atuação */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-500" />
                    Área de Atuação
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {AREAS_ATUACAO.map(area => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => handleToggleArray('areasAtuacao', area)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          docenteData.areasAtuacao?.includes(area)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formação */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <GraduationCap size={18} className="text-blue-500" />
                    Formação Acadêmica
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FORMACOES.map(form => (
                      <button
                        key={form}
                        type="button"
                        onClick={() => handleToggleArray('formacao', form)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          docenteData.formacao?.includes(form)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {form}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disponibilidade */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-500" />
                    Disponibilidade para Aulas
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {DIAS_SEMANA.map(dia => (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => handleToggleArray('diasDisponiveis', dia)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          docenteData.diasDisponiveis?.includes(dia)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {dia}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" />
                    Aderência e Experiência
                  </h3>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Disciplinas ou cursos de interesse</label>
                  <textarea 
                    value={docenteData.obs}
                    onChange={e => setDocenteData({...docenteData, obs: e.target.value})}
                    placeholder="Descreva aqui quais disciplinas ou cursos você tem mais experiência ou interesse em lecionar..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 bg-slate-50 min-h-[120px]"
                  />
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep('search')}
                    className="flex-1 px-4 py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={20} />
                        Salvar Informações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
