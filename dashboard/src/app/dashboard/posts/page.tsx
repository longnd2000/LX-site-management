'use client';

import React, { useState } from 'react';
import { Table, Select, Input, Card, Button, Typography, Space, Tag, Drawer, message, Row, Col, Tooltip } from 'antd';
import {
  FileTextOutlined,
  SyncOutlined,
  SearchOutlined,
  GlobalOutlined,
  EyeOutlined,
  ExportOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Post, Site } from '@/types';
import { usePosts } from '@/hooks/usePosts';
import axios from 'axios';

const { Title, Paragraph } = Typography;
const { Option } = Select;

export default function PostsManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  // State bộ lọc và phân trang
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // State cho xem nhanh bài viết
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // State theo dõi bài viết đang chuẩn bị đăng nhập nhanh (SSO) để chỉnh sửa
  const [ssoLoadingId, setSsoLoadingId] = useState<string | null>(null);
  const [ssoCreateLoading, setSsoCreateLoading] = useState(false);

  // 1. Fetch danh sách Sites để hiển thị trong Select Filter (Sử dụng trực tiếp trong component hoặc có thể tách)
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

  // 2. Sử dụng custom hook usePosts để lấy danh sách bài viết và mutation đồng bộ
  const {
    posts,
    total,
    isLoading,
    syncAll,
    isSyncingAll,
  } = usePosts({
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
              h2 { font-weight: 500; font-size: 1.25rem; margin: 0; letter-spacing: 0.5px; }
              p { color: #94a3b8; font-size: 0.875rem; margin-top: 8px; }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <h2>Đang thiết lập kết nối an toàn...</h2>
            <p>Vui lòng đợi trong giây lát để tự động đăng nhập vào website.</p>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
    return newWindow;
  };

  // Hàm xử lý SSO tự động đăng nhập nhanh vào site vệ tinh và dẫn thẳng tới giao diện Edit bài viết
  const handleSSOEdit = async (record: Post) => {
    // Mở tab mới với giao diện chờ
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

  const handleSSOCreatePost = async () => {
    if (!selectedSite) {
      message.warning('Vui lòng chọn một website trước khi tạo bài viết.');
      return;
    }
    // Mở tab mới với giao diện chờ
    const newWindow = createLoadingWindow();
    setSsoCreateLoading(true);
    try {
      const redirectPath = `post-new.php`;
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
      title: 'Tiêu đề bài viết',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Post) => (
        <div>
          <span className="font-semibold text-slate-200 line-clamp-1">{text}</span>
          <p className="text-xs text-slate-400 m-0 line-clamp-1">
            {record.excerpt ? record.excerpt.replace(/<[^>]*>/g, '') : 'Không có mô tả ngắn'}
          </p>
        </div>
      ),
    },

    {
      title: 'Tác giả',
      dataIndex: 'author_name',
      key: 'author',
      render: (text: string) => text || 'Ẩn danh',
    },
    {
      title: 'Ngày đăng',
      dataIndex: 'published_at',
      key: 'published_at',
      render: (date: string) => new Date(date).toLocaleString('vi-VN'),
    },
    {
      title: 'Điểm SEO',
      key: 'seo_score',
      align: 'center' as const,
      render: (_: any, record: any) => {
        const score = record.yoast_seo_score;
        if (!score) return <span className="text-slate-500">-</span>;
        const num = parseInt(score, 10);
        let color = 'default';
        if (num >= 71) color = 'green';
        else if (num >= 41) color = 'orange';
        else if (num > 0) color = 'red';
        return <Tag color={color}>{num}/100</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Post) => (
        <Space size="middle">
          <Tooltip title="Xem nhanh nội dung">
            <Button
              type="text"
              icon={<EyeOutlined className="text-slate-300 hover:text-blue-400" />}
              onClick={() => {
                setSelectedPost(record);
                setIsDrawerOpen(true);
              }}
            />
          </Tooltip>

          <Tooltip title="Xem bài viết thực tế (mở tab mới)">
            <a href={record.url} target="_blank" rel="noopener noreferrer">
              <Button
                type="text"
                icon={<ExportOutlined className="text-blue-400 hover:text-blue-500" />}
              />
            </a>
          </Tooltip>

          <Tooltip title="Đăng nhập tự động & Sửa bài trên WordPress">
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
          <Title level={3} className="!m-0"><FileTextOutlined className="text-blue-500 mr-2" />Tổng hợp bài viết</Title>
          <Paragraph className="text-slate-500 !m-0">
            Quản lý và tra cứu toàn bộ bài viết từ các site vệ tinh. Tổng số: <strong className="text-blue-400">{total}</strong> bài viết.
          </Paragraph>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={ssoCreateLoading}
            disabled={!selectedSite}
            className="bg-emerald-600 hover:!bg-emerald-500 border-none h-10"
            onClick={handleSSOCreatePost}
          >
            Tạo bài viết mới
          </Button>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={isSyncingAll}
            disabled={!selectedSite}
            className="bg-blue-600 hover:!bg-blue-500 border-none h-10"
            onClick={() => syncAll()}
          >
            Làm mới
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
            <div className="text-xs text-slate-400 font-medium mb-1.5">Tìm kiếm bài viết</div>
            <Input
              placeholder="Nhập tiêu đề bài viết cần tìm..."
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
        <Table
          columns={columns}
          dataSource={posts}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: <span className="text-slate-500">Chưa có bài viết nào.</span> }}
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
        />
      </Card>

      {/* Drawer xem nhanh chi tiết bài viết */}
      <Drawer
        title={
          <div className="flex flex-col gap-1 pr-8">
            <span className="text-lg font-bold text-white line-clamp-2">{selectedPost?.title}</span>
            <div className="flex items-center gap-2">
              <Tag color="blue">{selectedPost?.sites?.name}</Tag>
              <span className="text-xs text-slate-400">
                Tác giả: {selectedPost?.author_name || 'Ẩn danh'} | Đăng lúc: {selectedPost?.published_at ? new Date(selectedPost.published_at).toLocaleString('vi-VN') : ''}
              </span>
            </div>
          </div>
        }
        placement="right"
        size="large"
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedPost(null);
        }}
        open={isDrawerOpen}
        extra={
          <a href={selectedPost?.url} target="_blank" rel="noopener noreferrer">
            <Button type="primary" icon={<ExportOutlined />} className="bg-blue-600 border-none">
              Xem trang gốc
            </Button>
          </a>
        }
      >
        {selectedPost && (
          <div className="space-y-6 prose prose-invert max-w-none">
            {selectedPost.excerpt && (
              <div className="p-4 bg-slate-950/60 border-l-4 border-blue-500 rounded-r-xl">
                <span className="text-xs font-semibold text-blue-400 block mb-1 uppercase tracking-wide">Mô tả ngắn:</span>
                <div 
                  className="text-slate-300 italic text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedPost.excerpt }}
                />
              </div>
            )}
            
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-3 uppercase tracking-wide">Nội dung bài viết:</span>
              <div 
                className="text-slate-200 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: selectedPost.content || 'Không có nội dung.' }}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
