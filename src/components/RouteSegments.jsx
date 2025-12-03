import './RouteSegments.css';

function RouteSegments({ routeInfo, destinations }) {
  if (!routeInfo || !routeInfo.segments || routeInfo.segments.length === 0) {
    return null;
  }

  // 格式化距离
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  // 格式化时间
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分`;
    }
    return `${minutes}分钟`;
  };

  // 根据action获取图标类名和显示文字
  const getActionInfo = (action, instruction) => {
    const actionMap = {
      'left': { icon: 'turn-left', text: '左转' },
      'right': { icon: 'turn-right', text: '右转' },
      'straight': { icon: 'straight', text: '直行' },
      'start': { icon: 'start', text: '出发' },
      'end': { icon: 'end', text: '到达' },
    };
    
    // 根据instruction智能判断
    if (instruction) {
      if (instruction.includes('左转')) return { icon: 'turn-left', text: instruction };
      if (instruction.includes('右转')) return { icon: 'turn-right', text: instruction };
      if (instruction.includes('直行')) return { icon: 'straight', text: instruction };
      if (instruction.includes('到达') || instruction.includes('终点')) return { icon: 'end', text: instruction };
      if (instruction.includes('出发') || instruction.includes('起点')) return { icon: 'start', text: instruction };
    }
    
    return actionMap[action] || { icon: 'straight', text: instruction || '继续前行' };
  };

  return (
    <div className="route-segments-amap">
      <div className="segments-header-amap">
        <div className="header-left">
          <span className="route-icon">🛣️</span>
          <span className="header-title">导航路线</span>
        </div>
        <span className="segments-count">{routeInfo.segments.length}个路段</span>
      </div>
      
      <div className="segments-timeline">
        {routeInfo.segments.map((segment, index) => {
          const actionInfo = getActionInfo(segment.action, segment.instruction);
          const isFirst = index === 0;
          const isLast = index === routeInfo.segments.length - 1;
          
          return (
            <div key={index} className={`timeline-item ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}`}>
              <div className="timeline-marker">
                <div className={`timeline-dot ${actionInfo.icon}`}></div>
                {!isLast && <div className="timeline-line"></div>}
              </div>
              
              <div className="timeline-content">
                <div className="step-instruction">{actionInfo.text}</div>
                {segment.road && (
                  <div className="step-road">经 {segment.road}</div>
                )}
                <div className="step-meta">
                  <span className="meta-distance">{formatDistance(segment.distance)}</span>
                  <span className="meta-divider">|</span>
                  <span className="meta-time">{formatDuration(segment.time)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RouteSegments;
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
