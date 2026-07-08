import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-lx-api-key');
    const payload = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Không tìm thấy API Key xác thực' }, { status: 401 });
    }

    const { event, site_url, wp_post_id, title, excerpt, content, url, author_name, published_at, status } = payload;

    if (!site_url || !wp_post_id || !title) {
      return NextResponse.json({ error: 'Dữ liệu không đầy đủ' }, { status: 400 });
    }

    // 1. Xác thực bằng cách tìm site có api_key khớp
    // Chúng ta cần chuẩn hóa URL để so sánh chính xác (bỏ trailing slash)
    const normalizedUrl = site_url.replace(/\/$/, '');

    // Truy vấn Supabase để tìm site có API Key trùng khớp bằng supabaseAdmin để bypass RLS
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, user_id, url, api_key')
      .eq('api_key', apiKey)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'API Key không hợp lệ hoặc site chưa được đăng ký' }, { status: 403 });
    }

    // Kiểm tra thêm URL (tùy chọn nhưng an toàn)
    const siteDbUrl = site.url.replace(/\/$/, '');
    if (siteDbUrl !== normalizedUrl) {
      console.warn(`Cảnh báo: URL site gửi webhook (${normalizedUrl}) không khớp hoàn toàn với URL đăng ký (${siteDbUrl})`);
    }

    // 2. Chèn hoặc cập nhật bài viết trong Supabase (Upsert)
    const postData = {
      user_id: site.user_id,
      site_id: site.id,
      wp_post_id: wp_post_id,
      title: title,
      excerpt: excerpt || '',
      content: content || '',
      url: url,
      author_name: author_name || '',
      status: status || 'publish',
      published_at: published_at || new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from('posts')
      .upsert(postData, { onConflict: 'site_id,wp_post_id' });

    if (upsertError) {
      console.error('Lỗi khi lưu bài viết từ Webhook:', upsertError);
      return NextResponse.json({ error: `Không thể lưu bài viết: ${upsertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Nhận dữ liệu webhook thành công và đã cập nhật bài viết.',
    }, { status: 200 });

  } catch (error: any) {
    console.error('Lỗi Webhook API:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
