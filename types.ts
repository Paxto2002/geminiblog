export interface Profile {
  id: string;
  name: string;
  email?: string; // Email is on auth.users, but can be joined
  image?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user: Profile;
  text: string;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  summary: string;
  author: Profile;
  created_at: string;
  comments?: Comment[];
}