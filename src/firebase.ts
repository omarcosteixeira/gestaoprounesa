import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


export const firebaseConfigPrincipal = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY_PRINCIPAL || "AIzaSyDSlDqp7Nn7UCjjF2jkcEwcaMyoRZV4yBo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_PRINCIPAL || "gestaopro-761e1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID_PRINCIPAL || "gestaopro-761e1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_PRINCIPAL || "gestaopro-761e1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_PRINCIPAL || "371631944013",
  appId: import.meta.env.VITE_FIREBASE_APP_ID_PRINCIPAL || "1:371631944013:web:1883a10f7be4e5a5738704",
};

export const firebaseConfigComercial = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY_COMERCIAL || "AIzaSyBexxjzDAuNSgY90rlVqpz4AQZDE-QwSG4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_COMERCIAL || "gestaodeleadspro-d4230.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID_COMERCIAL || "gestaodeleadspro-d4230",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_COMERCIAL || "gestaodeleadspro-d4230.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_COMERCIAL || "964003766645",
  appId: import.meta.env.VITE_FIREBASE_APP_ID_COMERCIAL || "1:964003766645:web:75aea7b1a825ddfe44333c"
};

export const firebaseConfigUnesa = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY_UNESA || "AIzaSyDkycX1dwccDcRjUsF4LjM4z7F6JjcKYlk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_UNESA || "gen-lang-client-0111023338.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID_UNESA || "gen-lang-client-0111023338",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_UNESA || "gen-lang-client-0111023338.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_UNESA || "866976553624",
  appId: import.meta.env.VITE_FIREBASE_APP_ID_UNESA || "1:866976553624:web:59c67baefc81f6f4420eed",
};

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const urlServidor = params ? params.get('servidor') : null;
const savedServidor = urlServidor || localStorage.getItem('servidor_selected') || 'principal';
const activeConfig = savedServidor === 'comercial'
  ? firebaseConfigComercial
  : savedServidor === 'unesa'
  ? firebaseConfigUnesa
  : firebaseConfigPrincipal;

const app = initializeApp(activeConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable robust native offline persistence for Android and PWA standalone apps
export const db = typeof window !== 'undefined'
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, (activeConfig as any).firestoreDatabaseId || undefined)
  : getFirestore(app, (activeConfig as any).firestoreDatabaseId || undefined);

// Secondary app for creating users without signing out the current admin
export const secondaryApp = getApps().length > 1 
  ? getApp('secondary') 
  : initializeApp(activeConfig, 'secondary');
export const secondaryAuth = getAuth(secondaryApp);

