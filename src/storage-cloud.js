// Operações de jogadas no Firestore, sob users/{uid}/plays/{playId}.
// Cada documento é o JSON da jogada (o mesmo formato salvo localmente).
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './cloud.js';

const playsCol = (uid) => collection(db, 'users', uid, 'plays');

export async function cloudGetAllPlays(uid) {
  const snap = await getDocs(playsCol(uid));
  return snap.docs.map((d) => d.data());
}

export async function cloudSavePlay(uid, play) {
  const stored = JSON.parse(JSON.stringify(play));
  stored.updatedAt = Date.now();
  await setDoc(doc(db, 'users', uid, 'plays', stored.id), stored);
  return stored;
}

export async function cloudDeletePlay(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'plays', id));
}
