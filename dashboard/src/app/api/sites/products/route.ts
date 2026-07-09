import { NextRequest, NextResponse } from 'next/server';
import { fetchWordPressAPI } from '@/services/api';
import { supabaseAdmin } from '@/services/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '20', 10);

    if (!siteId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID website vệ tinh.' },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin site vệ tinh từ Database bằng supabaseAdmin
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

    // 2. Gọi API của WordPress để lấy danh sách sản phẩm theo phân trang
    // Gọi action `lx_get_products`
    const wpData = await fetchWordPressAPI(site.url, site.api_key, 'products', {
      per_page: perPage,
      page: page,
    });

    // API WP trả về mảng sản phẩm trong trường `posts`
    if (!wpData || !wpData.posts || !Array.isArray(wpData.posts)) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu trả về từ WordPress không hợp lệ.' },
        { status: 500 }
      );
    }

    // 3. Format lại data để trả về Frontend tương thích
    const formattedProducts = wpData.posts.map((wpPost: any) => ({
      id: `${site.id}-${wpPost.wp_post_id}`, // Fake UUID for table rowKey
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
      price: wpPost.price,
      regular_price: wpPost.regular_price,
      stock_status: wpPost.stock_status,
      yoast_seo_score: wpPost.yoast_seo_score,
      yoast_readability_score: wpPost.yoast_readability_score,
      sites: {
        name: site.name,
        url: site.url
      }
    }));

    // Bỏ qua bước Upsert database Supabase cho Product để tránh lỗi nếu chưa có bảng products

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      total_posts: parseInt(wpData.total_posts || '0', 10),
      total_pages: parseInt(wpData.total_pages || '0', 10),
      current_page: page,
      per_page: perPage
    });
  } catch (error: any) {
    if (error.message && error.message.includes('không cài đặt WooCommerce')) {
      return NextResponse.json({
        success: true,
        products: [],
        total_posts: 0,
        total_pages: 0,
        current_page: page,
        per_page: perPage,
        hasWooCommerce: false
      });
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Đã xảy ra lỗi khi lấy dữ liệu sản phẩm.' },
      { status: 500 }
    );
  }
}
