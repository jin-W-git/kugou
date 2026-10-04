// src/hooks/useForceNavigate.js
import { useNavigate } from 'react-router-dom';

export const useForceNavigate = () => {
  const navigate = useNavigate();
  
  const forceNavigate = (path, options = {}) => {
    // 强制刷新页面的导航函数
    const { forceRefresh = false, ...navigateOptions } = options;
    
    // 如果明确要求强制刷新，或者路径是登录页面
    if (forceRefresh || path === '/login') {
      // 直接刷新整个页面
      window.location.href = path;
    } else {
      // 使用正常的 React Router 导航
      navigate(path, navigateOptions);
    }
  };
  
  return forceNavigate;
};