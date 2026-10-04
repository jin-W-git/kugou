// src/components/MainApp.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import AppLayout from './AppLayout';

const MainApp = () => {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

export default MainApp;