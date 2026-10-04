// src/components/AppLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useForceNavigate } from '../hooks/useForceNavigate';
import AuthLoadingModal from './AuthLoadingModal';

const AppLayout = ({ children }) => {
  const { isAuthenticated, loading, isVerifying } = useAuth();
  const forceNavigate = useForceNavigate();
  
  if (loading) {
    return (
      <>
        <div className="loading">加载中...</div>
        <AuthLoadingModal isVisible={true} message="正在初始化..." />
      </>
    );
  }
  
  if (!isAuthenticated) {
    // 如果未认证，强制刷新重定向到登录页面
    forceNavigate('/login', { forceRefresh: true });
    return null; // 返回 null 因为页面即将刷新
  }
  
  return (
    <>
      <Layout>
        {children || <Outlet />}
      </Layout>
      <AuthLoadingModal isVisible={isVerifying} />
    </>
  );
};

export default AppLayout;