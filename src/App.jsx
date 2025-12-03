import { useState, useRef, useEffect } from 'react';
import MapContainer from './components/MapContainer';
import SearchBar from './components/SearchBar';
import DestinationList from './components/DestinationList';
import RouteInfo from './components/RouteInfo';
import RouteSegments from './components/RouteSegments';
import './App.css';

function App() {
  const [map, setMap] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeNeedsUpdate, setRouteNeedsUpdate] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [routePolicy, setRoutePolicy] = useState('LEAST_TIME'); // 路线策略
  const [isAnimating, setIsAnimating] = useState(false); // 动画状态
  const [hasRoute, setHasRoute] = useState(false); // 是否已规划路线
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' 或 'route'
  const markersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const animationMarkerRef = useRef(null); // 动画小车
  const [isRestoringData, setIsRestoringData] = useState(true);
  const saveTimeoutRef = useRef(null);
  const routePathRef = useRef(null); // 保存路线路径

  // 初始化时从 localStorage 恢复数据
  useEffect(() => {
    try {
      const savedDestinations = localStorage.getItem('travel_planner_destinations');
      if (savedDestinations) {
        const parsed = JSON.parse(savedDestinations);
        setDestinations(parsed);
        console.log('已恢复保存的行程', parsed);
      }
    } catch (error) {
      console.error('恢复行程失败', error);
    } finally {
      setIsRestoringData(false);
    }
  }, []);

  // 当 destinations 变化时自动保存
  useEffect(() => {
    if (!isRestoringData) {
      try {
        localStorage.setItem('travel_planner_destinations', JSON.stringify(destinations));
        console.log('行程已自动保存');
        
        // 显示保存提示
        setSaveStatus('✔️ 已保存');
        
        // 清除之前的定时器
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // 2秒后隐藏提示
        saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus('');
        }, 2000);
      } catch (error) {
        console.error('保存行程失败', error);
        setSaveStatus('❌ 保存失败');
      }
    }
  }, [destinations, isRestoringData]);

  // 地图加载完成后恢复标记
  useEffect(() => {
    if (map && destinations.length > 0 && markersRef.current.length === 0) {
      destinations.forEach((dest, index) => {
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
      
      // 调整地图视野以显示所有标记
      if (destinations.length > 0) {
        map.setFitView();
      }
      
      console.log('已恢复地图标记');
    }
  }, [map, destinations]);

  // 当路线策略变化时，如果已有路线则自动重新规划
  useEffect(() => {
    if (routePolylineRef.current && !isRestoringData) {
      handlePlanRoute();
    }
  }, [routePolicy]);

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
      setHasRoute(false);
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
      setHasRoute(false);
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
    setHasRoute(false);
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
      setHasRoute(false);
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
            setHasRoute(false);
          }
          
          alert('已将当前位置设为起点');
        } else {
          console.error('定位失败', result);
          alert('定位失败，请检查是否允许浏览器获取位置信息');
        }
      });
    });
  };

  // 播放路线动画
  const handlePlayAnimation = () => {
    if (!map || !routePathRef.current || routePathRef.current.length === 0) {
      alert('请先规划路线');
      return;
    }

    if (isAnimating) {
      alert('动画正在播放中');
      return;
    }

    setIsAnimating(true);

    // 创建动画小车标记
    if (animationMarkerRef.current) {
      map.remove(animationMarkerRef.current);
    }

    const marker = new AMap.Marker({
      position: routePathRef.current[0],
      icon: new AMap.Icon({
        size: new AMap.Size(32, 32),
        image: 'https://webapi.amap.com/images/car.png',
        imageSize: new AMap.Size(32, 32),
      }),
      offset: new AMap.Pixel(-16, -16),
    });

    map.add(marker);
    animationMarkerRef.current = marker;

    // 手动实现动画 - 每50ms移动一次
    const path = routePathRef.current;
    const totalDuration = 5000; // 5秒
    const steps = 100; // 100步
    const stepDuration = totalDuration / steps;
    const pointsPerStep = Math.max(1, Math.floor(path.length / steps));
    
    let currentStep = 0;
    const animationInterval = setInterval(() => {
      currentStep++;
      const currentIndex = Math.min(currentStep * pointsPerStep, path.length - 1);
      const currentPoint = path[currentIndex];
      
      if (currentPoint && marker) {
        marker.setPosition(currentPoint);
      }
      
      if (currentStep >= steps) {
        clearInterval(animationInterval);
        // 动画结束后清理
        setTimeout(() => {
          if (animationMarkerRef.current) {
            map.remove(animationMarkerRef.current);
            animationMarkerRef.current = null;
          }
          setIsAnimating(false);
        }, 500);
      }
    }, stepDuration);
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
      setHasRoute(false);
    }

    // 开始规划，清除提示状态
    setRouteNeedsUpdate(false);

    // 加载 Driving 插件
    AMap.plugin('AMap.Driving', () => {
      const driving = new AMap.Driving({
        policy: AMap.DrivingPolicy[routePolicy], // 使用选择的策略
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

            // 保存详细路线信息，包括分段数据
            setRouteInfo({
              distance: totalDistance,
              duration: totalDuration,
              policy: routePolicy,
              segments: result.routes[0].steps || [], // 分段信息
            });

            // 获取路线路径 - 尝试多种方式
            let routePath = null;
            
            // 方式1: 从 steps 中提取所有路径点
            if (result.routes[0] && result.routes[0].steps) {
              const allPoints = [];
              result.routes[0].steps.forEach(step => {
                if (step.path && step.path.length > 0) {
                  allPoints.push(...step.path);
                }
              });
              if (allPoints.length > 0) {
                routePath = allPoints;
                console.log('从 steps 中提取路径，点数:', allPoints.length);
              }
            }
            
            // 方式2: 直接使用 routes[0].path
            if (!routePath && result.routes[0] && result.routes[0].path) {
              routePath = result.routes[0].path;
              console.log('使用 routes[0].path，点数:', routePath.length);
            }

            if (routePath && routePath.length > 0) {
              // 绘制路线
              const polyline = new AMap.Polyline({
                path: routePath,
                strokeColor: '#1890ff',
                strokeWeight: 6,
                strokeOpacity: 0.8,
              });
              map.add(polyline);
              routePolylineRef.current = polyline;
              routePathRef.current = routePath; // 保存路径用于动画
              console.log('✅ 路径保存成功，点数:', routePath.length);
              
              // 设置已有路线状态
              setHasRoute(true);

              // 调整地图视野以显示整条路线
              map.setFitView();
            } else {
              console.error('⚠️ 未能获取路径数据');
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
          <div className="header-content">
            <h2>智能旅游路线规划</h2>
            {saveStatus && (
              <div className="save-status">{saveStatus}</div>
            )}
          </div>
        </div>
        
        {/* 搜索区域 - 固定在顶部 */}
        <div className="search-section-fixed">
          <SearchBar 
            map={map} 
            onAddDestination={handleAddDestination}
            onUseCurrentLocation={handleUseCurrentLocation}
          />
        </div>
        
        {/* 选项卡 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'itinerary' ? 'active' : ''}`}
            onClick={() => setActiveTab('itinerary')}
          >
            <span className="tab-icon">📍</span>
            行程管理
          </button>
          <button 
            className={`tab ${activeTab === 'route' ? 'active' : ''}`}
            onClick={() => setActiveTab('route')}
            disabled={!routeInfo}
          >
            <span className="tab-icon">🛣️</span>
            路线详情
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="sidebar-content">
          {activeTab === 'itinerary' ? (
            <div className="tab-content">
              <DestinationList 
                destinations={destinations}
                onRemove={handleRemoveDestination}
                onPlanRoute={handlePlanRoute}
                onClearAll={handleClearAll}
                onReorder={handleReorder}
                hasRoute={!!routeInfo}
                routePolicy={routePolicy}
                onRoutePolicyChange={setRoutePolicy}
                onPlayAnimation={handlePlayAnimation}
                isAnimating={isAnimating}
              />
              {routeNeedsUpdate && destinations.length >= 2 && (
                <div className="route-update-tip">
                  ⚠️ 行程已更新，请重新规划路线
                </div>
              )}
            </div>
          ) : (
            <div className="tab-content">
              <RouteInfo routeInfo={routeInfo} />
              <RouteSegments routeInfo={routeInfo} destinations={destinations} />
            </div>
          )}
        </div>
      </div>
      <div className="map-wrapper">
        <MapContainer onMapReady={handleMapReady} />
      </div>
    </div>
  );
}

export default App;
