// src/router.jsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Login from './components/Login';
import RootLayout from './components/RootLayout';
import MainApp from './components/MainApp';
import HomeWithSearch from './components/HomeWrapper';
import Playlists from './pages/Playlists';

// 路由配置
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        element: <MainApp />,
        children: [
          {
            index: true,
            element: <HomeWithSearch />, // 使用包装组件
          },
          {
            path: 'playlists',
            element: <Playlists />,
          },
        ],
      },
      {
        path: 'login',
        element: <Login />,
      },
    ],
  },
]);

