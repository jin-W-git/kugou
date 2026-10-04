// src/components/SearchWithSuggestions.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AutoComplete } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getSuggestions } from '../services/api';


const SearchWithSuggestions = ({ 
  onSearch, 
  disabled = false, 
  placeholder = "搜索歌曲、歌手、专辑...",
  initialValue = "",
  autoFocus = false,
  getPopupContainer
}) => {
  
  const [localValue, setLocalValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false); // 新增：标记是否正在选择建议项
  const autoCompleteRef = useRef(null);
  const debounceTimer = useRef(null);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && autoCompleteRef.current) {
      // 延迟聚焦确保 DOM 已渲染
      const timer = setTimeout(() => {
        if (autoCompleteRef.current) {
          autoCompleteRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // 获取搜索建议
  const fetchSuggestions = useCallback(async (keyword) => {
    if (!keyword?.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getSuggestions(keyword);
      console.log('搜索建议API响应:', response);
      
      if (response?.data) {
        // 解析搜索建议数据
        let suggestionList = [];
        
        // 处理不同格式的数据
        if (Array.isArray(response.data)) {
          // 多个分类的建议格式
          suggestionList = response.data.flatMap(category => {
            if (Array.isArray(category.RecordDatas)) {
              return category.RecordDatas.map(item => ({
                value: item.HintInfo,
                label: item.HintInfo,
                category: category.LableName || '默认'
              }));
            }
            return [];
          });
        } else if (response.data && response.data.RecordDatas) {
          // 单个对象格式，包含RecordDatas数组
          suggestionList = response.data.RecordDatas.map(item => ({
            value: item.HintInfo,
            label: item.HintInfo
          }));
        }
        
        console.log('处理后的建议列表:', suggestionList);
        setSuggestions(suggestionList);
      }
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 防抖处理搜索建议
  const handleInputChange = (value) => {
    setLocalValue(value);
    
    // 如果正在选择建议项，则不触发搜索建议
    if (isSelecting) {
      setIsSelecting(false);
      return;
    }
    
    // 清除之前的定时器
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // 设置新的防抖定时器
    debounceTimer.current = setTimeout(() => {
      if (value.trim()) {
        fetchSuggestions(value);
      } else {
        setSuggestions([]);
      }
    }, 300); // 300ms防抖延迟
  };

  // 执行搜索的共享逻辑
  const executeSearch = (searchValue) => {
    const finalSearchValue = searchValue.trim();
    if (finalSearchValue) {
      setIsSelecting(false); // 重置选择状态
      setLocalValue(finalSearchValue); // 更新输入框显示
      if (onSearch) {
        onSearch(finalSearchValue);
      }
    }
  };

  // 处理选项选择
  const handleSelect = (value) => {
    console.log('Selected:', value);
    setIsSelecting(true); // 标记正在选择，防止触发input change
    executeSearch(value);
  };

  // 处理搜索提交
  const handleSearch = (value) => {
    setIsSelecting(true); // 标记为选择状态，防止重复触发
    const searchValue = value || localValue;
    executeSearch(searchValue);
  };


  // 处理输入框焦点
  const handleFocus = () => {
    console.log('Input focused');
    setIsSelecting(false); // 确保焦点时重置选择状态
    // 如果有内容则立即获取建议
    if (localValue.trim()) {
      fetchSuggestions(localValue);
    }
  };

  // 处理失去焦点（延时关闭以允许点击选项）
  const handleBlur = () => {
    // 延时关闭，给用户时间点击下拉选项
    setTimeout(() => {
      setSuggestions([]);
      setIsSelecting(false); // 重置选择状态
    }, 150);
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // 确保使用当前输入框的值，而不是自动选择建议项
      handleSearch(localValue);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setIsSelecting(false); // 重置选择状态
    }
  };

  // 处理AutoComplete的change事件
  const handleChange = (value) => {
    // 只有当不是通过程序设置值时才处理
    if (!isSelecting) {
      handleInputChange(value);
    }
  };


  // 格式化建议选项显示
  const formatOptions = () => {
    console.log('formatOptions called with suggestions:', suggestions);
    if (!suggestions || suggestions.length === 0) return [];
    
    // 按类别分组显示
    const groupedSuggestions = {};
    
    suggestions.forEach(item => {
      const category = item.category || '搜索建议';
      if (!groupedSuggestions[category]) {
        groupedSuggestions[category] = [];
      }
      groupedSuggestions[category].push({
        value: item.value,
        label: (
          <div className="suggestion-item">
            <span className="suggestion-text">{item.label}</span>
            {item.category && (
              <span className="suggestion-category">{item.category}</span>
            )}
          </div>
        )
      });
    });
    
    console.log('分组后的建议:', groupedSuggestions);
    
    // 转换为AutoComplete需要的格式
    const formattedOptions = Object.entries(groupedSuggestions).map(([category, items]) => ({
      label: category,
      options: items
    }));
    
    console.log('最终格式化选项:', formattedOptions);
    return formattedOptions;
  };

  return (
    <div className="search-with-suggestions">
      <AutoComplete
        ref={autoCompleteRef}
        value={localValue}
        options={formatOptions()}
        onSelect={handleSelect}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="search-autocomplete"
        classNames={{ popup: { root: 'search-suggestions-dropdown' } }}
        getPopupContainer={getPopupContainer}
        suffix={<SearchOutlined />}
        onKeyDown={handleKeyDown}
        notFoundContent={loading ? '搜索中...' : '暂无匹配结果'}
        // 禁用自动选择第一个选项的行为
        defaultActiveFirstOption={false}
        popupRender={(menu) => (
          <div className="suggestions-dropdown">
            {menu}
          </div>
        )}
      />
    </div>
  );
};

export default SearchWithSuggestions;