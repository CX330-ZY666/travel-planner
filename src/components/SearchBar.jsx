import { useState } from 'react';
import './SearchBar.css';

function SearchBar({ map, onAddDestination }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!keyword.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    if (!map) {
      alert('地图未加载完成，请稍后再试');
      return;
    }

    setLoading(true);

    // 使用高德地图 PlaceSearch 插件
    AMap.plugin('AMap.PlaceSearch', () => {
      const placeSearch = new AMap.PlaceSearch({
        pageSize: 10, // 每页显示10条
        city: '全国', // 搜索范围
      });

      placeSearch.search(keyword, (status, result) => {
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAdd = (poi) => {
    if (onAddDestination) {
      onAddDestination(poi);
    }
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="请输入景点名称或地址"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button 
          className="search-button"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

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
