import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(baseURL!);
  await page.waitForFunction(() => 'firebaseAuth' in window);

  await page.evaluate(async () => {
    // @ts-ignore
    const auth = window.firebaseAuth;
    // @ts-ignore
    const db = window.firebaseDb;
    // @ts-ignore
    const createUser = window.createUserWithEmailAndPassword;
    // @ts-ignore
    const signIn = window.signInWithEmailAndPassword;
    // @ts-ignore
    const setDoc = window.setDoc;
    // @ts-ignore
    const doc = window.doc;

    const createOrUpdateUser = async (email: string, password: string, displayName: string, role: string, mestreId: string | null = null) => {
      let userCredential;
      try {
        userCredential = await createUser(auth, email, password);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          userCredential = await signIn(auth, email, password);
        } else {
          throw error;
        }
      }
      
      const uid = userCredential.user.uid;
      const docData: any = {
        uid,
        email,
        displayName,
        role,
        createdAt: Date.now(),
      };
      if (mestreId) {
        docData.mestreId = mestreId;
      }
      
      await setDoc(doc(db, 'users', uid), docData);
      return uid;
    };

    const password = 'playwrighttest';
    
    // 1. Mestre
    const mestreUid = await createOrUpdateUser('mestre@ogirador.com', password, 'Playwright Mestre', 'mestre');
    
    // 2. Eleve Group
    await createOrUpdateUser('eleve-group@ogirador.com', password, 'Playwright Eleve Group', 'eleve', mestreUid);
    
    // 3. Eleve Lambda
    await createOrUpdateUser('eleve-lambda@ogirador.com', password, 'Playwright Eleve Lambda', 'eleve', 'fake_mestre_id_999');
    
    // 4. Free user (membre)
    await createOrUpdateUser('free@ogirador.com', password, 'Playwright Membre Gratuit', 'membre');

    // 5. Default user (keep for compatibility with existing tests)
    await createOrUpdateUser('playwright@ogirador.com', password, 'Playwright Membre', 'membre');
    
    // Wait for auth state to be persisted to IndexedDB
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // Save storage state (IndexedDB and LocalStorage)
  await page.context().storageState({ path: 'e2e/storageState.json' });
  await browser.close();
}

export default globalSetup;
