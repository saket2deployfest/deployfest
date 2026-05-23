require('dotenv').config({ path: './.env' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing. Check your .env file.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─────────────────────────────────────────────
// 16 GUARDS
// ─────────────────────────────────────────────
const guards = [
  { name: 'Arjun Sharma',    sector: 'Main Gate',      status: 'Active',  phone: '9876543201' },
  { name: 'Priya Nair',      sector: 'Food Court',     status: 'Active',  phone: '9876543202' },
  { name: 'Ravi Kumar',      sector: 'Concert Stage',  status: 'Alert',   phone: '9876543203' },
  { name: 'Sunita Reddy',    sector: 'VIP Area',       status: 'Standby', phone: '9876543204' },
  { name: 'Manoj Tiwari',    sector: 'Parking Area',   status: 'Active',  phone: '9876543205' },
  { name: 'Kavitha Rao',     sector: 'Emergency Exit', status: 'Active',  phone: '9876543206' },
  { name: 'Deepak Singh',    sector: 'Main Gate',      status: 'Standby', phone: '9876543207' },
  { name: 'Anjali Mehta',    sector: 'Food Court',     status: 'Active',  phone: '9876543208' },
  { name: 'Rohit Verma',     sector: 'Concert Stage',  status: 'Active',  phone: '9876543209' },
  { name: 'Lakshmi Pillai',  sector: 'VIP Area',       status: 'Active',  phone: '9876543210' },
  { name: 'Sanjay Gupta',    sector: 'Parking Area',   status: 'Alert',   phone: '9876543211' },
  { name: 'Meena Joshi',     sector: 'Emergency Exit', status: 'Active',  phone: '9876543212' },
  { name: 'Vikram Yadav',    sector: 'Main Gate',      status: 'Active',  phone: '9876543213' },
  { name: 'Pooja Iyer',      sector: 'Food Court',     status: 'Standby', phone: '9876543214' },
  { name: 'Arun Patel',      sector: 'Concert Stage',  status: 'Active',  phone: '9876543215' },
  { name: 'Divya Krishnan',  sector: 'VIP Area',       status: 'Active',  phone: '9876543216' },
];

// ─────────────────────────────────────────────
// 5 AMBULANCES
// ─────────────────────────────────────────────
const ambulances = [
  { ambulanceNumber: 'KA-01-AB-1234', driverName: 'Rajesh Kumar',  driverContact: '9876541001', zone: 'Zone A', isAvailable: true  },
  { ambulanceNumber: 'KA-02-CD-5678', driverName: 'Anita Sharma',  driverContact: '9876541002', zone: 'Zone B', isAvailable: false },
  { ambulanceNumber: 'KA-03-EF-9012', driverName: 'Imran Ali',     driverContact: '9876541003', zone: 'Zone C', isAvailable: true  },
  { ambulanceNumber: 'KA-04-GH-3456', driverName: 'Preeti Nair',   driverContact: '9876541004', zone: 'Zone D', isAvailable: false },
  { ambulanceNumber: 'KA-05-IJ-7890', driverName: 'Suresh Reddy',  driverContact: '9876541005', zone: 'Zone E', isAvailable: true  },
];

// ─────────────────────────────────────────────
// 10 MEDICAL STAFF
// ─────────────────────────────────────────────
const medicalStaff = [
  { name: 'Dr. Anjali Verma',    specialization: 'Emergency Medicine', status: 'available', phone: '9876542001' },
  { name: 'Dr. Ramesh Bhat',     specialization: 'General Physician',  status: 'available', phone: '9876542002' },
  { name: 'Nurse Sujata Rao',    specialization: 'Paramedic',          status: 'available', phone: '9876542003' },
  { name: 'Nurse Karan Mehta',   specialization: 'First Aid',          status: 'available', phone: '9876542004' },
  { name: 'Dr. Priya Iyer',      specialization: 'Trauma Care',        status: 'on-duty',   phone: '9876542005' },
  { name: 'Dr. Sunil Kapoor',    specialization: 'Cardiology',         status: 'available', phone: '9876542006' },
  { name: 'Nurse Deepa Pillai',  specialization: 'Paramedic',          status: 'available', phone: '9876542007' },
  { name: 'Dr. Arun Nair',       specialization: 'General Physician',  status: 'on-duty',   phone: '9876542008' },
  { name: 'Nurse Meera Singh',   specialization: 'First Aid',          status: 'available', phone: '9876542009' },
  { name: 'Dr. Kavya Reddy',     specialization: 'Emergency Medicine', status: 'available', phone: '9876542010' },
];

// ─────────────────────────────────────────────
// 1 EMPTY GRIEVANCE (placeholder / test record)
// ─────────────────────────────────────────────
const grievances = [
  {
    type: 'General Grievance',
    details: '',
    status: 'new',
    submittedBy: 'system@test.com',
    email: 'system@test.com',
    actionTaken: '',
  },
];

// ─────────────────────────────────────────────
// SEEDER
// ─────────────────────────────────────────────
async function seedCollection(collectionName, records, labelFn) {
  console.log(`\n📦 Seeding "${collectionName}" (${records.length} records)...`);
  let ok = 0, fail = 0;
  const col = collection(db, collectionName);
  for (const record of records) {
    try {
      await addDoc(col, { ...record, createdAt: serverTimestamp() });
      console.log(`  ✅ Added: ${labelFn(record)}`);
      ok++;
    } catch (err) {
      console.error(`  ❌ Failed: ${labelFn(record)} — ${err.message}`);
      fail++;
    }
  }
  console.log(`  → ${ok} added, ${fail} failed.`);
}

async function main() {
  console.log('🚀 Starting Firestore seed...\n');
  await seedCollection('guards',        guards,       r => `${r.name} [${r.status}]`);
  await seedCollection('ambulances',    ambulances,   r => `${r.ambulanceNumber} (${r.zone})`);
  await seedCollection('medical_staff', medicalStaff, r => `${r.name} — ${r.specialization}`);
  await seedCollection('grievances',    grievances,   r => `${r.type} by ${r.submittedBy}`);
  console.log('\n✨ Seeding complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
