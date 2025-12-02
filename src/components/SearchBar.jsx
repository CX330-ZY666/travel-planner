import { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

function SearchBar({ map, onAddDestination }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const autoCompleteRef = useRef(null);
  const searchBarRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // 初始化 AutoComplete
  useEffect(() => {
    if (map && !autoCompleteRef.current) {
      AMap.plugin('AMap.AutoComplete', () => {
        autoCompleteRef.current = new AMap.AutoComplete({
          city: '全国',
        });
      });
    }
  }, [map]);

  // 点击外部关闭建议列表
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 输入时触发自动完成
  const handleInputChange = (e) => {
    const value = e.target.value;
    setKeyword(value);

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 防抖：300ms 后执行搜索
    debounceTimerRef.current = setTimeout(() => {
      if (autoCompleteRef.current) {
        autoCompleteRef.current.search(value, (status, result) => {
          if (status === 'complete' && result.tips) {
            // 过滤掉没有location的结果
            const validTips = result.tips.filter(tip => tip.location);
            setSuggestions(validTips);
            setShowSuggestions(validTips.length > 0);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        });
      }
    }, 300);
  };

  // 选择建议项
  const handleSelectSuggestion = (tip) => {
    setKeyword(tip.name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // 自动触发搜索
    performSearch(tip.name);
  };

  const performSearch = (searchKeyword) => {
    const searchTerm = searchKeyword || keyword;
    
    if (!searchTerm.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    if (!map) {
      alert('地图未加载完成，请稍后再试');
      return;
    }

    // 关闭建议列表，开始搜索
    setLoading(true);
    setShowSuggestions(false);
    setSuggestions([]);

    // 使用高德地图 PlaceSearch 插件
    AMap.plugin('AMap.PlaceSearch', () => {
      const placeSearch = new AMap.PlaceSearch({
        pageSize: 10,
        city: '全国',
      });

      placeSearch.search(searchTerm, (status, result) => {
        setLoading(false);
        
        if (status === 'complete' && result.poiList && result.poiList.pois) {
          setResults(result.poiList.pois);
          console.log('搜索成功', result.poiList.pois);
        } else {
          setResults([]);
          alert('未找到相关地点，请尝试其他关键词');
        }
      });
    });
  };

  const handleSearch = () => {
    // 直接搜索当前输入的关键词
    performSearch();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      // 按回车直接搜索，不需要选择建议
      e.preventDefault();
      handleSearch();
    }
  };

  const handleAdd = (poi) => {
    if (onAddDestination) {
      onAddDestination(poi);
    }
  };

  return (
    <div className="search-bar" ref={searchBarRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="请输入景点名称或地址"
          value={keyword}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        <button 
          className="search-button"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {/* 自动提示列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          <ul className="suggestions-list">
            {suggestions.map((tip) => (
              <li
                key={tip.id}
                className="suggestion-item"
                onClick={() => handleSelectSuggestion(tip)}
              >
                <div className="suggestion-name">{tip.name}</div>
                {tip.district && (
                  <div className="suggestion-district">{tip.district}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            找到 {results.length} 个结果
          </div>
          <ul className="results-list">
            {results.map((poi) => (
              <li key={poi.id} className="result-item">
                <div className="result-info">
                  <div className="result-name">{poi.name}</div>
                  <div className="result-address">{poi.address}</div>
                </div>
                <button
                  className="add-button"
                  onClick={() => handleAdd(poi)}
                >
                  添加到行程
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchBar;
