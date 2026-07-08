import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Post, Site } from '@/types';
import { message } from 'antd';
import axios from 'axios';

interface UsePostsOptions {
  userId?: string;
  selectedSite: string | null;
  searchText: string;
  currentPage: number;
  pageSize: number;
}

export function usePosts({ userId, selectedSite, searchText, currentPage, pageSize }: UsePostsOptions) {
  const queryClient = useQueryClient();

  // 1. Query danh sách bài viết
  const { data: { posts = [], total = 0 } = {}, isLoading } = useQuery<{ posts: Post[]; total: number }>({
    queryKey: ['posts', userId, selectedSite, searchText, currentPage, pageSize],
    queryFn: async () => {
      if (!userId) return { posts: [], total: 0 };

      let query = supabase
        .from('posts')
        .select(`
          id,
          wp_post_id,
          title,
          excerpt,
          content,
          url,
          author_name,
          status,
          published_at,
          created_at,
          site_id,
          sites (
            name,
            url
          )
        `, { count: 'exact' })
        .eq('user_id', userId);

      if (selectedSite) {
        query = query.eq('site_id', selectedSite);
      }

      if (searchText) {
        query = query.ilike('title', `%${searchText}%`);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        posts: (data || []) as unknown as Post[],
        total: count || 0,
      };
    },
    enabled: !!userId,
  });

  // 2. Mutation đồng bộ toàn bộ các sites
  const syncAllMutation = useMutation({
    mutationFn: async (sitesList: Pick<Site, 'id' | 'name'>[]) => {
      if (sitesList.length === 0) return [];

      const promises = sitesList.map((site) =>
        axios
          .post('/api/sites/sync', { siteId: site.id })
          .then((res) => ({ siteName: site.name, success: true, count: res.data.added_count }))
          .catch((err) => ({
            siteName: site.name,
            success: false,
            error: err.response?.data?.message || err.message,
          }))
      );

      return Promise.all(promises);
    },
    onSuccess: (results) => {
      const successCount = results
        .filter((r) => r.success)
        .reduce((acc, cur: any) => acc + cur.count, 0);
      const errors = results.filter((r) => !r.success);

      message.success(`Làm mới hoàn tất! Đã cập nhật thêm ${successCount} bài viết.`);
      if (errors.length > 0) {
        errors.forEach((err: any) => {
          message.warning(`Không thể làm mới ${err.siteName}: ${err.error}`);
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['posts', userId] });
      queryClient.invalidateQueries({ queryKey: ['postsCount', userId] });
      queryClient.invalidateQueries({ queryKey: ['recentPosts', userId] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Có lỗi xảy ra khi làm mới bài viết.');
    },
  });

  return {
    posts,
    total,
    isLoading,
    syncAll: syncAllMutation.mutate,
    isSyncingAll: syncAllMutation.isPending,
  };
}
