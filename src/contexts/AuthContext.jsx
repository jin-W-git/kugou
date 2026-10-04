// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { request } from "../services/api";
import { getToken, removeToken, setToken } from "../utils/token";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  // 获取用户详细信息的辅助函数
  const getUserDetail = async (tokenData) => {
    // 获取用户详细信息
    try {
      const userInfo = await request(`/user/detail`);
      if (userInfo.error_code === 0 && userInfo.data) {
        setUser({
          ...tokenData,
          profile: userInfo.data,
        });
      } else {
        // 如果获取详细信息失败，使用基本信息
        setUser(tokenData);
      }
    } catch (error) {
      console.error("获取用户详情失败:", error);
      // 失败时仍然设置用户基本信息
      setUser(tokenData);
    }
  };

  // 检查本地存储中的用户信息并验证 token
  useEffect(() => {
    const token = getToken();
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        setIsVerifying(true);
        await request(`/login/token?token=${token?.token}&userid=${token?.userid}`);
        console.log("Token is valid");
        await getUserDetail(token);
      } catch (error) {
        console.log("Token is invalid:", error.message);
        setUser(null);
      } finally {
        setIsVerifying(false);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (token) => {
    // 存储基本认证信息
    setToken(token);
    // 登录后立即验证token
    setIsVerifying(true);
    try {
      await request(`/login/token?token=${token?.token}&userid=${token?.userid}`);
      console.log("Login token verified");
      await getUserDetail(token);
    } catch (error) {
      console.log("Login token invalid:", error.message);
      removeToken();
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const logout = () => {
    removeToken();
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
    isVerifying,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
