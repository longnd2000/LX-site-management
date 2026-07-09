'use client';

import React, { useState } from 'react';
import { Table, Select, Input, Card, Button, Typography, Space, Tag, Drawer, message, Row, Col, Tooltip } from 'antd';
import {
  ShoppingOutlined,
  SyncOutlined,
  SearchOutlined,
  EyeOutlined,
  ExportOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Product, Site } from '@/types';
import { useProducts } from '@/hooks/useProducts';
import axios from 'axios';

const { Title, Paragraph } = Typography;
const { Option } = Select;

export default function ProductsManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  // State bộ lọc và phân trang
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // State cho xem nhanh sản phẩm
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // State theo dõi sản phẩm đang chuẩn bị đăng nhập nhanh (SSO) để chỉnh sửa
  const [ssoLoadingId, setSsoLoadingId] = useState<string | null>(null);
  const [ssoCreateLoading, setSsoCreateLoading] = useState(false);

  // 1. Fetch danh sách Sites để hiển thị trong Select Filter
  const { data: sites = [] } = useQuery<Pick<Site, 'id' | 'name'>[]>({
    queryKey: ['sitesFilter', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return (data || []) as unknown as Pick<Site, 'id' | 'name'>[];
    },
    enabled: !!user?.id,
  });

  // 2. Sử dụng custom hook useProducts
  const {
    products,
    total,
    isLoading,
    error,
    syncAll,
    isSyncingAll,
    hasWooCommerce,
  } = useProducts({
    userId: user?.id,
    selectedSite,
    searchText,
    currentPage,
    pageSize,
  });

  // Tự động chọn Site đầu tiên trong danh sách nếu chưa chọn site nào
  React.useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Hàm tạo cửa sổ chờ với UI loading mượt mà thay vì tab trắng
  const createLoadingWindow = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html lang="vi">
          <head>
            <title>Đang kết nối an toàn...</title>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
              .spinner { width: 40px; height: 40px; border: 4px solid rgba(255, 255, 255, 0.1); border-left-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <h3>Đang tự động đăng nhập...</h3>
            <p style="color: #94a3b8; font-size: 14px;">Vui lòng đợi trong giây lát</p>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
    return newWindow;
  };

  // Hàm xử lý SSO tự động đăng nhập nhanh vào site vệ tinh và dẫn thẳng tới giao diện Edit bài viết (Sản phẩm là custom post type)
  const handleSSOEdit = async (record: Product) => {
    const newWindow = createLoadingWindow();
    setSsoLoadingId(record.id);
    try {
      const redirectPath = `post.php?post=${record.wp_post_id}&action=edit`;
      const res = await axios.get('/api/sites/sso', {
        params: {
          siteId: record.site_id,
          redirect: redirectPath,
        }
      });
      
      if (res.data && res.data.ssoUrl && newWindow) {
        newWindow.location.href = res.data.ssoUrl;
      } else {
        if (newWindow) newWindow.close();
        message.error('Không thể tạo liên kết đăng nhập tự động.');
      }
    } catch (err: any) {
      if (newWindow) newWindow.close();
      console.error('Lỗi SSO:', err.message);
      message.error(err.response?.data?.error || err.message || 'Lỗi kết nối đăng nhập tự động.');
    } finally {
      setSsoLoadingId(null);
    }
  };

  const handleSSOCreateProduct = async () => {
    if (!selectedSite) {
      message.warning('Vui lòng chọn một website trước khi tạo sản phẩm.');
      return;
    }
    const newWindow = createLoadingWindow();
    setSsoCreateLoading(true);
    try {
      // URL để tạo sản phẩm mới trong WooCommerce là post-new.php?post_type=product
      const redirectPath = `post-new.php?post_type=product`;
      const res = await axios.get('/api/sites/sso', {
        params: {
          siteId: selectedSite,
          redirect: redirectPath,
        }
      });
      
      if (res.data && res.data.ssoUrl && newWindow) {
        newWindow.location.href = res.data.ssoUrl;
      } else {
        if (newWindow) newWindow.close();
        message.error('Không thể tạo liên kết đăng nhập tự động.');
      }
    } catch (err: any) {
      if (newWindow) newWindow.close();
      console.error('Lỗi SSO:', err.message);
      message.error(err.response?.data?.error || err.message || 'Lỗi kết nối đăng nhập tự động.');
    } finally {
      setSsoCreateLoading(false);
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => {
        return (currentPage - 1) * pageSize + index + 1;
      },
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Product) => (
        <div>
          <span className="font-semibold text-slate-200 line-clamp-1">{text}</span>
          <p className="text-xs text-slate-400 m-0 line-clamp-1">
            {record.excerpt ? record.excerpt.replace(/<[^>]*>/g, '') : 'Không có mô tả ngắn'}
          </p>
        </div>
      ),
    },
    {
      title: 'Giá',
      key: 'price',
      align: 'right' as const,
      render: (_: any, record: Product) => {
        if (!record.price && !record.regular_price) return <span className="text-slate-500">-</span>;
        
        return (
          <div className="flex flex-col items-end">
            {record.price ? (
              <span className="text-blue-400 font-medium">
                {Number(record.price).toLocaleString('vi-VN')} ₫
              </span>
            ) : null}
            {record.regular_price && record.regular_price !== record.price ? (
              <span className="text-slate-500 text-xs line-through">
                {Number(record.regular_price).toLocaleString('vi-VN')} ₫
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Kho hàng',
      dataIndex: 'stock_status',
      key: 'stock_status',
      align: 'center' as const,
      render: (status: string) => {
        if (!status) return <span className="text-slate-500">-</span>;
        if (status === 'instock') return <Tag color="green">Còn hàng</Tag>;
        if (status === 'outofstock') return <Tag color="red">Hết hàng</Tag>;
        if (status === 'onbackorder') return <Tag color="orange">Cho đặt trước</Tag>;
        return <Tag color="default">{status}</Tag>;
      },
    },
    {
      title: 'Điểm SEO',
      key: 'seo_score',
      align: 'center' as const,
      render: (_: any, record: Product) => {
        const score = record.yoast_seo_score;
        if (!score) return <span className="text-slate-500">-</span>;
        const num = typeof score === 'string' ? parseInt(score, 10) : score;
        let color = 'default';
        if (num >= 71) color = 'green';
        else if (num >= 41) color = 'orange';
        else if (num > 0) color = 'red';
        return <Tag color={color}>{num}/100</Tag>;
      },
    },
    {
      title: 'Ngày đăng',
      dataIndex: 'published_at',
      key: 'published_at',
      render: (date: string) => new Date(date).toLocaleString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space size="middle">
          <Tooltip title="Xem nhanh nội dung">
            <Button
              type="text"
              icon={<EyeOutlined className="text-slate-300 hover:text-blue-400" />}
              onClick={() => {
                setSelectedProduct(record);
                setIsDrawerOpen(true);
              }}
            />
          </Tooltip>

          <Tooltip title="Xem sản phẩm thực tế (mở tab mới)">
            <a href={record.url} target="_blank" rel="noopener noreferrer">
              <Button
                type="text"
                icon={<ExportOutlined className="text-blue-400 hover:text-blue-500" />}
              />
            </a>
          </Tooltip>

          <Tooltip title="Đăng nhập tự động & Sửa sản phẩm trên WordPress">
            <Button
              type="text"
              icon={<EditOutlined className="text-amber-500 hover:text-amber-600" />}
              loading={ssoLoadingId === record.id}
              onClick={() => handleSSOEdit(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <Title level={3} className="!m-0"><ShoppingOutlined className="text-blue-500 mr-2" />Tổng hợp sản phẩm</Title>
          <Paragraph className="text-slate-500 !m-0">
            Quản lý và tra cứu toàn bộ sản phẩm từ các site vệ tinh. Tổng số: <strong className="text-blue-400">{total}</strong> sản phẩm.
          </Paragraph>
        </div>
        <Space>
          {hasWooCommerce && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={ssoCreateLoading}
              disabled={!selectedSite}
              className="bg-green-600 hover:bg-green-500 border-none h-10"
              onClick={handleSSOCreateProduct}
            >
              Tạo sản phẩm mới
            </Button>
          )}
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={isSyncingAll}
            disabled={!selectedSite}
            className="bg-blue-600 border-none h-10"
            onClick={() => syncAll()}
          >
            Làm mới trang hiện tại
          </Button>
        </Space>
      </div>

      {/* Filter Card */}
      <Card variant="borderless" className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div className="text-xs text-slate-400 font-medium mb-1.5">Lọc theo Website</div>
            <Select
              placeholder="Chọn website vệ tinh"
              className="w-full"
              size="large"
              value={selectedSite}
              onChange={(value) => {
                setSelectedSite(value);
                setCurrentPage(1);
              }}
            >
              {sites.map((site) => (
                <Option key={site.id} value={site.id}>
                  {site.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={16}>
            <div className="text-xs text-slate-400 font-medium mb-1.5">Tìm kiếm sản phẩm</div>
            <Input
              placeholder="Nhập tên sản phẩm cần tìm..."
              prefix={<SearchOutlined className="text-slate-400" />}
              size="large"
              allowClear
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Table Card */}
      <Card variant="borderless" className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
        {!hasWooCommerce ? (
          <div className="py-12 text-center text-slate-400">
            <ShoppingOutlined className="text-4xl text-slate-600 mb-4 block" />
            <div className="text-lg font-medium text-slate-300">Không có sản phẩm nào</div>
            <div>Trang web vệ tinh này không cài đặt plugin WooCommerce.</div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            loading={isLoading}
            locale={{ 
              emptyText: error ? (
                <div className="text-red-400 p-4">{(error as Error).message}</div>
              ) : (
                <span className="text-slate-500">Chưa có sản phẩm nào.</span>
              )
            }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
            scroll={{ x: 1200 }}
            className="custom-table"
          />
        )}
      </Card>

      {/* Drawer xem nhanh chi tiết sản phẩm */}
      <Drawer
        title={
          <div className="flex flex-col gap-1 pr-8">
            <span className="text-lg font-bold text-white line-clamp-2">{selectedProduct?.title}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Đăng lúc: {selectedProduct?.published_at ? new Date(selectedProduct.published_at).toLocaleString('vi-VN') : ''}
              </span>
            </div>
          </div>
        }
        placement="right"
        size="large"
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
        }}
        open={isDrawerOpen}
        extra={
          <a href={selectedProduct?.url} target="_blank" rel="noopener noreferrer">
            <Button type="primary" icon={<ExportOutlined />} className="bg-blue-600 border-none">
              Xem trang gốc
            </Button>
          </a>
        }
      >
        {selectedProduct && (
          <div className="space-y-6 prose prose-invert max-w-none">
            {selectedProduct.excerpt && (
              <div className="p-4 bg-slate-950/60 border-l-4 border-blue-500 rounded-r-xl">
                <span className="text-xs font-semibold text-blue-400 block mb-1 uppercase tracking-wide">Mô tả ngắn:</span>
                <div 
                  className="text-slate-300 italic text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedProduct.excerpt }}
                />
              </div>
            )}
            
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-3 uppercase tracking-wide">Nội dung sản phẩm:</span>
              <div 
                className="text-slate-200 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: selectedProduct.content || 'Không có nội dung.' }}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
