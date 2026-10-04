// src/components/QrLoginModal.jsx
// 通用扫码登录弹窗：支持 QQ 和 微信 两种第三方扫码登录
// 二维码本身有有效期（约2-5分钟），过期后自动刷新生成新二维码
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Spin, Button } from 'antd';
import {
  qqLoginCreate,
  qqLoginCheck,
  wxLoginCreate,
  wxLoginCheck,
  wxLoginOpenplat,
} from '../services/api';

const POLL_INTERVAL = 2000;     // 轮询间隔(ms)
const QR_TTL = 4 * 60 * 1000;   // 二维码有效期(ms)，超过视为过期自动刷新
const MAX_AUTO_REFRESH = 1;     // 最多自动刷新次数（避免反复过期无限刷新）

export default function QrLoginModal({ open, mode, onClose, onLogin }) {
  const [qrImage, setQrImage] = useState(null);
  const [msg, setMsg] = useState('');
  const [expired, setExpired] = useState(false);

  const pollRef = useRef(null);
  const startTimeRef = useRef(0);
  const refreshCountRef = useRef(0);
  const runningRef = useRef(false);

  // 用 ref 打破循环依赖：start ↔ handleExpired ↔ pollQQ/pollWX
  const startRef = useRef(null);
  const pollQQRef = useRef(null);
  const pollWXRef = useRef(null);

  const isQQ = mode === 'qq';

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

  // 二维码过期：优先自动刷新（限次），超限则进入手动刷新状态
  const handleExpired = useCallback(() => {
    stopPoll();
    if (refreshCountRef.current < MAX_AUTO_REFRESH) {
      refreshCountRef.current += 1;
      setMsg('二维码已过期，正在自动刷新...');
      setExpired(false);
      pollRef.current = setTimeout(() => {
        startRef.current && startRef.current();
      }, 600);
    } else {
      setMsg('二维码已过期，请点击下方按钮刷新');
      setExpired(true);
    }
  }, [stopPoll]);

  // QQ 轮询
  const pollQQ = useCallback(
    async (qrData) => {
      if (!runningRef.current) return;
      if (Date.now() - startTimeRef.current > QR_TTL) {
        handleExpired();
        return;
      }
      try {
        const res = await qqLoginCheck({
          qrsig: qrData.qrsig,
          ptqrtoken: qrData.ptqrtoken,
          pt_login_sig: qrData.pt_login_sig,
          pt_openlogin_data: qrData.pt_openlogin_data,
          xlogin_url: qrData.xlogin_url,
          cookie: qrData.cookie,
        });

        if (res.status === 1 || res.body?.status === 1 || res.data?.token) {
          const auth = res.data || res.body?.data;
          if (auth?.token && auth?.userid !== undefined) {
            await handleSuccess(auth);
            return;
          }
          setMsg('登录成功但数据不完整，请重试');
          return;
        }

        if (res.status === 'expired' || res.status === '65') {
          handleExpired();
          return;
        } else if (res.status === 'wait' || res.status === '66') {
          setMsg('请用 QQ 扫描二维码');
        } else if (res.status === 'confirmed') {
          setMsg('已扫码，请在手机上确认');
        } else {
          setMsg(res.msg || '等待扫码...');
        }
      } catch (e) {
        console.error('QQ 轮询失败:', e);
        setMsg('轮询出错：' + (e?.message || ''));
      }
      if (runningRef.current) {
        pollRef.current = setTimeout(() => pollQQRef.current(qrData), POLL_INTERVAL);
      }
    },
    [handleExpired, handleSuccess]
  );
  pollQQRef.current = pollQQ;

  // 微信轮询
  const pollWX = useCallback(
    async (uuid) => {
      if (!runningRef.current) return;
      if (Date.now() - startTimeRef.current > QR_TTL) {
        handleExpired();
        return;
      }
      try {
        const res = await wxLoginCheck(uuid);
        // 微信 qrconnect 返回字段为 wx_errcode / wx_code
        const wxe = res?.wx_errcode;
        const code = res?.wx_code || res?.code;

        // 授权成功且返回授权码
        if (code) {
          setMsg('已确认，正在登录...');
          const openplat = await wxLoginOpenplat(code);
          if (openplat.status === 1 && openplat.data?.token) {
            await handleSuccess(openplat.data);
            return;
          }
          setMsg('微信登录换取 token 失败');
          return;
        }

        // 二维码失效
        if (wxe === 404 || wxe === 400) {
          handleExpired();
          return;
        }
        // 408 = 等待扫码，其余继续等待
        setMsg('请用微信扫描二维码');
      } catch (e) {
        console.error('微信轮询失败:', e);
        setMsg('轮询出错：' + (e?.message || ''));
      }
      if (runningRef.current) {
        pollRef.current = setTimeout(() => pollWXRef.current(uuid), POLL_INTERVAL);
      }
    },
    [handleExpired, handleSuccess]
  );
  pollWXRef.current = pollWX;

  // 生成二维码并开始轮询
  const start = useCallback(async () => {
    setQrImage(null);
    setExpired(false);
    stopPoll();
    startTimeRef.current = Date.now();

    try {
      if (isQQ) {
        const res = await qqLoginCreate();
        if (res?.qrcode) {
          setQrImage(`data:image/png;base64,${res.qrcode}`);
          setMsg('请用 QQ 扫描二维码');
          runningRef.current = true;
          pollRef.current = setTimeout(() => pollQQRef.current(res), 1000);
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
          pollRef.current = setTimeout(() => pollWXRef.current(res.uuid), 1000);
        } else {
          setMsg('生成二维码失败：' + (res?.errmsg || '未知错误'));
        }
      }
    } catch (e) {
      console.error('生成二维码失败:', e);
      setMsg('生成二维码失败：' + (e?.message || '未知错误'));
    }
  }, [isQQ, stopPoll]);
  startRef.current = start;

  // 手动刷新：重置自动刷新计数，允许再次自动刷新
  const handleManualRefresh = useCallback(() => {
    refreshCountRef.current = 0;
    start();
  }, [start]);

  // 弹窗打开时开始，关闭时清理
  useEffect(() => {
    if (open) {
      refreshCountRef.current = 0;
      start();
    } else {
      stopPoll();
      setQrImage(null);
      setMsg('');
      setExpired(false);
    }
    return stopPoll;
  }, [open, start, stopPoll]);

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
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <Spin />
            <p style={{ marginTop: 12, color: '#666' }}>{msg || '正在生成二维码...'}</p>
          </div>
        ) : (
          <>
            <img
              src={qrImage}
              alt="登录二维码"
              onClick={handleManualRefresh}
              title="点击刷新二维码"
              style={{
                width: 220,
                height: 220,
                objectFit: 'contain',
                borderRadius: 8,
                background: '#fff',
                padding: 8,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
            />
            <p style={{ margin: '12px 0 0', color: '#666', fontSize: 13 }}>
              {msg}
            </p>
            <p style={{ margin: '6px 0 0', color: '#aaa', fontSize: 12 }}>
              {expired
                ? '二维码已过期'
                : '二维码有效期约 2-5 分钟 · 点击二维码即可刷新'}
            </p>
            {expired && (
              <Button type="primary" style={{ marginTop: 12 }} onClick={handleManualRefresh}>
                刷新二维码
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
