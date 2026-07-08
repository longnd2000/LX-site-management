'use client';

import React from 'react';
import { Button, Card, Row, Col, Space, Typography, Badge } from 'antd';
import {
  CloudServerOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  ApiOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const { Title, Paragraph, Text } = Typography;

export default function LandingPageClient() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CloudServerOutlined />
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
            LX Site Management
          </span>
        </div>
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Tính năng</a>
          <a href="#workflow" className="hover:text-white transition-colors">Cách hoạt động</a>
          <a href="#benefits" className="hover:text-white transition-colors">Lợi ích SEO</a>
        </nav>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button type="primary" size="large" id="btn-goto-dashboard" className="bg-blue-600 hover:bg-blue-500 border-none font-semibold h-10 px-5 shadow-lg shadow-blue-500/10">
                Vào Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium mr-2">
                Đăng nhập
              </Link>
              <Link href="/register">
                <Button type="primary" id="btn-header-register" className="bg-blue-600 hover:bg-blue-500 border-none font-semibold h-10 px-5 shadow-lg shadow-blue-500/15">
                  Đăng ký ngay
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-16 pb-24 z-10 relative flex-grow flex items-center">
        <Row gutter={[40, 40]} className="items-center w-full">
          <Col xs={24} lg={13} className="space-y-6">
            <Badge 
              status="processing" 
              text={<span className="text-blue-400 text-xs font-bold uppercase tracking-widest pl-1">Giải pháp tự động hóa 2026</span>} 
              className="bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full"
            />
            
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-tight text-white m-0" id="hero-title">
              Hệ thống{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                quản lý tất cả trang WordPress
              </span>{' '}
              dễ dàng
            </h1>
            
            <Paragraph className="!text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed">
              Bạn mệt mỏi vì phải đăng nhập từng site vệ tinh để copy bài viết? LX Site Management giúp tổng hợp mọi nội dung về một dashboard Next.js trung tâm trong 1 giây qua kết nối API chuẩn hóa và đồng bộ webhook thời gian thực.
            </Paragraph>
            
            <div className="pt-4 flex flex-wrap gap-4">
              <Link href={isAuthenticated ? "/dashboard" : "/register"}>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ArrowRightOutlined />} 
                  iconPosition="end"
                  id="btn-hero-cta"
                  className="bg-blue-600 hover:bg-blue-500 border-none h-14 px-8 text-base font-bold shadow-xl shadow-blue-500/20 hover:scale-105 transition-transform"
                >
                  Kết nối WordPress ngay
                </Button>
              </Link>
              <Link href="/login">
                <Button 
                  ghost 
                  size="large" 
                  id="btn-hero-secondary"
                  className="border-slate-700 hover:border-slate-500 !text-slate-300 hover:!text-white h-14 px-8 text-base font-semibold"
                >
                  Dùng thử miễn phí
                </Button>
              </Link>
            </div>

            {/* Micro proof badges */}
            <div className="pt-6 border-t border-slate-900 flex flex-wrap gap-x-8 gap-y-3 text-xs text-slate-500">
              <span className="flex items-center"><CheckCircleOutlined className="text-emerald-500 mr-2 text-sm" /> Không giới hạn Website vệ tinh</span>
              <span className="flex items-center"><CheckCircleOutlined className="text-emerald-500 mr-2 text-sm" /> Bắt tay tự động qua tài khoản Admin</span>
              <span className="flex items-center"><CheckCircleOutlined className="text-emerald-500 mr-2 text-sm" /> Bảo mật API Key tuyệt đối</span>
            </div>
          </Col>
          
          <Col xs={24} lg={11}>
            {/* Visual Interface Glassmorphism Container */}
            <div className="relative p-1.5 bg-gradient-to-br from-blue-500/20 via-slate-800/10 to-purple-500/20 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl animate-fade-in-up">
              <div className="bg-slate-900/90 rounded-[20px] p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">LX central control dashboard</span>
                </div>
                
                {/* Simulated Realtime Feed */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-800/40 border border-slate-700/30 p-3.5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><ApiOutlined /></div>
                      <div>
                        <p className="text-xs text-slate-400 m-0">Đã kết nối</p>
                        <p className="text-sm font-semibold text-white m-0">site-tin-tuc.vn</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">API Key OK</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-800/40 border border-slate-700/30 p-3.5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><FileTextOutlined /></div>
                      <div>
                        <p className="text-xs text-slate-400 m-0">Bài viết mới đồng bộ</p>
                        <p className="text-sm font-semibold text-white m-0 truncate max-w-[180px]">Xu hướng công nghệ 2026</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">Vừa xong</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-800/40 border border-slate-700/30 p-3.5 rounded-xl opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><SyncOutlined spin /></div>
                      <div>
                        <p className="text-xs text-slate-400 m-0">Đang đồng bộ dữ liệu...</p>
                        <p className="text-sm font-semibold text-white m-0">satellite-blog.com</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold">24 posts</span>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-900/60 border-t border-slate-900 py-24 z-10 relative">
        <div className="container mx-auto px-6 text-center space-y-16">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white m-0" id="features-title">
              Tính năng hỗ trợ quản lý WordPress tối đa
            </h2>
            <p className="text-slate-400 text-base">
              Chúng tôi cung cấp các công cụ mạnh mẽ để đơn giản hóa quy trình tích hợp của bạn.
            </p>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left h-full" id="feature-card-1">
                <div className="inline-flex p-3 rounded-xl bg-blue-500/10 text-blue-400 text-2xl mb-4">
                  <RocketOutlined />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Bắt tay 1 lần (Handshake)</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Chỉ cần nhập URL và thông tin tài khoản Admin 1 lần duy nhất từ Next.js. Hệ thống sẽ tự động cấu hình trao đổi khóa API Key an toàn và thiết lập webhook ngầm.
                </p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left h-full" id="feature-card-2">
                <div className="inline-flex p-3 rounded-xl bg-indigo-500/10 text-indigo-400 text-2xl mb-4">
                  <SyncOutlined />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Đồng bộ Webhook tức thời</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Ngay khi bạn bấm đăng bài viết mới trên WordPress, bài viết sẽ được tự động push trực tiếp về Next.js thời gian thực mà không làm chậm tốc độ tải trang.
                </p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all text-left h-full" id="feature-card-3">
                <div className="inline-flex p-3 rounded-xl bg-purple-500/10 text-purple-400 text-2xl mb-4">
                  <SafetyCertificateOutlined />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Bảo mật thông tin tối đa</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Next.js tuyệt đối không lưu trữ tài khoản/mật khẩu WordPress của bạn. Mọi truy vấn về sau đều sử dụng API Key mã hóa an toàn lưu trữ trên Supabase.
                </p>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 z-10 relative">
        <div className="container mx-auto px-6 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white m-0" id="workflow-title">
              Kết nối hệ thống chỉ trong 3 bước
            </h2>
            <p className="text-slate-400 text-base">
              Rút ngắn thời gian tích hợp, bắt đầu quản trị các website vệ tinh dễ dàng ngay hôm nay.
            </p>
          </div>

          <Row gutter={[32, 32]} className="justify-center">
            <Col xs={24} md={8} className="space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">1</div>
              <h3 className="text-lg font-bold text-white">Cài đặt Plugin</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Kích hoạt file plugin WordPress duy nhất trên các trang vệ tinh của bạn. Plugin sẽ chạy ẩn và không yêu cầu cấu hình.
              </p>
            </Col>
            <Col xs={24} md={8} className="space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">2</div>
              <h3 className="text-lg font-bold text-white">Xác thực Bắt tay</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Nhập URL website, tài khoản/mật khẩu Admin của trang WordPress trên Next.js Dashboard để hệ thống tự động kết nối ngầm.
              </p>
            </Col>
            <Col xs={24} md={8} className="space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-lg flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">3</div>
              <h3 className="text-lg font-bold text-white">Đồng bộ và Quản lý</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Theo dõi tất cả bài viết tập trung. Dễ dàng tìm kiếm, lọc theo nguồn và duyệt nội dung nhanh chóng từ một nơi duy nhất.
              </p>
            </Col>
          </Row>
        </div>
      </section>

      {/* SEO Section / Benefits */}
      <section id="benefits" className="bg-slate-900/40 border-t border-b border-slate-900 py-20 z-10 relative">
        <div className="container mx-auto px-6">
          <Row gutter={[40, 40]} className="items-center">
            <Col xs={24} md={12} className="space-y-6">
              <h2 className="text-3xl font-extrabold text-white m-0" id="benefits-title">
                Tối ưu hóa SEO cho mạng lưới site vệ tinh của bạn
              </h2>
              <Paragraph className="!text-slate-400 text-base leading-relaxed">
                Đồng bộ bài viết tập trung giúp bạn kiểm soát hoàn toàn chất lượng nội dung của toàn hệ thống vệ tinh. Tránh trùng lặp nội dung, theo dõi tần suất đăng bài của từng website vệ tinh và tối ưu hóa phân phối bài viết đi link chuẩn SEO.
              </Paragraph>
              <ul className="space-y-3 text-slate-300 text-sm p-0">
                <li className="flex items-center"><CheckCircleOutlined className="text-blue-400 mr-3 text-base" /> Tự động hóa cập nhật bài viết giúp website luôn tươi mới</li>
                <li className="flex items-center"><CheckCircleOutlined className="text-blue-400 mr-3 text-base" /> Phân tích tần suất sản xuất nội dung của từng site</li>
                <li className="flex items-center"><CheckCircleOutlined className="text-blue-400 mr-3 text-base" /> Xây dựng hệ thống quản lý vệ tinh chuẩn hóa thông qua API</li>
              </ul>
            </Col>
            <Col xs={24} md={12}>
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-8 text-center space-y-6" id="cta-box">
                <h3 className="text-xl font-bold text-white m-0">Sẵn sàng để thống trị bảng xếp hạng tìm kiếm?</h3>
                <p className="text-slate-400 text-sm">
                  Đăng ký tài khoản LX Site Management miễn phí ngay hôm nay để tối ưu hóa quy trình quản trị nội dung.
                </p>
                <Link href="/register" className="block">
                  <Button type="primary" size="large" block className="bg-blue-600 hover:bg-blue-500 border-none h-12 font-bold shadow-lg shadow-blue-500/10">
                    Trải nghiệm miễn phí
                  </Button>
                </Link>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 text-center text-slate-500 text-xs z-10 relative space-y-4">
        <div className="flex justify-center space-x-6 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Tính năng</a>
          <a href="#workflow" className="hover:text-white transition-colors">Cách hoạt động</a>
          <Link href="/login" className="hover:text-white transition-colors">Đăng nhập</Link>
          <Link href="/register" className="hover:text-white transition-colors">Đăng ký</Link>
        </div>
        <p>LX Site Management — Hệ thống quản lý tất cả trang WordPress dễ dàng, chuyên nghiệp, bảo mật.</p>
        <p>&copy; {new Date().getFullYear()} LX Site Management. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}
