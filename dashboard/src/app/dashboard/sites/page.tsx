'use client';

import React, { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Card, Tag, Typography, message, Popconfirm, Tooltip } from 'antd';
import {
  GlobalOutlined,
  PlusOutlined,
  SyncOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Site } from '@/types';
import { useSites } from '@/hooks/useSites';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

export default function SitesManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [testingConnection, setTestingConnection] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  // Sử dụng custom hook để tách biệt logic
  const {
    sites,
    isLoading,
    addSite,
    isAdding,
    syncSite,
    isSyncing,
    syncVariables,
    testConnection,
    isTesting,
    testVariables,
    deleteSite,
    isDeleting,
  } = useSites(user?.id);

  // Toggle hiển thị API Key
  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy API Key vào clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Đã copy API Key vào bộ nhớ tạm.');
  };

  // Test Connection trong Form thêm mới (bằng tài khoản/mật khẩu)
  const handleTestInForm = async () => {
    try {
      const values = await form.validateFields(['url', 'username', 'password']);
      setTestingConnection(true);
      const res = await axios.post('/api/sites/verify', {
        url: values.url,
        username: values.username,
        password: values.password,
      });
      if (res.data.success) {
        message.success(`Kết nối thành công! Site Name: ${res.data.site_name}`);
        if (!form.getFieldValue('name')) {
          form.setFieldValue('name', res.data.site_name);
        }
      } else {
        message.error(res.data.message || 'Xác thực thất bại');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể kết nối đến website.');
    } finally {
      setTestingConnection(false);
    }
  };

  const columns = [
    {
      title: 'Tên Website',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Site) => (
        <div>
          <span className="font-semibold text-slate-200">{text}</span>
          <br />
          <a href={record.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-blue-500">
            {record.url}
          </a>
        </div>
      ),
    },
    {
      title: 'Hệ thống sinh API Key',
      dataIndex: 'api_key',
      key: 'api_key',
      width: 250,
      render: (key: string, record: Site) => {
        const isVisible = visibleKeys[record.id];
        return (
          <Space>
            <Text className="font-mono text-xs text-slate-500" style={{ maxWidth: 150 }} ellipsis>
              {isVisible ? key : '••••••••••••••••••••••••••••'}
            </Text>
            <Button
              type="text"
              size="small"
              icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => toggleKeyVisibility(record.id)}
            />
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(key)}
            />
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'orange'}>
          {status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
        </Tag>
      ),
    },
    {
      title: 'Ngày kết nối',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Site) => (
        <Space size="middle">
          <Tooltip title="Kiểm tra kết nối">
            <Button
              shape="circle"
              icon={<CheckCircleOutlined className="text-emerald-500" />}
              loading={isTesting && testVariables?.id === record.id}
              onClick={() => testConnection(record)}
            />
          </Tooltip>
          
          <Button
            type="dashed"
            icon={<SyncOutlined />}
            loading={isSyncing && syncVariables === record.id}
            onClick={() => syncSite(record.id)}
          >
            Làm mới
          </Button>

          <Popconfirm
            title="Xóa kết nối website?"
            description="Lưu ý: Tất cả các bài viết đã tổng hợp từ site này cũng sẽ bị xóa khỏi hệ thống."
            onConfirm={() => deleteSite(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: isDeleting }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3} className="!m-0"><GlobalOutlined className="text-blue-500 mr-2" />Quản lý Website vệ tinh</Title>
          <Paragraph className="text-slate-500 !m-0">
            Kết nối website WordPress bằng tài khoản Admin để tự động trao đổi API Key và kích hoạt Webhook.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="bg-blue-600 border-none h-10"
          onClick={() => setIsModalOpen(true)}
        >
          Kết nối website mới
        </Button>
      </div>

      <Card bordered={false} className="shadow-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
        <Table
          columns={columns}
          dataSource={sites}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: <span className="text-slate-500">Chưa có website vệ tinh nào được kết nối.</span> }}
        />
      </Card>

      {/* Modal thêm site mới */}
      <Modal
        title="Kết nối Website vệ tinh mới"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="test"
            type="dashed"
            loading={testingConnection}
            onClick={handleTestInForm}
          >
            Kiểm tra kết nối
          </Button>,
          <Button
            key="submit"
            type="primary"
            className="bg-blue-600 border-none"
            loading={isAdding}
            onClick={() => form.submit()}
          >
            Kết nối ngay
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          className="pt-4"
          onFinish={(values) => {
            addSite(values, {
              onSuccess: () => {
                setIsModalOpen(false);
                form.resetFields();
              }
            });
          }}
        >
          <Form.Item
            name="url"
            label="URL Website WordPress"
            rules={[
              { required: true, message: 'Vui lòng nhập URL của website' },
              { type: 'url', message: 'URL không đúng định dạng (Ví dụ: https://mywebsite.com)' }
            ]}
          >
            <Input placeholder="https://my-satellite-site.com" size="large" />
          </Form.Item>

          <div className="p-3.5 bg-slate-950/50 rounded-xl mb-4 border border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 block mb-2">THÔNG TIN ĐĂNG NHẬP WORDPRESS (BẮT TAY 1 LẦN):</span>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Mật khẩu này được sử dụng một lần để sinh API Key bảo mật và sẽ **không được lưu** trên hệ thống.
            </p>

            <Form.Item
              name="username"
              label="Tài khoản Admin"
              rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản Administrator' }]}
            >
              <Input prefix={<UserOutlined className="text-slate-400" />} placeholder="admin" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu Admin / Application Password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu tài khoản' }]}
            >
              <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" size="large" />
            </Form.Item>
          </div>

          <Form.Item
            name="name"
            label="Tên gợi nhớ (Không bắt buộc)"
          >
            <Input placeholder="Tên gợi nhớ (Tự động lấy tên site nếu để trống)" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
