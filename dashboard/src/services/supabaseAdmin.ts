import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * TẠI SAO CẦN FILE NÀY? (DÀNH CHO PHỎNG VẤN)
 * -------------------------------------------
 * 1. Khái niệm RLS (Row Level Security): Trong Supabase, chúng ta bật RLS trên bảng 'sites' và 'posts' 
 *    để cô lập dữ liệu theo từng User đăng nhập (chỉ user sở hữu bản ghi đó mới được SELECT/INSERT/UPDATE).
 * 
 * 2. Vấn đề ở Server-Side: Khi chạy các API Route (như /api/sites/sync) hoặc Webhook nhận từ WordPress,
 *    máy chủ Node.js chạy ngầm không có Session JWT của Client. Nếu dùng Anon Key thông thường,
 *    Supabase sẽ coi đây là request ẩn danh (Anonymous) và bị RLS chặn đứng ➜ Trả về 404 hoặc rỗng.
 * 
 * 3. Giải pháp Service Role Key: Chúng ta khởi tạo `supabaseAdmin` sử dụng `SUPABASE_SERVICE_ROLE_KEY`.
 *    Đây là khóa đặc quyền siêu cấp chỉ được phép lưu ở Server-side (.env.local, không có tiền tố NEXT_PUBLIC_).
 *    Khóa này sẽ BYPASS hoàn toàn mọi chính sách RLS, giúp Server-side tương tác trực tiếp với Database.
 * 
 * CẢNH BÁO BẢO MẬT: Tuyệt đối KHÔNG được import file này ở phía Client (component React/Next.js)
 * để tránh làm lộ Service Role Key ra ngoài trình duyệt, làm hacker chiếm quyền toàn bộ database.
 */
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.warn('Cảnh báo: SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong .env.local. Các API Route tự động có thể bị chặn bởi RLS.');
  // Fallback tạm thời về anon key để tránh sập hệ thống (nhưng sẽ bị RLS chặn nếu gọi ẩn danh)
  supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
