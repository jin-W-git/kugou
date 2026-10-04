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

  // 收集完整堆栈信息，便于定位 insertBefore / removeChild 等 DOM 渲染错误的来源
  const stack = error?.stack || '';
  const componentStack = error?.componentStack || '';

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
      {/* 显示完整堆栈，方便排查 */}
      {stack && (
        <pre
          style={{
            color: '#e0e0e0',
            fontSize: '11px',
            textAlign: 'left',
            maxWidth: '90vw',
            maxHeight: '240px',
            overflow: 'auto',
            background: 'rgba(255,255,255,0.08)',
            padding: '12px',
            borderRadius: '8px',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
          }}
        >
          {stack}
          {componentStack ? `\n\n组件栈:\n${componentStack}` : ''}
        </pre>
      )}
      <Link to="/" style={{ color: '#1890ff' }}>← 返回首页</Link>
    </div>
  );
};

export default ErrorBoundary;
