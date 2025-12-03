import './HistoryList.css';

function formatDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export default function HistoryList({ history, onLoad, onDelete, onClearAll }) {
  return (
    <div className="history-list">
      <div className="history-header">
        <h3>历史行程</h3>
        {history.length > 0 && (
          <button className="clear-history" onClick={onClearAll}>清空历史</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">暂无历史记录</div>
      ) : (
        <ul className="history-items">
          {history.map((item, idx) => (
            <li key={item.id} className="history-item">
              <div className="item-main">
                <div className="item-title">
                  <span className="item-date">{formatDate(item.createdAt)}</span>
                  <span className="item-count">{item.destinations.length} 个目的地</span>
                </div>
                <div className="item-meta">
                  <span>总距离：{(item.routeInfo?.distance/1000).toFixed(1)} km</span>
                  <span> · </span>
                  <span>用时：{Math.floor((item.routeInfo?.duration||0)/60)} 分钟</span>
                </div>
                <div className="item-dests" title={item.destinations.map(d=>d.name).join(' → ')}>
                  {item.destinations.map(d=>d.name).join(' → ')}
                </div>
              </div>
              <div className="item-actions">
                <button className="load-btn" onClick={() => onLoad(item)}>载入</button>
                <button className="del-btn" onClick={() => onDelete(item.id)}>删除</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
