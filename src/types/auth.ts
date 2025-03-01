
export type UserRole = 'Admin' | 'Collaborator' | 'Client';

export interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}
