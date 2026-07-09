import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { url, apiKey } = await req.json();

    if (!url || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ URL và API Key.' },
        { status: 400 }
      );
    }

    const formattedUrl = url.replace(/\/$/, '');
    const wpAjaxUrl = `${formattedUrl}/wp-admin/admin-ajax.php`;

    // Sử dụng URLSearchParams để gửi dữ liệu form URL-encoded cho WP AJAX
    const formData = new URLSearchParams();
    formData.append('action', 'lx_verify');
    formData.append('api_key', apiKey);

    const response = await axios.post(
      wpAjaxUrl,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        site_name: response.data.data?.site_name,
        site_url: response.data.data?.site_url,
        version: response.data.data?.version,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Kiểm tra kết nối thất bại.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Lỗi Test Connection:', error.message);
    
    let errMsg = 'Không thể kết nối đến website vệ tinh.';
    if (error.response) {
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
