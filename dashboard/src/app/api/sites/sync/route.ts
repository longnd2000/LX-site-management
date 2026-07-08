import { NextRequest, NextResponse } from 'next/server';
import { fetchWordPressAPI } from '@/services/api';
import { supabaseAdmin } from '@/services/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { siteId } = await req.json();

    if (!siteId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID website vệ tinh.' },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin site vệ tinh từ Database bằng supabaseAdmin để bypass RLS
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy website vệ tinh hoặc bạn không có quyền truy cập.' },
        { status: 404 }
      );
    }

    // 2. Gọi API của WordPress để lấy danh sách bài viết mới nhất (Kéo tối đa 50 bài viết)
    const wpData = await fetchWordPressAPI(site.url, site.api_key, 'posts', {
      per_page: 50,
      page: 1,
    });

    if (!wpData || !wpData.posts || !Array.isArray(wpData.posts)) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu trả về từ WordPress không hợp lệ.' },
        { status: 500 }
      );
    }

    const postsToInsert = wpData.posts.map((wpPost: any) => ({
      user_id: site.user_id,
      site_id: site.id,
      wp_post_id: wpPost.wp_post_id,
      title: wpPost.title,
      excerpt: wpPost.excerpt || '',
      content: wpPost.content || '',
      url: wpPost.url,
      author_name: wpPost.author_name || '',
      status: wpPost.status || 'publish',
      published_at: wpPost.published_at,
    }));

    if (postsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không tìm thấy bài viết nào trên website vệ tinh để đồng bộ.',
        added_count: 0,
      });
    }

    // 3. Upsert vào bảng posts trong Supabase
    // UNIQUE(site_id, wp_post_id) giúp tránh trùng lặp bài viết
    const { error: upsertError } = await supabaseAdmin
      .from('posts')
      .upsert(postsToInsert, { onConflict: 'site_id,wp_post_id' });

    if (upsertError) {
      console.error('Lỗi khi lưu bài viết vào Supabase:', upsertError);
      throw new Error(`Lỗi cơ sở dữ liệu: ${upsertError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Đồng bộ thành công ${postsToInsert.length} bài viết.`,
      added_count: postsToInsert.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Đã xảy ra lỗi trong quá trình đồng bộ.' },
      { status: 500 }
    );
  }
}
