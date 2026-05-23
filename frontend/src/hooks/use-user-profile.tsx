'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { AuthProfile } from '@/types/auth';

export type UserProfile = AuthProfile;

interface UserProfileContextType {
  user: UserProfile | null;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType>({
  user: null,
  loading: true,
});

export const useUserProfile = () => useContext(UserProfileContext);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  return (
    <UserProfileContext.Provider value={{ user, loading }}>
      {children}
    </UserProfileContext.Provider>
  );
};
