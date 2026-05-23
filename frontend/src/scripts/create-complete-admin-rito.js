// Node.js script to create BOTH Firebase Auth and Firestore doc for 'rito'
require('dotenv').config({ path: './.env' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc } = require('firebase/firestore');
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

async function setupAdmin() {
  console.log('1. Creating/Ensuring Firebase Auth user...');
  let userUid = '';
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'rito@gmail.com', 'rito123');
    userUid = userCredential.user.uid;
    console.log(`✅ Auth user created successfully. UID: ${userUid}`);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ Auth user already exists in Firebase Authentication.');
    } else {
      console.error('❌ Failed to create Auth user:', error.message);
      process.exit(1);
    }
  }

  console.log('2. Cleaning up any duplicate admin documents in Firestore...');
  try {
    const adminCollection = collection(db, 'admin');
    const q = query(adminCollection, where('email', '==', 'rito@gmail.com'));
    const snap = await getDocs(q);
    for (const docItem of snap.docs) {
      await deleteDoc(docItem.ref);
      console.log(`🗑️ Deleted existing duplicate Firestore doc: ${docItem.id}`);
    }
  } catch (error) {
    console.warn('⚠️ Could not run cleanup, proceeding anyway:', error.message);
  }

  console.log('3. Seeding new clean document in "admin" collection...');
  try {
    const adminCollection = collection(db, 'admin');
    const docRef = await addDoc(adminCollection, {
      username: 'rito',
      email: 'rito@gmail.com',
      password: 'rito123',
      employee_id: 'D001',
      createdAt: new Date(),
    });
    console.log(`✅ Success! Firestore doc created inside "admin" collection. ID: ${docRef.id}`);
    console.log('\n=======================================');
    console.log('🎉 Operator Account is fully ready for testing!');
    console.log('Use the following details in the login page:');
    console.log('   - Role: Operator (Admin)');
    console.log('   - Username: "rito"');
    console.log('   - Employee ID: "D001"');
    console.log('   - Email: "rito@gmail.com"');
    console.log('   - Password: "rito123" (Note: Firebase Auth requires >= 6 chars)');
    console.log('=======================================');
  } catch (error) {
    console.error('❌ Failed to seed Firestore document:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

setupAdmin();
