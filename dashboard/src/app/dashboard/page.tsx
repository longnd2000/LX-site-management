'use client';

import React from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Button, Space, Tag } from 'antd';
import {
  GlobalOutlined,
  FileTextOutlined,
  SyncOutlined,
  PlusOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Link from 'next/link';
import { Post } from '@/types';

const { Title, Paragraph } = Typography;

export default function DashboardHome() {
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch thống kê số lượng Sites
  const { data: sitesCount = 0, isLoading: sitesLoading } = useQuery({
    queryKey: ['sitesCount', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('sites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch thống kê số lượng Posts
  const { data: postsCount = 0, isLoading: postsLoading } = useQuery({
    queryKey: ['postsCount', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch 5 bài viết mới nhất
  const { data: recentPosts = [], isLoading: postsListLoading } = useQuery<Post[]>({
    queryKey: ['recentPosts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          url,
          published_at,
          author_name,
          sites (
            name,
            url
          )
        `)
        .eq('user_id', user.id)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as unknown as Post[];
    },
    enabled: !!user?.id,
  });

  const columns = [
    {
      title: 'Tiêu đề bài viết',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Post) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-500">
          {text}
        </a>
      ),
    },
    {
      title: 'Nguồn (Site)',
      dataIndex: 'sites',
      key: 'site',
      render: (sites: any) => <Tag color="blue">{sites?.name || 'Không xác định'}</Tag>,
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3} className="!m-0 !text-white">Hệ thống LX Management</Title>
          <Paragraph className="text-slate-400 !m-0">
            Tổng quan tình trạng kết nối các website vệ tinh và thống kê bài viết.
          </Paragraph>
        </div>
        <Space>
          <Link href="/dashboard/sites">
            <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-none font-medium">
              Kết nối site mới
            </Button>
          </Link>
        </Space>
      </div>

      {/* Stats row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card bordered={false} className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-200">
            <Statistic
              title={<span className="text-slate-400">Website vệ tinh kết nối</span>}
              value={sitesCount}
              loading={sitesLoading}
              prefix={<GlobalOutlined className="text-blue-400 mr-2" />}
              valueStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false} className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-200">
            <Statistic
              title={<span className="text-slate-400">Tổng bài viết đã tổng hợp</span>}
              value={postsCount}
              loading={postsLoading}
              prefix={<FileTextOutlined className="text-indigo-400 mr-2" />}
              valueStyle={{ color: '#818cf8', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent posts */}
      <Card
        title={
          <div className="flex justify-between items-center w-full py-1">
            <span className="font-semibold text-slate-200"><SyncOutlined className="text-blue-500 mr-2" />Bài viết mới đồng bộ</span>
            <Link href="/dashboard/posts" className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Xem tất cả <ArrowRightOutlined />
            </Link>
          </div>
        }
        bordered={false}
        className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm"
      >
        <Table
          columns={columns}
          dataSource={recentPosts}
          rowKey="id"
          pagination={false}
          loading={postsListLoading}
          locale={{ emptyText: <span className="text-slate-500">Chưa có bài viết nào được đồng bộ về.</span> }}
        />
      </Card>
    </div>
  );
}
