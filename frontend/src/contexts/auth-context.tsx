'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  getCachedProfile,
  getCachedToken,
  cacheProfile,
  cacheToken,
  clearAuthCache,
} from '@/lib/auth-cache';
import {
  getIdToken,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  resolveProfileFromFirebaseUser,
} from '@/lib/auth-service';
import type { AdminCredentials, AuthProfile, UserRole } from '@/types/auth';

interface AuthContextType {
  user: AuthProfile | null;
  firebaseUser: User | null;
  token: string | null;
  loading: boolean;
  loginEmail: (
    email: string,
    password: string,
    role: UserRole,
    adminCredentials?: AdminCredentials
  ) => Promise<AuthProfile>;
  loginGoogle: (role: UserRole, adminCredentials?: AdminCredentials) => Promise<AuthProfile>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(() => getCachedProfile());
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getCachedToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedProfile = getCachedProfile();
    const cachedTokenValue = getCachedToken();
    if (cachedProfile) setUser(cachedProfile);
    if (cachedTokenValue) setToken(cachedTokenValue);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        clearAuthCache();
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const freshToken = await fbUser.getIdToken();
        cacheToken(freshToken);
        setToken(freshToken);

        const profile = await resolveProfileFromFirebaseUser(fbUser);
        if (profile) {
          cacheProfile(profile);
          setUser(profile);
        }
      } catch (error) {
        console.error('Auth state sync failed:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginEmail = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      adminCredentials?: AdminCredentials
    ) => {
      const profile = await loginWithEmail(email, password, role, adminCredentials);
      const freshToken = await getIdToken();
      setUser(profile);
      setToken(freshToken);
      return profile;
    },
    []
  );

  const loginGoogle = useCallback(
    async (role: UserRole, adminCredentials?: AdminCredentials) => {
      const profile = await loginWithGoogle(role, adminCredentials);
      const freshToken = await getIdToken();
      setUser(profile);
      setToken(freshToken);
      return profile;
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setFirebaseUser(null);
    setToken(null);
  }, []);

  const refreshToken = useCallback(async () => {
    const freshToken = await getIdToken(true);
    setToken(freshToken);
    return freshToken;
  }, []);

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      token,
      loading,
      loginEmail,
      loginGoogle,
      logout,
      refreshToken,
    }),
    [user, firebaseUser, token, loading, loginEmail, loginGoogle, logout, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
