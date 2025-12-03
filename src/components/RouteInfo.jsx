import './RouteInfo.css';

function RouteInfo({ routeInfo }) {
  if (!routeInfo) {
    return null;
  }

  // 将距离从米转换为公里
  const distance = (routeInfo.distance / 1000).toFixed(1);
  
  // 将时间从秒转换为小时和分钟
  const hours = Math.floor(routeInfo.duration / 3600);
  const minutes = Math.floor((routeInfo.duration % 3600) / 60);
  
  const timeText = hours > 0 
    ? `${hours}小时${minutes}分钟` 
    : `${minutes}分钟`;

  // 策略名称映射
  const policyNames = {
    'LEAST_TIME': '最短时间',
    'LEAST_DISTANCE': '最短距离',
    'LEAST_FEE': '避免收费',
    'LEAST_TRAFFIC': '避免拥堵',
  };
  
  const policyName = policyNames[routeInfo.policy] || '最短时间';

  return (
    <div className="route-info-amap">
      <div className="route-summary">
        <div className="summary-item distance">
          <div className="summary-icon">📍</div>
          <div className="summary-content">
            <div className="summary-label">总距离</div>
            <div className="summary-value">{distance}km</div>
          </div>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item time">
          <div className="summary-icon">⏱️</div>
          <div className="summary-content">
            <div className="summary-label">预计时间</div>
            <div className="summary-value">{timeText}</div>
          </div>
        </div>
      </div>
      <div className="route-strategy">
        <span className="strategy-label">当前策略</span>
        <span className="strategy-badge">{policyName}</span>
      </div>
    </div>
  );
}

export default RouteInfo;
