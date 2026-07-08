import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Site } from '@/types';
import { message } from 'antd';
import axios from 'axios';

export function useSites(userId?: string) {
  const queryClient = useQueryClient();

  // 1. Query lấy danh sách sites
  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ['sites', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // 2. Mutation thêm site mới (bắt tay tự động)
  const addSiteMutation = useMutation({
    mutationFn: async (values: { url: string; username: string; password: string; name?: string }) => {
      if (!userId) throw new Error('Chưa đăng nhập');

      // Gửi thông tin đăng nhập sang WP để sinh API Key và lưu Webhook URL
      const authRes = await axios.post('/api/sites/verify', {
        url: values.url,
        username: values.username,
        password: values.password,
      });

      if (!authRes.data.success) {
        throw new Error(authRes.data.message || 'Xác thực kết nối thất bại');
      }

      const { api_key, site_name, site_url } = authRes.data;

      // Lưu thông tin site vào Supabase kèm API Key nhận được
      const { data, error } = await supabase
        .from('sites')
        .insert({
          user_id: userId,
          name: values.name || site_name || 'Website vệ tinh',
          url: site_url || values.url.replace(/\/$/, ''),
          api_key: api_key,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newSite) => {
      message.success(`Đã kết nối thành công website: ${newSite.name}`);
      queryClient.invalidateQueries({ queryKey: ['sites', userId] });
      queryClient.invalidateQueries({ queryKey: ['sitesCount', userId] });
      
      // Kích hoạt đồng bộ bài viết lần đầu
      syncSiteMutation.mutate(newSite.id);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'Không thể kết nối đến website.');
    },
  });

  // 3. Mutation đồng bộ bài viết
  const syncSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const res = await axios.post('/api/sites/sync', { siteId });
      return res.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'Làm mới bài viết thành công.');
      queryClient.invalidateQueries({ queryKey: ['postsCount', userId] });
      queryClient.invalidateQueries({ queryKey: ['recentPosts', userId] });
      queryClient.invalidateQueries({ queryKey: ['posts', userId] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'Làm mới thất bại.');
    },
  });

  // 4. Mutation kiểm tra kết nối bằng API Key
  const testConnectionMutation = useMutation({
    mutationFn: async (record: Site) => {
      const res = await axios.post('/api/sites/verify', {
        url: record.url,
        apiKey: record.api_key,
      });
      return res.data;
    },
    onSuccess: (data, record) => {
      message.success(`Kết nối tới ${record.name} hoạt động tốt.`);
    },
    onError: (err: any, record) => {
      message.error(`Kết nối tới ${record.name} thất bại: ${err.response?.data?.message || err.message}`);
    },
  });

  // 5. Mutation xóa site
  const deleteSiteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success('Đã xóa website vệ tinh và các bài viết liên quan.');
      queryClient.invalidateQueries({ queryKey: ['sites', userId] });
      queryClient.invalidateQueries({ queryKey: ['sitesCount', userId] });
      queryClient.invalidateQueries({ queryKey: ['postsCount', userId] });
      queryClient.invalidateQueries({ queryKey: ['recentPosts', userId] });
      queryClient.invalidateQueries({ queryKey: ['posts', userId] });
    },
    onError: (err: any) => {
      message.error(`Lỗi khi xóa: ${err.message}`);
    },
  });

  return {
    sites,
    isLoading,
    addSite: addSiteMutation.mutate,
    isAdding: addSiteMutation.isPending,
    syncSite: syncSiteMutation.mutate,
    isSyncing: syncSiteMutation.isPending,
    syncVariables: syncSiteMutation.variables,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    testVariables: testConnectionMutation.variables,
    deleteSite: deleteSiteMutation.mutate,
    isDeleting: deleteSiteMutation.isPending,
  };
}
