/**
 * scripts/push-gabarits-to-firestore.mjs
 * 
 * Pousse directement les gabarits de mes-gabarits-batuque.json
 * dans le profil Firestore de l'utilisateur iA0SweEHyOPzAPGIDVZdeKAV2mk1
 */
import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const JULIAN_UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';

const firebaseConfig = {
  apiKey: "AIzaSyCTvRPj2p3zdIfEjftXoSvRJ43Uy0EfPMY",
  authDomain: "o-girador-7828c.firebaseapp.com",
  projectId: "o-girador-7828c",
  storageBucket: "o-girador-7828c.firebasestorage.app",
  messagingSenderId: "488703864701",
  appId: "1:488703864701:web:50b8cbcd1ca4038e15e614"
};

function cleanPayload(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanPayload);
  if (typeof obj === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanPayload(v);
      }
    }
    return res;
  }
  return obj;
}

async function main() {
  console.log('🚀 Démarrage injection gabarits de secours pour UID:', JULIAN_UID);
  const filePath = path.resolve('mes-gabarits-batuque.json');
  if (!fs.existsSync(filePath)) {
    console.error('Fichier introuvable:', filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const templates = JSON.parse(raw);
  console.log(`Lu ${templates.length} gabarits depuis mes-gabarits-batuque.json :`, templates.map(t => t.name));

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const userRef = doc(db, 'users', JULIAN_UID);
  try {
    const existingSnap = await getDoc(userRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : {};
    const existingTpls = existingData.workspaceTemplates || [];
    console.log(`Gabarits déjà présents sur /users/${JULIAN_UID}:`, existingTpls.length);

    const map = new Map();
    existingTpls.forEach(t => map.set(t.id, t));
    templates.forEach(t => map.set(t.id, t));
    const merged = Array.from(map.values());

    const cleanList = cleanPayload(merged);
    await setDoc(userRef, { workspaceTemplates: cleanList }, { merge: true });
    console.log(`✅ Succès ! ${merged.length} gabarits enregistrés sur Firestore (/users/${JULIAN_UID}/workspaceTemplates).`);
  } catch (err) {
    console.warn(`⚠️ Écriture directe Node Firestore non autorisée sans session interactive (attendu si client non authentifié) :`, err.message);
    console.log(`ℹ️ Les gabarits sont pré-chargés en local et seront auto-migrés dès la connexion de Julian sur localhost.`);
  }
}

main().catch(console.error);
