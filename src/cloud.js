// Inicialização do Firebase (Auth + Firestore). A configuração vem das
// variáveis de ambiente VITE_FIREBASE_* (.env.local em dev; painel da Vercel
// em produção). Se faltar config, o app segue funcionando 100% local.
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Só liga a nuvem se a config mínima existir
export const cloudEnabled = Boolean(cfg.apiKey && cfg.projectId);

let auth = null;
let db = null;
if (cloudEnabled) {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
}
export { auth, db };

// Usuário atual (cacheado para acesso síncrono)
let _user = null;
export function currentUser() { return _user; }
export function isSignedIn() { return Boolean(_user); }

// Observa o estado de login; chama cb(user|null). Devolve função p/ cancelar.
export function onAuth(cb) {
  if (!cloudEnabled) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, (u) => { _user = u; cb(u); });
}

export function signInGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export function signInEmail(email, pw) {
  return signInWithEmailAndPassword(auth, email, pw);
}
export function registerEmail(email, pw) {
  return createUserWithEmailAndPassword(auth, email, pw);
}
export function signOutUser() {
  return signOut(auth);
}

// Traduz códigos de erro do Firebase Auth para mensagens em PT
export function authErrorMessage(e) {
  const code = e?.code || '';
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/missing-password': 'Digite a senha.',
    'auth/weak-password': 'Senha fraca (mínimo 6 caracteres).',
    'auth/email-already-in-use': 'Este e-mail já tem conta. Use "Entrar".',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/user-not-found': 'Conta não encontrada. Crie uma conta.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/popup-blocked': 'O navegador bloqueou o pop-up de login.',
    'auth/network-request-failed': 'Falha de rede. Verifique a conexão.',
    'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
    'auth/unauthorized-domain': 'Domínio não autorizado no Firebase.',
  };
  return map[code] || ('Não foi possível entrar' + (code ? ` (${code})` : '.'));
}
