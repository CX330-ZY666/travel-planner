import { useState } from 'react';
import './DestinationList.css';

function DestinationList({ destinations, onRemove, onPlanRoute, onClearAll, onReorder, hasRoute, routePolicy, onRoutePolicyChange, onPlayAnimation, isAnimating }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // 分享行程
  const handleShareTrip = () => {
    if (destinations.length === 0) {
      alert('请先添加目的地');
      return;
    }
    
    try {
      const shareData = {
        destinations,
        routePolicy,
        timestamp: Date.now()
      };
      
      const encoded = btoa(JSON.stringify(shareData));
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
      
      // 复制到剪贴板
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('🎉 分享链接已复制到剪贴板！\n\n您可以将链接分享给朋友，\n他们打开后就能看到您的行程！');
      }).catch(() => {
        // 备用方案：显示在对话框中
        prompt('请复制以下链接分享：', shareUrl);
      });
    } catch (error) {
      console.error('生成分享链接失败', error);
      alert('生成分享链接失败，请稍后再试');
    }
  };
  return (
    <div className="destination-list">
      <h3 className="list-title">我的行程</h3>
      
      {destinations.length === 0 ? (
        <div className="empty-message">
          暂无行程，请搜索并添加目的地
        </div>
      ) : (
        <>
          <div className="destinations-wrapper">
            <ul className="destinations">
              {destinations.map((dest, index) => (
                <li 
                  key={dest.id} 
                  className={`destination-item ${draggedIndex === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    if (draggedIndex !== null && draggedIndex !== index) {
                      onReorder(draggedIndex, index);
                    }
                  }}
                >
                  <div className="drag-handle" title="拖动排序">☰</div>
                  <div className="destination-number">{index + 1}</div>
                  <div className="destination-info">
                    <div className="destination-name">{dest.name}</div>
                    <div className="destination-address">{dest.address}</div>
                  </div>
                  <button
                    className="remove-button"
                    onClick={() => onRemove(dest.id)}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* 路线策略选择 */}
          {destinations.length >= 2 && (
            <div className="route-policy-selector">
              <label className="policy-label">路线策略：</label>
              <select 
                className="policy-select"
                value={routePolicy}
                onChange={(e) => onRoutePolicyChange(e.target.value)}
              >
                <option value="LEAST_TIME">最短时间</option>
                <option value="LEAST_DISTANCE">最短距离</option>
                <option value="LEAST_FEE">避免收费</option>
                <option value="LEAST_TRAFFIC">避免拥堵</option>
              </select>
            </div>
          )}
          
          <div className="action-buttons">
            {destinations.length >= 2 && (
              <button
                className="plan-route-button"
                onClick={onPlanRoute}
              >
                {hasRoute ? '重新规划' : '规划路线'}
              </button>
            )}
            {destinations.length >= 2 && onPlayAnimation && (
              <button
                className="animation-button"
                onClick={onPlayAnimation}
                disabled={isAnimating || !hasRoute}
                style={{
                  backgroundColor: hasRoute && !isAnimating ? '#722ed1' : '#d3adf7',
                  cursor: hasRoute && !isAnimating ? 'pointer' : 'not-allowed'
                }}
                title={!hasRoute ? '请先规划路线' : ''}
              >
                {isAnimating ? '播放中...' : '路线演示'}
              </button>
            )}
            <button
              className="share-button"
              onClick={handleShareTrip}
              title="生成分享链接"
            >
              🔗 分享行程
            </button>
            <button
              className="clear-all-button"
              onClick={onClearAll}
            >
              清空行程
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DestinationList;
