import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Post } from '@/types';
import axios from 'axios';
import { message } from 'antd';

interface UsePostsOptions {
  userId?: string;
  selectedSite: string | null;
  searchText: string;
  currentPage: number;
  pageSize: number;
}

export function usePosts({ userId, selectedSite, searchText, currentPage, pageSize }: UsePostsOptions) {
  const queryClient = useQueryClient();

  // 1. Query danh sách bài viết từ Next.js API (Proxy tới WP API)
  const { data: { posts = [], total = 0 } = {}, isLoading, isFetching } = useQuery<{ posts: Post[]; total: number }>({
    queryKey: ['posts', userId, selectedSite, currentPage, pageSize],
    queryFn: async () => {
      if (!userId || !selectedSite) return { posts: [], total: 0 };

      try {
        const res = await axios.get('/api/sites/posts', {
          params: {
            siteId: selectedSite,
            page: currentPage,
            perPage: pageSize,
          }
        });

        if (res.data && res.data.success) {
          let fetchedPosts = res.data.posts || [];
          
          // Lọc nội bộ nếu có searchText (do WP REST mặc định không lọc theo search nếu ta tự custom endpoint, 
          // nhưng nếu cần có thể truyền param search lên WP API sau. Tạm thời lọc local)
          if (searchText) {
            fetchedPosts = fetchedPosts.filter((p: Post) => 
              p.title.toLowerCase().includes(searchText.toLowerCase())
            );
          }

          return {
            posts: fetchedPosts,
            total: res.data.total_posts || 0,
          };
        }
        
        throw new Error(res.data?.message || 'Lỗi khi lấy dữ liệu bài viết');
      } catch (err: any) {
        console.error('Error fetching posts:', err);
        throw err;
      }
    },
    enabled: !!userId && !!selectedSite,
  });

  // 2. Hàm làm mới thủ công trang hiện tại
  const refreshManual = async () => {
    if (!selectedSite) {
      message.warning('Vui lòng chọn website trước khi làm mới.');
      return;
    }
    
    try {
      await queryClient.invalidateQueries({ 
        queryKey: ['posts', userId, selectedSite, currentPage, pageSize] 
      });
      message.success('Đã làm mới dữ liệu bài viết thành công!');
    } catch (err) {
      message.error('Có lỗi xảy ra khi làm mới bài viết.');
    }
  };

  return {
    posts,
    total,
    isLoading,
    isSyncingAll: isFetching,
    syncAll: refreshManual,
  };
}
