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
  const [routeNeedsUpdate, setRouteNeedsUpdate] = useState(false);
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

    // 如果已规划过路线，清除路线并提示
    if (routePolylineRef.current) {
      map.remove(routePolylineRef.current);
      routePolylineRef.current = null;
      setRouteInfo(null);
      setRouteNeedsUpdate(true);
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

    // 如果已规划过路线，清除路线并提示
    if (routePolylineRef.current) {
      map.remove(routePolylineRef.current);
      routePolylineRef.current = null;
      setRouteInfo(null);
      setRouteNeedsUpdate(true);
    }
  };

  // 清空所有行程
  const handleClearAll = () => {
    if (destinations.length === 0) return;

    // 确认操作
    if (!window.confirm('确定要清空所有行程吗？')) {
      return;
    }

    // 移除所有地图标记
    if (map && markersRef.current.length > 0) {
      map.remove(markersRef.current);
      markersRef.current = [];
    }

    // 清除路线
    if (routePolylineRef.current) {
      map.remove(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // 清空状态
    setDestinations([]);
    setRouteInfo(null);
    setRouteNeedsUpdate(false);
  };

  // 重新排序目的地
  const handleReorder = (fromIndex, toIndex) => {
    const newDestinations = [...destinations];
    const [movedItem] = newDestinations.splice(fromIndex, 1);
    newDestinations.splice(toIndex, 0, movedItem);

    // 更新目的地列表
    setDestinations(newDestinations);

    // 更新地图标记
    if (map) {
      // 移除所有旧标记
      if (markersRef.current.length > 0) {
        map.remove(markersRef.current);
        markersRef.current = [];
      }

      // 重新添加所有标记
      newDestinations.forEach((dest, index) => {
        const marker = new AMap.Marker({
          position: [dest.location.lng, dest.location.lat],
          title: dest.name,
          label: {
            content: `${index + 1}`,
            direction: 'top',
          },
        });
        map.add(marker);
        markersRef.current.push(marker);
      });
    }

    // 如果已经规划过路线，清除路线并提示重新规划
    if (routePolylineRef.current) {
      map.remove(routePolylineRef.current);
      routePolylineRef.current = null;
      setRouteInfo(null);
      setRouteNeedsUpdate(true);
      alert('顺序已调整，请重新规划路线');
    }
  };

  // 使用当前位置作为起点
  const handleUseCurrentLocation = () => {
    if (!map) {
      alert('地图未加载完成，请稍后再试');
      return;
    }

    // 使用高德定位插件
    AMap.plugin('AMap.Geolocation', () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      geolocation.getCurrentPosition((status, result) => {
        if (status === 'complete') {
          const { lng, lat } = result.position;
          const address = result.formattedAddress || '当前位置';

          const currentLocation = {
            id: 'current_location_' + Date.now(),
            name: '当前位置',
            address: address,
            location: { lng, lat },
          };

          // 如果已有目的地，插入到开头；否则直接添加
          const newDestinations = [currentLocation, ...destinations];
          
          // 移除所有旧标记
          if (markersRef.current.length > 0) {
            map.remove(markersRef.current);
            markersRef.current = [];
          }

          // 重新添加所有标记
          newDestinations.forEach((dest, index) => {
            const marker = new AMap.Marker({
              position: [dest.location.lng, dest.location.lat],
              title: dest.name,
              label: {
                content: `${index + 1}`,
                direction: 'top',
              },
            });
            map.add(marker);
            markersRef.current.push(marker);
          });

          setDestinations(newDestinations);
          
          // 移动地图中心到当前位置
          map.setCenter([lng, lat]);
          
          // 如果已规划过路线，清除路线
          if (routePolylineRef.current) {
            map.remove(routePolylineRef.current);
            routePolylineRef.current = null;
            setRouteInfo(null);
            setRouteNeedsUpdate(true);
          }
          
          alert('已将当前位置设为起点');
        } else {
          console.error('定位失败', result);
          alert('定位失败，请检查是否允许浏览器获取位置信息');
        }
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

    // 开始规划，清除提示状态
    setRouteNeedsUpdate(false);

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
          <div className="search-section">
            <SearchBar 
              map={map} 
              onAddDestination={handleAddDestination}
              onUseCurrentLocation={handleUseCurrentLocation}
            />
          </div>
          <div className="itinerary-section">
            <DestinationList 
              destinations={destinations}
              onRemove={handleRemoveDestination}
              onPlanRoute={handlePlanRoute}
              onClearAll={handleClearAll}
              onReorder={handleReorder}
              hasRoute={!!routePolylineRef.current}
            />
            {routeNeedsUpdate && destinations.length >= 2 && (
              <div className="route-update-tip">
                ⚠️ 行程已更新，请重新规划路线
              </div>
            )}
            <RouteInfo routeInfo={routeInfo} />
          </div>
        </div>
      </div>
      <div className="map-wrapper">
        <MapContainer onMapReady={handleMapReady} />
      </div>
    </div>
  );
}

export default App;
