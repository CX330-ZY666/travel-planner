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
    <div className="route-info">
      <div className="route-info-header">
        <h3>路线信息</h3>
      </div>
      <div className="route-info-content">
        <div className="info-item">
          <span className="info-label">路线策略</span>
          <span className="info-value policy-badge">{policyName}</span>
        </div>
        <div className="info-item">
          <span className="info-label">总距离</span>
          <span className="info-value">{distance} 公里</span>
        </div>
        <div className="info-item">
          <span className="info-label">预计时间</span>
          <span className="info-value">{timeText}</span>
        </div>
      </div>
    </div>
  );
}

export default RouteInfo;
