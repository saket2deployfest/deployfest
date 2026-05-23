import type { AuthProfile } from '@/types/auth';

const TOKEN_KEY = 'drishti_auth_token';
const TOKEN_EXP_KEY = 'drishti_auth_token_exp';
const PROFILE_KEY = 'drishti_auth_profile';

const TOKEN_TTL_MS = 55 * 60 * 1000; // refresh before Firebase 1h expiry

let memoryToken: { token: string; expiresAt: number } | null = null;
let memoryProfile: AuthProfile | null = null;

export function cacheProfile(profile: AuthProfile) {
  memoryProfile = profile;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

export function getCachedProfile(): AuthProfile | null {
  if (memoryProfile) return memoryProfile;
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    memoryProfile = JSON.parse(raw) as AuthProfile;
    return memoryProfile;
  } catch {
    return null;
  }
}

export function cacheToken(token: string) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  memoryToken = { token, expiresAt };
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXP_KEY, String(expiresAt));
  }
}

export function getCachedToken(): string | null {
  const now = Date.now();
  if (memoryToken && memoryToken.expiresAt > now) {
    return memoryToken.token;
  }
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  const exp = sessionStorage.getItem(TOKEN_EXP_KEY);
  if (!token || !exp) return null;
  if (Number(exp) <= now) return null;
  memoryToken = { token, expiresAt: Number(exp) };
  return token;
}

export function clearAuthCache() {
  memoryToken = null;
  memoryProfile = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXP_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
  }
}
