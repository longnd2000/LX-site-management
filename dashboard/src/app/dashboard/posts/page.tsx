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
  EditOutlined
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

  // State kiểm soát tự động làm mới một lần duy nhất khi truy cập trang
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

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

  // Tự động làm mới bài viết từ tất cả các website khi truy cập trang lần đầu
  React.useEffect(() => {
    if (sites.length > 0 && !hasAutoSynced && !isSyncingAll) {
      setHasAutoSynced(true);
      syncAll(sites);
    }
  }, [sites, hasAutoSynced, isSyncingAll, syncAll]);

  // Hàm xử lý SSO tự động đăng nhập nhanh vào site vệ tinh và dẫn thẳng tới giao diện Edit bài viết
  const handleSSOEdit = async (record: Post) => {
    setSsoLoadingId(record.id);
    try {
      const redirectPath = `post.php?post=${record.wp_post_id}&action=edit`;
      const res = await axios.get('/api/sites/sso', {
        params: {
          siteId: record.site_id,
          redirect: redirectPath,
        }
      });
      
      if (res.data && res.data.ssoUrl) {
        window.open(res.data.ssoUrl, '_blank');
      } else {
        message.error('Không thể tạo liên kết đăng nhập tự động.');
      }
    } catch (err: any) {
      console.error('Lỗi SSO:', err);
      message.error(err.response?.data?.error || err.message || 'Lỗi kết nối đăng nhập tự động.');
    } finally {
      setSsoLoadingId(null);
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
      title: 'Nguồn (Site)',
      dataIndex: 'sites',
      key: 'site',
      render: (sites: any) => <Tag color="blue"><GlobalOutlined className="mr-1" />{sites?.name || 'Không xác định'}</Tag>,
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
            Quản lý và tra cứu toàn bộ bài viết đã được tổng hợp từ các site vệ tinh.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined />}
          loading={isSyncingAll}
          disabled={sites.length === 0}
          className="bg-blue-600 border-none h-10"
          onClick={() => syncAll(sites)}
        >
          Làm mới bài viết
        </Button>
      </div>

      {/* Filter Card */}
      <Card bordered={false} className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div className="text-xs text-slate-400 font-medium mb-1.5">Lọc theo Website</div>
            <Select
              placeholder="Tất cả website vệ tinh"
              allowClear
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
      <Card bordered={false} className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
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
        width={720}
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
