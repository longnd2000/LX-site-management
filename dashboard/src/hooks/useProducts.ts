import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product } from '@/types';
import axios from 'axios';
import { message } from 'antd';

interface UseProductsOptions {
  userId?: string;
  selectedSite: string | null;
  searchText: string;
  currentPage: number;
  pageSize: number;
}

export function useProducts({ userId, selectedSite, searchText, currentPage, pageSize }: UseProductsOptions) {
  const queryClient = useQueryClient();

  // 1. Query danh sách sản phẩm từ Next.js API (Proxy tới WP API)
  const { data: { products = [], total = 0 } = {}, isLoading, isFetching, error } = useQuery<{ products: Product[]; total: number }>({
    queryKey: ['products', userId, selectedSite, currentPage, pageSize],
    queryFn: async () => {
      if (!userId || !selectedSite) return { products: [], total: 0 };

      try {
        const res = await axios.get('/api/sites/products', {
          params: {
            siteId: selectedSite,
            page: currentPage,
            perPage: pageSize,
          }
        });

        if (res.data && res.data.success) {
          let fetchedProducts = res.data.products || [];
          
          if (searchText) {
            fetchedProducts = fetchedProducts.filter((p: Product) => 
              p.title.toLowerCase().includes(searchText.toLowerCase())
            );
          }

          return {
            products: fetchedProducts,
            total: res.data.total_posts || 0,
          };
        }
        
        throw new Error(res.data?.message || 'Lỗi khi lấy dữ liệu sản phẩm');
      } catch (err: any) {
        console.error('Error fetching products:', err);
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
        queryKey: ['products', userId, selectedSite, currentPage, pageSize] 
      });
      message.success('Đã làm mới dữ liệu sản phẩm thành công!');
    } catch (err) {
      message.error('Có lỗi xảy ra khi làm mới sản phẩm.');
    }
  };

  return {
    products,
    total,
    isLoading,
    error,
    isSyncingAll: isFetching,
    syncAll: refreshManual,
  };
}
