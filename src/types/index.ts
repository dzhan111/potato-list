export interface User {
  id: string;
  email: string;
  avatar_url?: string;
  username?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Completion {
  id: string;
  photo_url: string;
  completed_at: string;
  profiles?: Profile;
}

export interface BucketListItem {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  created_by: string;
  is_public: boolean;
  completions?: Completion[];
} 