// Camada única de jogadas: usa a nuvem (Firestore) quando o usuário está
// logado e o localStorage caso contrário. A UI só conhece esta API.
import * as local from './storage.js';
import { isSignedIn, currentUser } from './cloud.js';
import { cloudGetAllPlays, cloudSavePlay, cloudDeletePlay } from './storage-cloud.js';

export async function listPlays() {
  if (isSignedIn()) return cloudGetAllPlays(currentUser().uid);
  return local.getAllPlays();
}

export async function savePlay(play) {
  if (isSignedIn()) return cloudSavePlay(currentUser().uid, play);
  return local.savePlay(play);
}

export async function removePlay(id) {
  if (isSignedIn()) return cloudDeletePlay(currentUser().uid, id);
  return local.deletePlay(id);
}

// No primeiro login, sobe p/ a nuvem as jogadas locais que ainda não existem lá
// (compara por id). Devolve quantas foram enviadas.
export async function syncLocalToCloud() {
  if (!isSignedIn()) return 0;
  const uid = currentUser().uid;
  const cloud = await cloudGetAllPlays(uid);
  const ids = new Set(cloud.map((p) => p.id));
  let n = 0;
  for (const p of local.getAllPlays()) {
    if (!ids.has(p.id)) { await cloudSavePlay(uid, p); n++; }
  }
  return n;
}
