import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabaseAdmin';
import axios from 'axios';

/**
 * API Route: Khởi tạo luồng Đăng nhập một lần (Single Sign-On - SSO)
 * -------------------------------------------------------------
 * KIẾN THỨC PHỎNG VẤN:
 * 1. Cơ chế hoạt động: Khi người dùng click nút "Chỉnh sửa" bài viết trên Central Dashboard,
 *    Next.js gọi tới API Route này kèm ID của website và đường dẫn cần redirect (ví dụ: edit post).
 * 
 * 2. Bảo mật:
 *    - Next.js dùng supabaseAdmin (Service Role Key) để lấy site.url và site.api_key một cách an toàn ở Backend.
 *    - Gửi một request tin cậy (Server-to-Server) đến admin-ajax.php của WordPress để sinh mã Token đăng nhập tạm thời.
 *    - WordPress lưu Token này vào Transient (hết hạn sau 60 giây) và liên kết với User đã kết nối.
 *    - Trả về link đăng nhập nhanh chứa Token:
 *      {site_url}/wp-admin/admin-ajax.php?action=lx_quick_login&token={token}&redirect={target}
 * 
 * 3. Trình duyệt client mở link này trong tab mới, WordPress plugin tự động thiết lập Auth Cookie 
 *    và chuyển hướng thẳng vào trang quản trị WP mà không cần gõ mật khẩu!
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const redirect = searchParams.get('redirect') || '';

    if (!siteId) {
      return NextResponse.json({ error: 'Thiếu ID website vệ tinh' }, { status: 400 });
    }

    // 1. Lấy thông tin site từ database bằng supabaseAdmin (bypass RLS)
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('url, api_key')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin website vệ tinh' }, { status: 404 });
    }

    // 2. Gọi sang WordPress vệ tinh qua admin-ajax.php để xin mã login token dùng 1 lần
    const wpAjaxUrl = `${site.url.replace(/\/$/, '')}/wp-admin/admin-ajax.php`;
    
    const response = await axios.get(wpAjaxUrl, {
      params: {
        action: 'lx_generate_login_token',
        api_key: site.api_key,
      },
      timeout: 10000,
    });

    if (!response.data || !response.data.success) {
      const errMsg = response.data?.data?.message || 'Không thể sinh mã đăng nhập từ website vệ tinh.';
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const { token } = response.data.data;

    // 3. Tạo đường dẫn SSO tự động đăng nhập thông qua Trang chủ (?lx_sso=1) để bypass hoàn toàn WP Cerber
    const ssoUrl = `${site.url.replace(/\/$/, '')}/?lx_sso=1&token=${token}&redirect=${encodeURIComponent(redirect)}`;

    return NextResponse.json({
      success: true,
      ssoUrl: ssoUrl
    });

  } catch (error: any) {
    console.error('Lỗi SSO API:', error.message);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống khởi tạo SSO' }, { status: 500 });
  }
}
