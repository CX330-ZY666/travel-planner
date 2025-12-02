import { useState, useRef } from 'react';
import MapContainer from './components/MapContainer';
import SearchBar from './components/SearchBar';
import DestinationList from './components/DestinationList';
import RouteInfo from './components/RouteInfo';
import './App.css';

function App() {
  const [map, setMap] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const markersRef = useRef([]);
  const routePolylineRef = useRef(null);

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

  // 规划路线
  const handlePlanRoute = () => {
    if (destinations.length < 2) {
      alert('至少需要2个目的地才能规划路线');
      return;
    }

    if (!map) {
      alert('地图未加载完成，请稍后再试');
      return;
    }

    // 清除之前的路线
    if (routePolylineRef.current) {
      map.remove(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // 加载 Driving 插件
    AMap.plugin('AMap.Driving', () => {
      const driving = new AMap.Driving({
        policy: AMap.DrivingPolicy.LEAST_TIME, // 最短时间
        map: map,
        hideMarkers: true, // 隐藏默认标记，使用我们自己的标记
      });

      // 提取起点和终点
      const origin = destinations[0].location;
      const destination = destinations[destinations.length - 1].location;

      // 提取途经点（如果有）
      const waypoints = destinations.slice(1, -1).map(d => (
        new AMap.LngLat(d.location.lng, d.location.lat)
      ));

      // 开始规划路线
      const searchParams = [
        new AMap.LngLat(origin.lng, origin.lat),
        new AMap.LngLat(destination.lng, destination.lat)
      ];

      if (waypoints.length > 0) {
        searchParams.push({ waypoints });
      }

      driving.search(
        searchParams[0],
        searchParams[1],
        waypoints.length > 0 ? { waypoints } : {},
        (status, result) => {
          if (status === 'complete') {
            console.log('路线规划成功', result);
            
            // 计算总距离和总时间
            let totalDistance = 0;
            let totalDuration = 0;
            
            result.routes[0].steps.forEach(step => {
              totalDistance += step.distance;
              totalDuration += step.time;
            });

            setRouteInfo({
              distance: totalDistance,
              duration: totalDuration,
            });

            // 保存路线引用
            if (result.routes[0] && result.routes[0].path) {
              const polyline = new AMap.Polyline({
                path: result.routes[0].path,
                strokeColor: '#1890ff',
                strokeWeight: 6,
                strokeOpacity: 0.8,
              });
              map.add(polyline);
              routePolylineRef.current = polyline;

              // 调整地图视野以显示整条路线
              map.setFitView();
            }
          } else {
            console.error('路线规划失败', result);
            alert('路线规划失败，请检查目的地是否可达');
          }
        }
      );
    });
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
          <RouteInfo routeInfo={routeInfo} />
        </div>
      </div>
      <div className="map-wrapper">
        <MapContainer onMapReady={handleMapReady} />
      </div>
    </div>
  );
}

export default App;
