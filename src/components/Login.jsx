// src/components/Login.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { request } from '../services/api';
import QrLoginModal from './QrLoginModal';

export default function Login() {
  
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [qrMode, setQrMode] = useState(null); // null | 'qq' | 'wechat'
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!mobile) {
      message.warning('请输入手机号');
      return;
    }
    
    if (countdown > 0) return;
    
    try {
      setIsLoading(true);
      await request(`/captcha/sent?mobile=${mobile}`);
      setCountdown(60);
      message.success('验证码已发送');
    } catch (error) {
      console.error('发送验证码失败:', error);
      message.error('发送失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!mobile || !code) {
      message.warning('请输入手机号和验证码');
      return;
    }

    try {
      setIsLoading(true);
      const res = await request(`/login/cellphone?mobile=${mobile}&code=${code}`);
      const data = res.data;
      login(data);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('登录失败:', error);
      message.error('登录失败，请检查手机号和验证码');
    } finally {
      setIsLoading(false);
    }
  };

  // 第三方扫码登录成功后统一处理：存入 auth + 跳转首页
  const handleThirdLogin = async (authData) => {
    if (!authData?.token || authData.userid === undefined) {
      throw new Error('登录数据不完整');
    }
    await login({ token: authData.token, userid: authData.userid });
    navigate('/', { replace: true });
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="gradient-overlay"></div>
        <div className="floating-elements">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`floating-element element-${i + 1}`}></div>
          ))}
        </div>
      </div>
      
      <div className="login-card glass-effect">
        <div className="login-header">
          <h1 className="login-title">音乐下载器</h1>
          <p className="login-subtitle">畅享高品质音乐体验</p>
        </div>
        
        <div className="login-form">
          <div className="input-group">
            <label htmlFor="mobile">手机号</label>
            <div className="input-wrapper">
              <span className="input-icon">📱</span>
              <input 
                id="mobile"
                type="tel" 
                placeholder="请输入手机号" 
                value={mobile} 
                onChange={e => setMobile(e.target.value)}
                className="glass-input"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="code">验证码</label>
            <div className="input-wrapper code-wrapper">
              <span className="input-icon">🔒</span>
              <input 
                id="code"
                type="text" 
                placeholder="请输入验证码" 
                value={code} 
                onChange={e => setCode(e.target.value)}
                className="glass-input"
                disabled={isLoading}
              />
              <button 
                onClick={handleSendCode}
                disabled={isLoading || countdown > 0}
                className="send-code-btn glass-button primary"
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </div>
          
          <button 
            onClick={handleLogin}
            disabled={isLoading}
            className="login-button glass-button primary"
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                登录中...
              </>
            ) : '立即登录'}
          </button>
        </div>
        
        {/* 第三方登录入口 */}
        <div className="login-third-party">
          <div className="third-party-divider">
            <span>其他登录方式</span>
          </div>
          <div className="third-party-buttons">
            <button
              onClick={() => setQrMode('qq')}
              className="third-party-btn qq-btn"
            >
              <span className="third-party-icon qq-icon">Q</span>
              QQ 登录
            </button>
            <button
              onClick={() => setQrMode('wechat')}
              className="third-party-btn wechat-btn"
            >
              <span className="third-party-icon wechat-icon">微</span>
              微信登录
            </button>
          </div>
        </div>

        <div className="login-footer">
          <p>登录即表示您同意我们的服务条款</p>
        </div>
      </div>

      {/* 扫码登录弹窗 */}
      <QrLoginModal
        open={!!qrMode}
        mode={qrMode}
        onClose={() => setQrMode(null)}
        onLogin={handleThirdLogin}
      />
    </div>
  );
};