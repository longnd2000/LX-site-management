import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { url, username, password } = await req.json();

    if (!url || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ URL, tài khoản và mật khẩu WordPress.' },
        { status: 400 }
      );
    }

    // 1. Tự động xác định Webhook URL của Next.js dựa trên Host của request
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/webhook`;

    // 2. Chuẩn hóa URL website WordPress và hướng request tới admin-ajax.php
    // TẠI SAO GỌI admin-ajax.php THAY VÌ REST API (/wp-json/)? (DÀNH CHO PHỎNG VẤN)
    // -----------------------------------------------------------
    // Các plugin bảo mật của WordPress (như WP Cerber, Wordfence) mặc định chặn toàn bộ các request ẩn danh
    // gửi tới cổng REST API /wp-json/ và trả về lỗi 403 Forbidden để chống dò quét dữ liệu.
    // Tuy nhiên, họ KHÔNG BAO GIỜ chặn /wp-admin/admin-ajax.php vì đây là cổng xử lý AJAX cốt lõi của WordPress.
    // Việc định tuyến qua admin-ajax.php giúp request bắt tay vượt qua 100% các lớp chặn bảo mật của website vệ tinh.
    const formattedUrl = url.replace(/\/$/, '');
    const wpAuthUrl = `${formattedUrl}/wp-admin/admin-ajax.php`;

    // 3. Dùng URLSearchParams để gửi dưới dạng application/x-www-form-urlencoded (bắt buộc đối với admin-ajax.php)
    // -----------------------------------------------------------
    // WordPress admin-ajax.php mặc định chỉ đọc dữ liệu từ $_POST (Content-Type: application/x-www-form-urlencoded).
    // Nếu gửi JSON body thô (application/json), biến $_POST['action'] sẽ bị rỗng, dẫn đến WordPress
    // không biết phải định tuyến request tới hook nào và trả về lỗi 400 Bad Request ngay lập tức.
    // Sử dụng URLSearchParams đảm bảo dữ liệu được mã hóa chuẩn form URL-encoded.
    const formData = new URLSearchParams();
    formData.append('action', 'lx_authorize'); // Tham số action bắt buộc để WordPress ánh xạ tới hook wp_ajax_nopriv_lx_authorize
    formData.append('username', username);
    formData.append('password', password);
    formData.append('webhook_url', webhookUrl);

    const response = await axios.post(
      wpAuthUrl,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 12000, // Timeout 12 giây để xử lý trong trường hợp mạng local chậm
      }
    );

    if (response.data && response.data.success) {
      // wp_send_json_success trả về cấu trúc { success: true, data: { ... } }
      const authData = response.data.data;
      return NextResponse.json({
        success: true,
        api_key: authData.api_key,
        site_name: authData.site_name,
        site_url: authData.site_url,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Không nhận được dữ liệu xác thực hợp lệ từ WordPress.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Lỗi Verify & Authorize Site:', error.message);
    
    let errMsg = 'Không thể kết nối đến website vệ tinh.';
    if (error.response) {
      // Lỗi trả về từ server WordPress (wp_send_json_error trả về dạng { success: false, data: { message: '...' } })
      const resData = error.response.data;
      errMsg = resData?.data?.message || resData?.message || `Lỗi WordPress: ${error.response.statusText}`;
    } else if (error.code === 'ECONNABORTED') {
      errMsg = 'Kết nối tới WordPress bị quá hạn (Timeout).';
    } else {
      errMsg = error.message;
    }

    return NextResponse.json(
      { success: false, message: errMsg },
      { status: 500 }
    );
  }
}
