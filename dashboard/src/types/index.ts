export interface Site {
  id: string;
  user_id: string;
  name: string;
  url: string;
  api_key: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  site_id: string;
  wp_post_id: number;
  title: string;
  excerpt: string | null;
  content: string | null;
  url: string;
  author_name: string | null;
  status: string;
  published_at: string;
  created_at: string;
  sites?: {
    name: string;
    url: string;
  };
}

export interface Product extends Post {
  price?: string | number;
  regular_price?: string | number;
  stock_status?: string;
  yoast_seo_score?: string | number;
  yoast_readability_score?: string | number;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  added_count: number;
}
