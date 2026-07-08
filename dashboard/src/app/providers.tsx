'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { store } from '@/store';
import { supabase } from '@/services/supabase';
import { setUser } from '@/store/slices/authSlice';
import { App as AntdApp, ConfigProvider, theme } from 'antd';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#3b82f6', // xanh dương Tailwind
                colorBgContainer: '#0f172a', // slate-900
                colorBgLayout: '#020617', // slate-950
                colorBorder: '#1e293b', // border slate-800
                colorText: '#f1f5f9', // slate-100
                colorTextSecondary: '#cbd5e1', // slate-300
                colorTextDescription: '#94a3b8', // slate-400
                colorTextHeading: '#ffffff', // trắng tinh
                borderRadius: 10,
              },
            }}
          >
            <AntdApp>
              <AuthInitializer>{children}</AuthInitializer>
            </AntdApp>
          </ConfigProvider>
        </AntdRegistry>
      </QueryClientProvider>
    </Provider>
  );
}

// Component lắng nghe sự thay đổi của Supabase Auth để cập nhật vào Redux
function AuthInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Kiểm tra session hiện tại khi load trang
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        store.dispatch(
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at,
          })
        );
      } else {
        store.dispatch(setUser(null));
      }
    });

    // 2. Lắng nghe thay đổi trạng thái Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        store.dispatch(
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at,
          })
        );
      } else {
        store.dispatch(setUser(null));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
