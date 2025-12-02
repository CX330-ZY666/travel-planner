import { useState, useRef } from 'react';
import MapContainer from './components/MapContainer';
import SearchBar from './components/SearchBar';
import DestinationList from './components/DestinationList';
import './App.css';

function App() {
  const [map, setMap] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const markersRef = useRef([]);

  const handleMapReady = (mapInstance) => {
    setMap(mapInstance);
    console.log('地图已准备好', mapInstance);
  };

  // 添加目的地
  const handleAddDestination = (poi) => {
    // 检查是否已存在
    if (destinations.some(d => d.id === poi.id)) {
      alert('该目的地已在行程中');
      return;
    }

    // 检查数量限制
    if (destinations.length >= 10) {
      alert('最多只能添加10个目的地');
      return;
    }

    const destination = {
      id: poi.id,
      name: poi.name,
      address: poi.address || '无地址信息',
      location: {
        lng: poi.location.lng,
        lat: poi.location.lat,
      },
    };

    setDestinations([...destinations, destination]);

    // 在地图上添加标记
    if (map) {
      const marker = new AMap.Marker({
        position: [destination.location.lng, destination.location.lat],
        title: destination.name,
        label: {
          content: `${destinations.length + 1}`,
          direction: 'top',
        },
      });
      map.add(marker);
      markersRef.current.push(marker);

      // 移动地图中心到新添加的目的地
      map.setCenter([destination.location.lng, destination.location.lat]);
    }
  };

  // 删除目的地
  const handleRemoveDestination = (id) => {
    const index = destinations.findIndex(d => d.id === id);
    if (index === -1) return;

    // 从地图上移除标记
    if (map && markersRef.current[index]) {
      map.remove(markersRef.current[index]);
      markersRef.current.splice(index, 1);
    }

    // 从状态中移除
    setDestinations(destinations.filter(d => d.id !== id));

    // 更新剩余标记的序号
    markersRef.current.forEach((marker, idx) => {
      marker.setLabel({
        content: `${idx + 1}`,
        direction: 'top',
      });
    });
  };

  // 规划路线（后续实现）
  const handlePlanRoute = () => {
    alert('路线规划功能将在下一阶段实现');
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>智能旅游路线规划</h2>
        </div>
        <div className="sidebar-content">
          <SearchBar map={map} onAddDestination={handleAddDestination} />
          <DestinationList 
            destinations={destinations}
            onRemove={handleRemoveDestination}
            onPlanRoute={handlePlanRoute}
          />
        </div>
      </div>
      <div className="map-wrapper">
        <MapContainer onMapReady={handleMapReady} />
      </div>
    </div>
  );
}

export default App;
