export type UserRole = 'oyente' | 'narrador' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  token?: string; 
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}