// Dynamic collection paths based on active project
export const COLLECTIONS = new Proxy({} as any, {
  get: (_, prop: string) => {
    // Determine the project ID based on the actual initialized app
    const currentProjectId = app.options.projectId || 'gestaopro-761e1';

    const paths: Record<string, string> = {
      LEADS: `artifacts/${currentProjectId}/public/data/leads`,
      USERS: `artifacts/${currentProjectId}/public/data/users`,
      GAP: `artifacts/${currentProjectId}/public/data/gap_academico`,
      ISENCOES: `artifacts/${currentProjectId}/public/data/isencoes`,
      PLANNER: `artifacts/${currentProjectId}/public/data/planner`,
      BASES: `artifacts/${currentProjectId}/public/data/bases`,
      LINKS: `artifacts/${currentProjectId}/public/data/linksUteis`,
      FIES_PROUNI: `artifacts/${currentProjectId}/public/data/fies_prouni`,
      FIES_PROUNI_VAGAS: `artifacts/${currentProjectId}/public/data/fies_prouni_vagas`,
      CAMPANHAS: `artifacts/${currentProjectId}/public/data/campanhas`,
      BOM_DIA: `artifacts/${currentProjectId}/public/data/bom_dia`,
      FORECAST: `artifacts/${currentProjectId}/public/data/forecast`,
      PERIODO_CAPTACAO: `artifacts/${currentProjectId}/public/data/periodo_captacao`,
      CALENDARIO_ACOES: `artifacts/${currentProjectId}/public/data/calendario_acoes`,
      EMPRESAS_PARCEIRAS: `artifacts/${currentProjectId}/public/data/empresas_parceiras`,
      WHATSAPP_MESSAGES: `artifacts/${currentProjectId}/public/data/whatsapp_messages`,
      MAPAO_ACADEMICO: `artifacts/${currentProjectId}/public/data/mapao_academico`,
      BASES_DISPARO: `artifacts/${currentProjectId}/public/data/bases_disparo`,
      BASES_RENOVACAO: `artifacts/${currentProjectId}/public/data/bases_renovacao`,
      BOT_CONFIG: `artifacts/${currentProjectId}/public/data/bot_config`,
      BOT_REPORTS: `artifacts/${currentProjectId}/public/data/bot_reports`,
      META_DIA: `artifacts/${currentProjectId}/public/data/meta_dia`,
      META_SM: `artifacts/${currentProjectId}/public/data/meta_sm`,
      META_CURSOS: `artifacts/${currentProjectId}/public/data/meta_cursos`,
      QG_LIGACOES: `artifacts/${currentProjectId}/public/data/qg_ligacoes`,
      SOLICITACAO_FOLGA: `artifacts/${currentProjectId}/public/data/solicitacoes_folga`,
      CURSOS: `artifacts/${currentProjectId}/public/data/cursos`,
      INSUMOS_PEDIDOS: `artifacts/${currentProjectId}/public/data/insumos_pedidos`,
      INSUMOS_ESTOQUE: `artifacts/${currentProjectId}/public/data/insumos_estoque`,
      INSUMOS_PEDIDOS_COMERCIAL: `artifacts/${currentProjectId}/public/data/insumos_pedidos_comercial`,
      INSUMOS_ESTOQUE_COMERCIAL: `artifacts/${currentProjectId}/public/data/insumos_estoque_comercial`,
      INSUMOS_BAIXAS: `artifacts/${currentProjectId}/public/data/insumos_baixas`,
      INSUMOS_BAIXAS_COMERCIAL: `artifacts/${currentProjectId}/public/data/insumos_baixas_comercial`,
      FUNCIONARIOS: `artifacts/${currentProjectId}/public/data/funcionarios`,
      CONTROLE_CONCORRENCIA: `artifacts/${currentProjectId}/public/data/controle_concorrencia`,
      EVASAO: `artifacts/${currentProjectId}/public/data/evasao`,
      PEDIDO_CURSOS: `artifacts/${currentProjectId}/public/data/pedido_cursos`,
      CONTROLE_LIGACOES: `artifacts/${currentProjectId}/public/data/controle_ligacoes`,
      CRESCIMENTO_ANUAL: `artifacts/${currentProjectId}/public/data/crescimento_anual`,
      SOLICITACOES_MANUTENCAO: `artifacts/${currentProjectId}/public/data/solicitacoes_manutencao`,
      CONVERSATIONS: `artifacts/${currentProjectId}/public/data/conversations`,
      MESSAGES: `artifacts/${currentProjectId}/public/data/messages`,
      FORMS_CONFIG: `artifacts/${currentProjectId}/public/data/forms_config`,
      FORM_SUBMISSIONS: `artifacts/${currentProjectId}/public/data/form_submissions`,
      EMAIL_CAMPAIGNS: `artifacts/${currentProjectId}/public/data/email_campaigns`,
      EMAIL_CAMPAIGN_CONTACTS: `artifacts/${currentProjectId}/public/data/email_campaign_contacts`,
      EMAIL_CAMPAIGN_LOGS: `artifacts/${currentProjectId}/public/data/email_campaign_logs`,
      SALES_CONTACTS: `artifacts/${currentProjectId}/public/data/sales_contacts`,
      WHATS_CONTACTS: `artifacts/${currentProjectId}/public/data/whats_contacts`,
      MALA_DIRETA_CONTACTS: `artifacts/${currentProjectId}/public/data/mala_direta_contacts`,
      TAREFAS: `artifacts/${currentProjectId}/public/data/tarefas`,
      FUNCIONARIOS_SM: `artifacts/${currentProjectId}/public/data/funcionarios_sm`,
      UNIDADES_REGIONAL: `artifacts/${currentProjectId}/public/data/unidades_regional`,
      META_UNIDADE_REGIONAL: `artifacts/${currentProjectId}/public/data/meta_unidade_regional`,
      CLUBE_PARCEIROS: `artifacts/${currentProjectId}/public/data/clube_parceiros`,
      CLUBE_RESGATES: `artifacts/${currentProjectId}/public/data/clube_resgates`,
    };
    return paths[prop];
  }
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: any[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  // Safe to ignore: occurs when unmounting/unsubscribing cancels in-flight requests
  if (errorMessage.includes('The user aborted a request') || errorMessage.includes('cancelled')) {
    console.debug('Firestore: Request aborted (likely unmount/unsub)', errInfo.path);
    return errInfo;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't necessarily want to crash the whole app, but we want to log it
  return errInfo;
}
