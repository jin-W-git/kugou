// src/components/AuthLoadingModal.jsx
import React from 'react';
import '../styles/layout.css';

const AuthLoadingModal = ({ isVisible, message }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="auth-loading-modal-overlay">
      <div className="auth-loading-modal">
        <div className="auth-loading-spinner"></div>
        <div className="auth-loading-message">{message}</div>
      </div>
    </div>
  );
};

export default AuthLoadingModal;