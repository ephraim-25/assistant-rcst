export type UserRole = 'admin' | 'reviewer';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  createdAt: string;
  avatarUrl?: string;
  affiliation?: string;
  specialty?: string;
  status: UserStatus;
  auditsCount: number;
}

export interface StoredUserAccount extends User {
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface UserProfileUpdateData {
  name: string;
  email: string;
  affiliation?: string;
  specialty?: string;
  password?: string;
}

export interface AdminCreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  affiliation?: string;
  specialty?: string;
  title?: string;
}
