// src/components/ErrorBoundary.jsx
import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

// 路由级错误兜底组件：当页面渲染出错时展示友好提示而非白屏
const ErrorBoundary = () => {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error?.message || String(error || '未知错误');

  console.error('页面渲染错误:', error);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: '#ffffff',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h2 style={{ margin: 0 }}>页面出错了</h2>
      <p style={{ color: '#aaaaaa', maxWidth: '520px', wordBreak: 'break-all' }}>
        {message}
      </p>
      <Link to="/" style={{ color: '#1890ff' }}>← 返回首页</Link>
    </div>
  );
};

export default ErrorBoundary;
