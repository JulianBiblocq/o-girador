import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(baseURL!);

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

    const email = 'playwright@ogirador.com';
    const password = 'playwrighttest';

    let userCredential;
    try {
      userCredential = await createUser(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        userCredential = await signIn(auth, email, password);
        console.log('Test user signed in');
      } else {
        throw error;
      }
    }
    
    // Always ensure the user document exists and has the correct role
    if (userCredential && userCredential.user) {
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email,
        displayName: 'Playwright Membre',
        role: 'membre',
        createdAt: Date.now(),
      });
      console.log('Test user doc updated');
    }

    
    // Wait for auth state to be persisted to IndexedDB (Firebase Auth does this automatically)
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // Save storage state (IndexedDB and LocalStorage)
  await page.context().storageState({ path: 'e2e/storageState.json' });
  await browser.close();
}

export default globalSetup;
