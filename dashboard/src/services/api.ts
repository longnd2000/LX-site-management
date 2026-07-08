import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function để gọi trực tiếp WordPress API (chỉ dùng ở Server-side hoặc API Routes để tránh CORS)
export const fetchWordPressAPI = async (siteUrl: string, apiKey: string, endpoint: string, params = {}) => {
  const formattedUrl = siteUrl.replace(/\/$/, ''); // Xóa slash cuối nếu có
  
  // TẠI SAO DÙNG admin-ajax.php KHI LẤY BÀI VIẾT? (DÀNH CHO PHỎNG VẤN)
  // Các plugin bảo mật như WP Cerber chặn mọi kết nối đến REST API /wp-json/ ẩn danh từ bên ngoài.
  // Định tuyến qua admin-ajax.php giúp vượt qua các bộ lọc chặn này một cách an toàn.
  const url = `${formattedUrl}/wp-admin/admin-ajax.php`;
  
  try {
    const response = await axios.get(url, {
      params: {
        action: `lx_get_${endpoint}`, // ví dụ: lx_get_posts
        api_key: apiKey,
        ...params,
      },
      timeout: 12000, // Timeout 12 giây
    });

    if (response.data && response.data.success) {
      // wp_send_json_success trả về dữ liệu bọc trong trường data
      return response.data.data;
    }
    
    throw new Error(response.data?.data?.message || response.data?.message || 'Không thể lấy dữ liệu từ WordPress.');
  } catch (error: any) {
    console.error(`Lỗi khi kết nối tới WordPress AJAX API tại ${url}:`, error.message);
    const detailMsg = error.response?.data?.data?.message || error.response?.data?.message || error.message;
    throw new Error(`Không thể kết nối đến website vệ tinh: ${detailMsg}`);
  }
};
