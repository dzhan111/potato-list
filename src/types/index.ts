export interface User {
  id: string;
  email?: string;
  avatar_url?: string;
  username?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface BucketListItem {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  created_by: string;
  is_public: boolean;
  creator?: {
    username: string;
    avatar_url?: string;
  };
  completions?: Completion[];
}

export interface Completion {
  id: string;
  photo_url: string;
  completed_at: string;
  user_id: string;
  bucket_list_item_id: string;
  profiles?: Profile;
  bucket_list_items?: BucketListItem;
} 