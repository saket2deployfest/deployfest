export type UserRole = 'user' | 'admin';

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  username?: string;
  employeeId?: string;
}

export interface AdminCredentials {
  username: string;
  employeeId: string;
}
