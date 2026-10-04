import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DownloadProvider } from './contexts/DownloadContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { SearchProvider } from './contexts/SearchContext';
import AppRouter from './router';
import TestLogin from './components/TestLogin';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DownloadProvider>
          <PlayerProvider>
            <SearchProvider>
              <div style={{ minHeight: '100vh' }}>
                <AppRouter />
                {/* 测试登录组件 - 可以删除 */}
                <TestLogin />
              </div>
            </SearchProvider>
          </PlayerProvider>
        </DownloadProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;