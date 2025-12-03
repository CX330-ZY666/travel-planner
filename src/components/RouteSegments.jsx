import { useState } from 'react';
import './RouteSegments.css';

function RouteSegments({ routeInfo, destinations }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!routeInfo || !routeInfo.segments || routeInfo.segments.length === 0) {
    return null;
  }

  const segments = routeInfo.segments;

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // 格式化距离
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} 米`;
    }
    return `${(meters / 1000).toFixed(1)} 公里`;
  };

  // 格式化时间
  const formatDuration = (seconds) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} 分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} 小时 ${mins} 分钟`;
  };

  // 获取转向图标
  const getActionIcon = (action) => {
    const icons = {
      '左转': '↰',
      '右转': '↱',
      '直行': '↑',
      '到达': '🏁',
      '出发': '🚩',
    };
    
    for (const [key, icon] of Object.entries(icons)) {
      if (action && action.includes(key)) {
        return icon;
      }
    }
    return '→';
  };

  return (
    <div className="route-segments">
      <div className="route-segments-header">
        <h3>详细路线</h3>
        <span className="segment-count">{segments.length} 个路段</span>
      </div>
      
      <div className="segments-list">
        {segments.map((segment, index) => (
          <div key={index} className="segment-item">
            <div 
              className="segment-summary"
              onClick={() => toggleExpand(index)}
            >
              <div className="segment-number">{index + 1}</div>
              <div className="segment-info">
                <div className="segment-instruction">
                  <span className="action-icon">{getActionIcon(segment.action)}</span>
                  <span className="action-text">{segment.instruction || segment.road || '继续前进'}</span>
                </div>
                <div className="segment-meta">
                  <span className="segment-distance">{formatDistance(segment.distance)}</span>
                  <span className="segment-divider">·</span>
                  <span className="segment-duration">{formatDuration(segment.time)}</span>
                </div>
              </div>
              <div className="segment-toggle">
                {expandedIndex === index ? '▲' : '▼'}
              </div>
            </div>
            
            {expandedIndex === index && (
              <div className="segment-details">
                {segment.road && (
                  <div className="detail-item">
                    <span className="detail-label">道路：</span>
                    <span className="detail-value">{segment.road}</span>
                  </div>
                )}
                {segment.orientation && (
                  <div className="detail-item">
                    <span className="detail-label">方向：</span>
                    <span className="detail-value">{segment.orientation}</span>
                  </div>
                )}
                {segment.assistant_action && (
                  <div className="detail-item">
                    <span className="detail-label">辅助：</span>
                    <span className="detail-value">{segment.assistant_action}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RouteSegments;
