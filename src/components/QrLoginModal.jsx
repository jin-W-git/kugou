// src/components/QrLoginModal.jsx
// 通用扫码登录弹窗：支持 QQ 和 微信 两种第三方扫码登录
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Spin, Button, Alert } from 'antd';
import {
  qqLoginCreate,
  qqLoginCheck,
  wxLoginCreate,
  wxLoginCheck,
  wxLoginOpenplat,
} from '../services/api';

const POLL_INTERVAL = 2000; // 轮询间隔(ms)
const MAX_POLL = 150; // 最大轮询次数（约5分钟超时）

export default function QrLoginModal({ open, mode, onClose, onLogin }) {
  const [qrImage, setQrImage] = useState(null);   // 二维码图片(dataURL)
  const [msg, setMsg] = useState('');             // 状态提示
  const [expired, setExpired] = useState(false);  // 二维码是否失效
  const pollRef = useRef(null);                   // 轮询定时器
  const countRef = useRef(0);                     // 轮询计数
  const runningRef = useRef(false);               // 是否正在轮询

  const isQQ = mode === 'qq';

  // 清理轮询
  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    runningRef.current = false;
  }, []);

  // 成功登录
  const handleSuccess = useCallback(
    async (authData) => {
      stopPoll();
      try {
        if (onLogin) await onLogin(authData);
        setMsg('登录成功');
        onClose();
      } catch (e) {
        setMsg('登录失败：' + (e?.message || '未知错误'));
      }
    },
    [onLogin, onClose, stopPoll]
  );

  // QQ 轮询
  const pollQQ = useCallback(
    async (qrData) => {
      if (!runningRef.current) return;
      try {
        const res = await qqLoginCheck({
          qrsig: qrData.qrsig,
          ptqrtoken: qrData.ptqrtoken,
          pt_login_sig: qrData.pt_login_sig,
          pt_openlogin_data: qrData.pt_openlogin_data,
          xlogin_url: qrData.xlogin_url,
          cookie: qrData.cookie,
        });

        // 成功：status 为数字 1（或 body.status===1），data 含 token
        if (res.status === 1 || res.body?.status === 1 || res.data?.token) {
          const auth = res.data || res.body?.data;
          if (auth?.token && auth?.userid !== undefined) {
            await handleSuccess(auth);
            return;
          }
          setMsg('登录成功但数据不完整，请重试');
          return;
        }

        if (res.status === 'wait') {
          setMsg('请用 QQ 扫描二维码');
        } else if (res.status === 'expired' || res.status === '65') {
          setMsg('二维码已失效，请刷新重试');
          setExpired(true);
          stopPoll();
          return;
        } else if (res.status === 'confirmed' || res.status === '66') {
          setMsg('已扫码，请在手机上确认');
        } else {
          setMsg(res.msg || '等待扫码...');
        }
      } catch (e) {
        console.error('QQ 轮询失败:', e);
        setMsg('轮询出错：' + (e?.message || ''));
      }
      // 继续轮询
      if (runningRef.current && countRef.current < MAX_POLL) {
        pollRef.current = setTimeout(() => pollQQ(qrData), POLL_INTERVAL);
      } else if (runningRef.current) {
        setMsg('二维码已过期，请刷新');
        setExpired(true);
        stopPoll();
      }
    },
    [handleSuccess, stopPoll]
  );

  // 微信轮询
  const pollWX = useCallback(
    async (uuid) => {
      if (!runningRef.current) return;
      try {
        const res = await wxLoginCheck(uuid);

        // 授权成功且返回授权码
        if (res.code) {
          setMsg('已确认，正在登录...');
          const openplat = await wxLoginOpenplat(res.code);
          if (openplat.status === 1 && openplat.data?.token) {
            await handleSuccess(openplat.data);
            return;
          }
          setMsg('微信登录换取 token 失败');
          return;
        }

        // 尚未确认 / 仍在等待
        if (res.status === 'confirmed' && !res.code) {
          setMsg('已扫码，正在获取授权...');
        } else {
          setMsg('请用微信扫描二维码');
        }
      } catch (e) {
        console.error('微信轮询失败:', e);
        setMsg('轮询出错：' + (e?.message || ''));
      }
      if (runningRef.current && countRef.current < MAX_POLL) {
        pollRef.current = setTimeout(() => pollWX(uuid), POLL_INTERVAL);
      } else if (runningRef.current) {
        setMsg('二维码已过期，请刷新');
        setExpired(true);
        stopPoll();
      }
    },
    [handleSuccess, stopPoll]
  );

  // 开始扫码
  const start = useCallback(async () => {
    setQrImage(null);
    setMsg('正在生成二维码...');
    setExpired(false);
    countRef.current = 0;
    stopPoll();

    try {
      if (isQQ) {
        const res = await qqLoginCreate();
        if (res?.qrcode) {
          setQrImage(`data:image/png;base64,${res.qrcode}`);
          setMsg('请用 QQ 扫描二维码');
          runningRef.current = true;
          countRef.current = 0;
          pollRef.current = setTimeout(() => pollQQ(res), 1000);
        } else {
          setMsg('生成二维码失败：' + (res?.msg || '未知错误'));
        }
      } else {
        const res = await wxLoginCreate();
        const qrBase64 = res?.qrcode?.qrcodebase64;
        if (qrBase64) {
          setQrImage(`data:image/jpeg;base64,${qrBase64}`);
          setMsg('请用微信扫描二维码');
          runningRef.current = true;
          countRef.current = 0;
          pollRef.current = setTimeout(() => pollWX(res.uuid), 1000);
        } else {
          setMsg('生成二维码失败：' + (res?.errmsg || '未知错误'));
        }
      }
    } catch (e) {
      console.error('生成二维码失败:', e);
      setMsg('生成二维码失败：' + (e?.message || '未知错误'));
    }
  }, [isQQ, pollQQ, pollWX, stopPoll]);

  // 弹窗打开时开始
  useEffect(() => {
    if (open) {
      start();
    } else {
      stopPoll();
      setQrImage(null);
      setMsg('');
      setExpired(false);
    }
    return stopPoll;
  }, [open, start, stopPoll]);

  // 轮询计数递增（简化：每次轮询成功后递增）
  useEffect(() => {
    if (runningRef.current) {
      const interval = setInterval(() => {
        countRef.current += 1;
      }, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [runningRef.current]);

  return (
    <Modal
      title={isQQ ? 'QQ 扫码登录' : '微信扫码登录'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={380}
      centered
    >
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        {!qrImage ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin tip={msg || '加载中...'} />
          </div>
        ) : (
          <>
            <img
              src={qrImage}
              alt="登录二维码"
              style={{
                width: 220,
                height: 220,
                objectFit: 'contain',
                borderRadius: 8,
                background: '#fff',
                padding: 8,
              }}
            />
            <p style={{ margin: '12px 0 0', color: '#666' }}>
              {msg}
            </p>
            {expired && (
              <Button type="primary" style={{ marginTop: 12 }} onClick={start}>
                刷新二维码
              </Button>
            )}
          </>
        )}
      </div>
      {!qrImage && (
        <p style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>{msg}</p>
      )}
    </Modal>
  );
}
