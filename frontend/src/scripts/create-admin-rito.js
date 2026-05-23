// Node.js script to create the admin account 'rito@gmail.com'
require('dotenv').config({ path: './.env' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing in your .env file.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function createAdmin() {
  console.log('Creating Firebase Auth user...');
  let userUid = '';
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'rito@gmail.com', 'rito123');
    userUid = userCredential.user.uid;
    console.log(`✅ Auth user created successfully. UID: ${userUid}`);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ Auth user already exists. Proceeding to Firestore check...');
    } else {
      console.error('❌ Failed to create Auth user:', error.message);
      process.exit(1);
    }
  }

  console.log('Creating Firestore document in "admin" collection...');
  try {
    const adminCollection = collection(db, 'admin');
    await addDoc(adminCollection, {
      username: 'rito',
      email: 'rito@gmail.com',
      employee_id: 'D001',
      createdAt: new Date(),
    });
    console.log('✅ Firestore "admin" document created successfully with fields:');
    console.log('   - username: "rito"');
    console.log('   - email: "rito@gmail.com"');
    console.log('   - employee_id: "D001"');
  } catch (error) {
    console.error('❌ Failed to create Firestore document:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Admin account successfully created!');
  process.exit(0);
}

createAdmin();
