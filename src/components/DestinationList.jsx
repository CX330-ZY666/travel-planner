import './DestinationList.css';

function DestinationList({ destinations, onRemove, onPlanRoute, onClearAll }) {
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
                <li key={dest.id} className="destination-item">
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
          
          <div className="action-buttons">
            {destinations.length >= 2 && (
              <button
                className="plan-route-button"
                onClick={onPlanRoute}
              >
                规划路线
              </button>
            )}
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
