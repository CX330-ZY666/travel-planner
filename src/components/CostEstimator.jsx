import { useState } from 'react';
import './CostEstimator.css';

function CostEstimator({ routeInfo }) {
  // 用户可自定义的参数
  const [fuelConsumption, setFuelConsumption] = useState(8); // 油耗 L/100km
  const [fuelPrice, setFuelPrice] = useState(7.5); // 油价 元/L
  const [tollRate, setTollRate] = useState(0.5); // 过路费 元/km
  const [showSettings, setShowSettings] = useState(false);

  if (!routeInfo) {
    return null;
  }

  const distanceKm = (routeInfo.distance / 1000).toFixed(1);
  
  // 计算油费
  const fuelCost = (distanceKm * fuelConsumption / 100 * fuelPrice).toFixed(2);
  
  // 计算过路费（假设70%是高速）
  const tollCost = (distanceKm * 0.7 * tollRate).toFixed(2);
  
  // 总费用
  const totalCost = (parseFloat(fuelCost) + parseFloat(tollCost)).toFixed(2);

  return (
    <div className="cost-estimator">
      <div className="cost-header">
        <div className="header-left">
          <span className="cost-icon">💰</span>
          <span className="header-title">费用预算</span>
        </div>
        <button 
          className="settings-button"
          onClick={() => setShowSettings(!showSettings)}
          title="自定义参数"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className="cost-settings">
          <div className="setting-item">
            <label>油耗 (L/100km)</label>
            <input 
              type="number" 
              value={fuelConsumption} 
              onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
            />
          </div>
          <div className="setting-item">
            <label>油价 (元/L)</label>
            <input 
              type="number" 
              value={fuelPrice} 
              onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
            />
          </div>
          <div className="setting-item">
            <label>过路费率 (元/km)</label>
            <input 
              type="number" 
              value={tollRate} 
              onChange={(e) => setTollRate(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
            />
          </div>
        </div>
      )}

      <div className="cost-breakdown">
        <div className="cost-item">
          <div className="cost-label">
            <span className="cost-emoji">⛽</span>
            油费
          </div>
          <div className="cost-value">¥{fuelCost}</div>
        </div>
        
        <div className="cost-item">
          <div className="cost-label">
            <span className="cost-emoji">🛣️</span>
            过路费
          </div>
          <div className="cost-value">¥{tollCost}</div>
        </div>
        
        <div className="cost-divider"></div>
        
        <div className="cost-total">
          <div className="total-label">预计总费用</div>
          <div className="total-value">¥{totalCost}</div>
        </div>
      </div>

      <div className="cost-note">
        * 费用仅供参考，实际费用可能因路况、驾驶习惯等因素有所差异
      </div>
    </div>
  );
}

export default CostEstimator;
