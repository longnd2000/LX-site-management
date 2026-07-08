'use client';

import React, { useState, useEffect } from 'react';
import { Button, Alert, Space } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  CloudServerOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { supabase } from '@/services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Link from 'next/link';
import { translateAuthError } from '@/utils/errors';

// Schema validation bằng Zod
const registerSchema = zod.object({
  email: zod.string().min(1, 'Vui lòng nhập Email').email('Email không đúng định dạng'),
  password: zod.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: zod.string().min(6, 'Vui lòng nhập lại mật khẩu'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type RegisterFields = zod.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useSelector((state: RootState) => state.auth);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Điều hướng nếu đã đăng nhập
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFields) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }
      
      setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản (nếu cần) hoặc đăng nhập.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(translateAuthError(err.message || 'Đã xảy ra lỗi trong quá trình đăng ký.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px]" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800/60 p-8 rounded-2xl shadow-2xl z-10">
        <div className="mb-6">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm font-medium inline-flex items-center gap-1.5">
            <ArrowLeftOutlined /> Quay lại trang chủ
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 text-blue-500 text-3xl mb-3">
            <CloudServerOutlined />
          </div>
          <h2 className="text-2xl font-bold text-white m-0">Tạo tài khoản</h2>
          <p className="text-slate-400 text-sm mt-2">Đăng ký để quản lý hệ thống site vệ tinh</p>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            className="mb-6 bg-red-950/30 border-red-800 text-red-200"
          />
        )}

        {successMsg && (
          <Alert
            message={successMsg}
            type="success"
            showIcon
            className="mb-6 bg-green-950/30 border-green-800 text-green-200"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Space direction="vertical" size="large" className="w-full">
            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-base">
                  <MailOutlined />
                </span>
                <input
                  type="email"
                  placeholder="email@example.com"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border ${
                    errors.email 
                      ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                  } rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-4 transition-all duration-200`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-base">
                  <LockOutlined />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border ${
                    errors.password 
                      ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                  } rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-4 transition-all duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">Xác nhận mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-base">
                  <LockOutlined />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border ${
                    errors.confirmPassword 
                      ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                  } rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-4 transition-all duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              className="bg-blue-600 hover:bg-blue-500 border-none font-bold mt-2 h-11 rounded-xl text-sm"
            >
              Đăng ký
            </Button>
          </Space>
        </form>

        <div className="text-center mt-6 text-slate-400 text-sm">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
