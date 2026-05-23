// Node.js script to create the admin Firestore document only
require('dotenv').config({ path: './.env' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

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

async function createAdminDoc() {
  console.log('Adding document to "admin" Firestore collection...');
  try {
    const adminCollection = collection(db, 'admin');
    const docRef = await addDoc(adminCollection, {
      username: 'rito',
      email: 'rito@gmail.com',
      password: 'rito',
      employee_id: 'D001',
      createdAt: new Date(),
    });
    console.log(`✅ Success! Firestore doc created inside "admin" collection. ID: ${docRef.id}`);
    console.log('   Fields populated:');
    console.log('   - username: "rito"');
    console.log('   - email: "rito@gmail.com"');
    console.log('   - password: "rito"');
    console.log('   - employee_id: "D001"');
  } catch (error) {
    console.error('❌ Failed to add document to Firestore:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

createAdminDoc();
