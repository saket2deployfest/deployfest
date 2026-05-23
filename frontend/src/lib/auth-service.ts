import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { collection, getDocs, limit, query, where, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { cacheProfile, cacheToken, clearAuthCache } from '@/lib/auth-cache';
import type { AdminCredentials, AuthProfile, UserRole } from '@/types/auth';

const googleProvider = new GoogleAuthProvider();

let persistenceReady: Promise<void> | null = null;

function ensurePersistence() {
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  }
  return persistenceReady;
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken(forceRefresh);
  cacheToken(token);
  return token;
}

async function verifyRole(
  firebaseUser: User,
  role: UserRole,
  adminCredentials?: AdminCredentials
): Promise<AuthProfile> {
  const email = firebaseUser.email;
  if (!email) {
    throw new Error('NO_EMAIL');
  }

  if (role === 'user') {
    const userQuery = query(collection(db, 'users'), where('email', '==', email), limit(1));
    const snapshot = await getDocs(userQuery);

    if (snapshot.empty) {
      const newUserDoc = {
        fullName: firebaseUser.displayName || 'Google User',
        email,
        phone: firebaseUser.phoneNumber || '',
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'users'), newUserDoc);
      return {
        id: docRef.id,
        email,
        fullName: newUserDoc.fullName,
        role: 'user',
        phone: newUserDoc.phone,
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      email,
      fullName: data.fullName || firebaseUser.displayName || 'User',
      role: 'user',
      phone: data.phone || '',
    };
  }

  if (!adminCredentials?.username || !adminCredentials?.employeeId) {
    throw new Error('ADMIN_FIELDS_REQUIRED');
  }

  const adminQuery = query(
    collection(db, 'admin'),
    where('email', '==', email),
    where('username', '==', adminCredentials.username),
    where('employee_id', '==', adminCredentials.employeeId),
    limit(1)
  );
  const snapshot = await getDocs(adminQuery);

  if (snapshot.empty) {
    throw new Error('ADMIN_NOT_FOUND');
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    email,
    fullName: data.username || firebaseUser.displayName || 'Admin',
    role: 'admin',
    username: data.username,
    employeeId: data.employee_id,
  };
}

async function finalizeLogin(firebaseUser: User, role: UserRole, adminCredentials?: AdminCredentials) {
  const profile = await verifyRole(firebaseUser, role, adminCredentials);
  const token = await firebaseUser.getIdToken();
  cacheToken(token);
  cacheProfile(profile);
  return profile;
}

export async function loginWithEmail(
  email: string,
  password: string,
  role: UserRole,
  adminCredentials?: AdminCredentials
) {
  await ensurePersistence();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  try {
    return await finalizeLogin(credential.user, role, adminCredentials);
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export async function loginWithGoogle(role: UserRole, adminCredentials?: AdminCredentials) {
  await ensurePersistence();
  const credential = await signInWithPopup(auth, googleProvider);
  try {
    return await finalizeLogin(credential.user, role, adminCredentials);
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export async function signUpWithEmail(
  fullName: string,
  email: string,
  password: string,
  phone: string
) {
  await ensurePersistence();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();
  cacheToken(token);

  const profile: AuthProfile = {
    id: credential.user.uid,
    email,
    fullName,
    role: 'user',
    phone,
  };
  cacheProfile(profile);
  return profile;
}

export async function resolveProfileFromFirebaseUser(firebaseUser: User): Promise<AuthProfile | null> {
  const cached = getCachedProfileSafe();
  if (cached && cached.email === firebaseUser.email) {
    return cached;
  }

  const email = firebaseUser.email;
  if (!email) return null;

  const adminQuery = query(collection(db, 'admin'), where('email', '==', email), limit(1));
  const adminSnapshot = await getDocs(adminQuery);
  if (!adminSnapshot.empty) {
    const doc = adminSnapshot.docs[0];
    const data = doc.data();
    const profile: AuthProfile = {
      id: doc.id,
      email,
      fullName: data.username || firebaseUser.displayName || 'Admin',
      role: 'admin',
      username: data.username,
      employeeId: data.employee_id,
    };
    cacheProfile(profile);
    return profile;
  }

  const userQuery = query(collection(db, 'users'), where('email', '==', email), limit(1));
  const userSnapshot = await getDocs(userQuery);
  if (!userSnapshot.empty) {
    const doc = userSnapshot.docs[0];
    const data = doc.data();
    const profile: AuthProfile = {
      id: doc.id,
      email,
      fullName: data.fullName || firebaseUser.displayName || 'User',
      role: 'user',
      phone: data.phone || '',
    };
    cacheProfile(profile);
    return profile;
  }

  return null;
}

function getCachedProfileSafe(): AuthProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('drishti_auth_profile');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthProfile;
  } catch {
    return null;
  }
}

export async function logoutUser() {
  clearAuthCache();
  await signOut(auth);
}

export function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    USER_NOT_FOUND: 'No user account found. Please sign up first.',
    ADMIN_NOT_FOUND: 'Invalid admin credentials. Check username and employee ID.',
    ADMIN_FIELDS_REQUIRED: 'Username and employee ID are required for admin login.',
    NO_EMAIL: 'Could not retrieve email from your account.',
  };
  return messages[code] || 'Authentication failed. Please try again.';
}
