import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { AuthProvider } from './contexts/AuthContext'
import { PlayerProvider } from './contexts/PlayerContext'
import { SearchProvider } from './contexts/SearchContext'
import { DownloadProvider } from './contexts/DownloadContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SearchProvider>
        <PlayerProvider>
          <DownloadProvider>
            <RouterProvider router={router} />
          </DownloadProvider>
        </PlayerProvider>
      </SearchProvider>
    </AuthProvider>
  </StrictMode>,
)
