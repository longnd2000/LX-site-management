import React from 'react';
import type { Metadata } from 'next';
import LandingPageClient from '@/components/LandingPageClient';

// Tối ưu hóa SEO nâng cao tại Server-side cho Next.js 15
export const metadata: Metadata = {
  title: 'Hệ thống quản lý tất cả trang WordPress dễ dàng | LX Site Management',
  description: 'Giải pháp SaaS tối ưu giúp kết nối API không giới hạn, đồng bộ webhook thời gian thực và quản lý tất cả trang WordPress vệ tinh dễ dàng tại một dashboard duy nhất.',
  keywords: [
    'hệ thống quản lý tất cả trang wordpress dễ dàng',
    'quản lý wordpress tập trung',
    'đồng bộ bài viết wordpress',
    'quản lý website vệ tinh',
    'kết nối API wordpress',
    'tự động hóa bài viết wordpress',
    'wordpress multisite manager',
    'PBN manager tool'
  ],
  authors: [{ name: 'Longpv', url: 'https://github.com/longnd2000' }],
  creator: 'Longpv',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Hệ thống quản lý tất cả trang WordPress dễ dàng | LX Site Management',
    description: 'Tổng hợp bài viết tự động qua kết nối API và Webhook ngầm từ hàng trăm website vệ tinh WordPress về một dashboard trung tâm Next.js.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'LX Site Management',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hệ thống quản lý tất cả trang WordPress dễ dàng | LX Site Management',
    description: 'Kết nối và đồng bộ bài viết tự động từ các website vệ tinh WordPress về Next.js dashboard.',
  },
};

export default function Page() {
  return <LandingPageClient />;
}
