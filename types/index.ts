export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'web';

export interface Save {
  id: number;
  url: string;
  title: string;
  imageUrl: string | null;
  siteName: string | null;
  platform: Platform;
  category: string | null;
  note: string | null;
  summary: string | null;
  embedding: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveInput {
  url: string;
  title: string;
  imageUrl?: string | null;
  siteName?: string | null;
  platform: Platform;
  category?: string | null;
  note?: string | null;
  summary?: string | null;
  embedding?: string | null;
}
