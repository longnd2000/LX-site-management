'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Avatar, Dropdown, theme } from 'antd';
import {
  DashboardOutlined,
  GlobalOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { supabase } from '@/services/supabase';
import Link from 'next/link';

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Tránh nhấp nháy giao diện khi đang redirect
  }

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">Tổng quan</Link>,
    },
    {
      key: '/dashboard/sites',
      icon: <GlobalOutlined />,
      label: <Link href="/dashboard/sites">Website vệ tinh</Link>,
    },
    {
      key: '/dashboard/posts',
      icon: <FileTextOutlined />,
      label: <Link href="/dashboard/posts">Tổng hợp bài viết</Link>,
    },
  ];

  const userDropdownItems = [
    {
      key: 'email',
      label: <span className="font-medium text-slate-300">{user?.email}</span>,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="dark"
        className="border-r border-slate-800 shadow-xl"
        style={{
          backgroundColor: '#090d16' // slate-950
        }}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800/60 gap-3 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white text-lg flex items-center justify-center flex-shrink-0">
            <CloudServerOutlined />
          </div>
          {!collapsed && (
            <span className="font-bold text-white text-base truncate bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              LX Central
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          className="pt-4 border-none"
          style={{
            backgroundColor: '#090d16'
          }}
        />
      </Sider>
      
      <Layout style={{ backgroundColor: '#020617' }}>
        <Header 
          style={{ 
            padding: '0 24px', 
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
            height: 64
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white"
            style={{
              fontSize: '16px',
              width: 48,
              height: 48,
            }}
          />
          
          <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" trigger={['click']}>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
              <Avatar icon={<UserOutlined />} className="bg-blue-600" />
              <span className="text-sm font-medium text-slate-300 hidden sm:inline-block">
                {user?.email?.split('@')[0]}
              </span>
            </div>
          </Dropdown>
        </Header>
        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#0f172a/60',
            borderRadius: 12,
            border: '1px solid #1e293b',
            overflowY: 'auto'
          }}
          className="backdrop-blur-md"
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
