// src/components/Layout.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import SearchWithSuggestions from './SearchWithSuggestions';
import BottomPlayer from './BottomPlayer';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { handleSearch: contextHandleSearch } = useSearch();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef(null);

  // 监听 Escape 键关闭全屏搜索
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileSearchOpen]);

  const handleLogout = () => {
    window.location.href = '/';
    logout();
  };

  const handleSearchSubmit = useCallback((keyword) => {
    if (keyword?.trim()) {
      contextHandleSearch(keyword.trim());
      setMobileSearchOpen(false);
    }
  }, [contextHandleSearch]);

  const openMobileSearch = () => {
    setMobileSearchOpen(true);
  };

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
  };

  return (
    <div className="app-layout">
      {/* 背景效果 */}
      <div className="app-background">
        <div className="gradient-overlay"></div>
        <div className="floating-elements">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`floating-element app-element-${i + 1}`}></div>
          ))}
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="app-container glass-effect">
        <header className="app-header">
          <div className="header-left">
            <div className="logo">
              <Link to="/">🎵 音乐下载器</Link>
            </div>
            {location.pathname === '/' && (
              <>
                {/* 桌面端搜索框 */}
                <div className="header-search-container desktop-search">
                  <SearchWithSuggestions 
                    onSearch={handleSearchSubmit}
                    disabled={false}
                    placeholder="搜索歌曲、歌手、专辑..."
                  />
                </div>
                {/* 移动端搜索图标按钮 */}
                <button 
                  className="mobile-search-trigger" 
                  onClick={openMobileSearch}
                  aria-label="搜索"
                >
                  <SearchOutlined />
                </button>
              </>
            )}
          </div>
          <nav className="nav">
            <Link 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              首页
            </Link>
            {user && (
              <>
                <Link
                  to="/playlists"
                  className={location.pathname === '/playlists' ? 'active' : ''}
                >
                  我的歌单
                </Link>
                <div className="user-profile">
                  <div className="user-avatar">
                    <img 
                      src={user.profile?.avatarUrl || user.profile?.pic || '/default-avatar.png'} 
                      alt="用户头像" 
                      onError={(e) => {
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                  </div>
                  <span className="user-nickname">
                    {user.profile?.nickname || user.profile?.k_nickname || user.account?.userName || '用户'}
                  </span>
                </div>
                <button onClick={handleLogout} className="logout-btn glass-button">
                  退出登录
                </button>
              </>
            )}
          </nav>
        </header>
        
        <main className="app-main">
          {children}
        </main>
        
        <footer className="app-footer">
          <p>© 2026 音乐下载器 - 享受高品质音乐体验</p>
        </footer>
      </div>
      
      {/* 移动端全屏搜索覆盖层 */}
      {mobileSearchOpen && (
        <div className="mobile-search-overlay" ref={mobileSearchRef}>
          <div className="mobile-search-header">
            <button 
              className="mobile-search-back-btn" 
              onClick={closeMobileSearch}
              aria-label="返回"
            >
              <ArrowLeftOutlined />
            </button>
            <div className="mobile-search-input-wrapper">
              <SearchWithSuggestions 
                onSearch={handleSearchSubmit}
                disabled={false}
                placeholder="搜索歌曲、歌手、专辑..."
                autoFocus={true}
                getPopupContainer={() => mobileSearchRef.current || document.body}
              />
            </div>
          </div>
          <div 
            className="mobile-search-backdrop" 
            onClick={closeMobileSearch}
          />
        </div>
      )}
      
      {/* 底部播放器 */}
      <BottomPlayer />
    </div>
  );
};

export default Layout;