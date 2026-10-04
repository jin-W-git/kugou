// src/contexts/SearchContext.jsx
import React, { useState, useContext, useCallback, createContext } from "react";
import { message } from "antd";

// 创建 Context
const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


export const SearchProvider = ({ children }) => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback((keyword) => {
    if (!keyword?.trim()) {
      message.warning("请输入搜索关键词");
      return;
    }
    setSearchKeyword(keyword.trim());
    setIsSearching(true);

  }, []);




  const clearSearch = useCallback(() => {
    setSearchKeyword("");
    setIsSearching(false);
  }, []);

  const finishSearch = useCallback(() => {
    setIsSearching(false);
  }, []);



  const value = {
    searchKeyword,
    isSearching,
    handleSearch,
    clearSearch,
    finishSearch,
    setSearchKeyword,
  };

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
};

// 导出 Context 供 hooks 使用
export default SearchContext;

