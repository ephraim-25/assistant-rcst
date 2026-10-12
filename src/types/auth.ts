export type UserRole = 'admin' | 'reviewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface StoredUserAccount extends User {
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
