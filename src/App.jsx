import { useState, useRef, useEffect } from 'react';
import MapContainer from './components/MapContainer';
import SearchBar from './components/SearchBar';
import DestinationList from './components/DestinationList';
import RouteInfo from './components/RouteInfo';
import RouteSegments from './components/RouteSegments';
import CostEstimator from './components/CostEstimator';
import HistoryList from './components/HistoryList';
import DayTimeline from './components/DayTimeline';
import './App.css';

function App() {
  const [map, setMap] = useState(null);
  const [destinations, setDestinations] = useState([]); // 当前激活“天”的目的地
  const [days, setDays] = useState([]); // 多日数据：[{id,name,date,items:Destination[]}]
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeNeedsUpdate, setRouteNeedsUpdate] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [routePolicy, setRoutePolicy] = useState('LEAST_TIME'); // 路线策略
  const [isAnimating, setIsAnimating] = useState(false); // 动画状态
  const [hasRoute, setHasRoute] = useState(false); // 是否已规划路线
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'route' | 'history'
  const [history, setHistory] = useState([]); // 本地历史记录
  // 导航/路况/语音
  const [trafficOn, setTrafficOn] = useState(false);
  const trafficLayerRef = useRef(null);
  const [ttsOn, setTtsOn] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const ttsAbortRef = useRef(false);
  const ttsUtterRef = useRef(null);

  const markersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const animationMarkerRef = useRef(null); // 动画小车
  const [isRestoringData, setIsRestoringData] = useState(true);
  const saveTimeoutRef = useRef(null);
  const routePathRef = useRef(null); // 保存路线路径

  // 初始化：优先解析分享链接；否则读取本地 days 或 destinations；加载历史
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('share');
      let initialDest = [];
      if (sharedData) {
        try {
          const decoded = decodeURIComponent(atob(sharedData));
          const parsed = JSON.parse(decoded);
          initialDest = parsed.destinations || [];
          if (parsed.routePolicy) setRoutePolicy(parsed.routePolicy);
          window.history.replaceState({}, '', window.location.pathname);
        } catch (e) { console.error('解析分享链接失败', e); }
      } else {
        // 读取多日优先
        const savedDays = localStorage.getItem('travel_planner_days');
        if (savedDays) {
          const d = JSON.parse(savedDays);
          setDays(d);
          const idx = 0;
          setActiveDayIndex(idx);
          setDestinations(d[idx]?.items || []);
        } else {
          const savedDestinations = localStorage.getItem('travel_planner_destinations');
          if (savedDestinations) initialDest = JSON.parse(savedDestinations);
        }
      }
      // 如有 initialDest，用 Day 1 包装
      if (initialDest && initialDest.length >= 0) {
        const initDays = [{ id: `day_${Date.now()}`, name: 'Day 1', date: '', items: initialDest }];
        setDays(initDays);
        setActiveDayIndex(0);
        setDestinations(initialDest);
      }
      // 历史
      try { const savedHistory = localStorage.getItem('travel_planner_history'); if (savedHistory) setHistory(JSON.parse(savedHistory)); } catch {}
    } catch (error) {
      console.error('恢复行程失败', error);
    } finally {
      setIsRestoringData(false);
    }
  }, []);

  // 当 destinations 或 days 变化时自动保存
  useEffect(() => {
    if (!isRestoringData) {
      try {
        // 保存当前天
        localStorage.setItem('travel_planner_destinations', JSON.stringify(destinations));
        // 保存多日
        localStorage.setItem('travel_planner_days', JSON.stringify(days));
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
  }, [destinations, days, isRestoringData]);

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

  // 路况图层开关
  useEffect(() => {
    if (!map) return;
    if (trafficOn) {
      try {
        if (!trafficLayerRef.current) {
          trafficLayerRef.current = new AMap.TileLayer.Traffic({ zIndex: 10 });
        }
        map.add(trafficLayerRef.current);
      } catch (e) {
        console.warn('开启路况失败', e);
      }
    } else {
      if (trafficLayerRef.current) {
        try { map.remove(trafficLayerRef.current); } catch {}
      }
    }
  }, [trafficOn, map]);

  // 路线或天切换时，自动停止播报
  useEffect(() => {
    if (!ttsOn && !ttsSpeaking) return;
    try { window.speechSynthesis?.cancel(); } catch {}
    ttsAbortRef.current = true;
    setTtsSpeaking(false);
  }, [activeDayIndex, routeInfo]);

  // 监听 ttsOn，关闭时立即打断
  useEffect(() => {
    if (!ttsOn) {
      try { window.speechSynthesis?.cancel(); } catch {}
      ttsAbortRef.current = true;
      setTtsSpeaking(false);
    }
  }, [ttsOn]);

  // 当路线策略变化时，如果已有路线则自动重新规划
  useEffect(() => {
    if (routePolylineRef.current && !isRestoringData) {
      handlePlanRoute();
    }
  }, [routePolicy]);


  // 语音播报当前路线指令
  const handleSpeakRoute = () => {
    if (!routeInfo || !routeInfo.segments || routeInfo.segments.length === 0) return;
    const synth = window.speechSynthesis;
    if (!synth) {
      alert('当前浏览器不支持语音播报');
      return;
    }
    // 停止
    if (ttsSpeaking) {
      try { synth.cancel(); } catch {}
      ttsAbortRef.current = true;
      setTtsSpeaking(false);
      return;
    }
    if (!ttsOn) {
      setTtsOn(true);
    }
    ttsAbortRef.current = false;
    const steps = routeInfo.segments.map(s => s.instruction || '直行');
    let idx = 0;
    setTtsSpeaking(true);
    const speakNext = () => {
      if (ttsAbortRef.current) { setTtsSpeaking(false); return; }
      if (idx >= steps.length) { setTtsSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(steps[idx]);
      ttsUtterRef.current = u;
      u.lang = 'zh-CN';
      u.rate = Math.max(0.7, Math.min(2, ttsRate || 1));
      u.onend = () => { if (ttsAbortRef.current) { setTtsSpeaking(false); return; } idx += 1; speakNext(); };
      u.onerror = () => { if (ttsAbortRef.current) { setTtsSpeaking(false); return; } idx += 1; speakNext(); };
      if (ttsAbortRef.current) { setTtsSpeaking(false); try{synth.cancel();}catch{} return; }
      synth.speak(u);
    };
    speakNext();
  };

  const handleMapReady = (mapInstance) => {
    setMap(mapInstance);
    console.log('地图已准备好', mapInstance);
  };

  // 工具：更新当前天 items，并同步 destinations
  const updateCurrentDayItems = (updater) => {
    setDays(prev => {
      const copy = [...prev];
      const cur = copy[activeDayIndex] || { id:`day_${Date.now()}`, name:'Day 1', date:'', items:[] };
      const newItems = typeof updater === 'function' ? updater(cur.items || []) : updater;
      copy[activeDayIndex] = { ...cur, items: newItems };
      setDestinations(newItems);
      return copy;
    });
  };

  // 添加目的地（当前天）
  const handleAddDestination = (poi) => {
    // 检查是否已存在
    if ((destinations || []).some(d => d.id === poi.id)) {
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

    updateCurrentDayItems((items) => [...items, destination]);

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

  // 删除目的地（当前天）
  const handleRemoveDestination = (id) => {
    const index = destinations.findIndex(d => d.id === id);
    if (index === -1) return;

    // 从地图上移除标记
    if (map && markersRef.current[index]) {
      map.remove(markersRef.current[index]);
      markersRef.current.splice(index, 1);
    }

    // 从状态中移除
    updateCurrentDayItems((items) => items.filter(d => d.id !== id));

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

  // 清空当前天行程
  const handleClearAll = () => {
    if ((destinations || []).length === 0) return;

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

    // 从状态中移除
    updateCurrentDayItems(() => []);
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

    // 手动实现动画
    const path = routePathRef.current;
    const totalDuration = 8000; // 8秒，让动画更流畅
    const totalPoints = path.length;
    const stepDuration = 50; // 每50ms更新一次
    const totalSteps = Math.floor(totalDuration / stepDuration);
    
    // 计算两点之间的角度（用于旋转小车）
    const calculateAngle = (start, end) => {
      if (!start || !end) return 0;
      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      // 计算角度（弧度转角度），0度为正东，顺时针增加
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return angle;
    };
    
    let currentStep = 0;
    const animationInterval = setInterval(() => {
      currentStep++;
      
      // 根据当前步数计算应该在路径的哪个位置（线性插值）
      const progress = currentStep / totalSteps;
      const currentIndex = Math.min(Math.floor(progress * totalPoints), totalPoints - 1);
      const currentPoint = path[currentIndex];
      
      if (currentPoint && marker) {
        marker.setPosition(currentPoint);
        
        // 计算小车朝向（如果有下一个点）
        const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
        if (nextIndex > currentIndex) {
          const nextPoint = path[nextIndex];
          const angle = calculateAngle(currentPoint, nextPoint);
          marker.setAngle(angle);
        }
        
        // 调整地图视野，让标记始终在视野内
        map.setCenter(currentPoint);
      }
      
      // 确保动画完整播放到最后一个点
      if (currentStep >= totalSteps || currentIndex >= totalPoints - 1) {
        // 确保到达终点
        marker.setPosition(path[totalPoints - 1]);
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

              // 保存历史记录（最多10条）
              try {
                const record = {
                  id: `rec_${Date.now()}`,
                  createdAt: Date.now(),
                  destinations: [...destinations],
                  routeInfo: { distance: totalDistance, duration: totalDuration, policy: routePolicy },
                };
                const newHistory = [record, ...(history || [])].slice(0, 10);
                setHistory(newHistory);
                localStorage.setItem('travel_planner_history', JSON.stringify(newHistory));
              } catch (e) {
                console.warn('保存历史失败', e);
              }

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

  // 多日：UI 事件
  const handleAddDay = () => {
    const newDay = { id: `day_${Date.now()}`, name: `Day ${days.length + 1}`, date: '', items: [] };
    const newDays = [...days, newDay];
    setDays(newDays);
    setActiveDayIndex(newDays.length - 1);
    setDestinations([]);
    // 清理地图标记
    if (map && markersRef.current.length > 0) { map.remove(markersRef.current); markersRef.current = []; }
  };
  const handleRenameDay = (index) => {
    const cur = days[index];
    const name = window.prompt('重命名', cur?.name || `Day ${index+1}`);
    if (!name) return;
    const copy = [...days];
    copy[index] = { ...cur, name };
    setDays(copy);
  };
  const handleRemoveDay = (index) => {
    if (days.length <= 1) { alert('至少保留一天'); return; }
    if (!window.confirm('确定删除该天的行程吗？')) return;
    const copy = days.filter((_,i)=>i!==index);
    setDays(copy);
    const newIdx = Math.max(0, index-1);
    setActiveDayIndex(newIdx);
    setDestinations(copy[newIdx]?.items || []);
    if (map && markersRef.current.length > 0) { map.remove(markersRef.current); markersRef.current = []; }
  };
  const handleSwitchDay = (index) => {
    setActiveDayIndex(index);
    setDestinations(days[index]?.items || []);
    // 清理并根据新天 items 由 useEffect 恢复标记
    if (map && markersRef.current.length > 0) { map.remove(markersRef.current); markersRef.current = []; }
    setRouteInfo(null);
    setHasRoute(false);
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
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            disabled={(history || []).length === 0}
          >
            <span className="tab-icon">🕘</span>
            历史记录
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="sidebar-content">
          {activeTab === 'itinerary' ? (
            <div className="tab-content">
              {/* 多日日签 */}
              <div className="days-bar" style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:10}}>
                {days.map((d, idx) => (
                  <button key={d.id} onClick={()=>handleSwitchDay(idx)} className={idx===activeDayIndex?'active':''} style={{padding:'6px 10px', borderRadius:16, border: idx===activeDayIndex?'1px solid #1677ff':'1px solid #d9d9d9', background: idx===activeDayIndex?'#e6f4ff':'#fff', color:'#333'}}>
                    {d.name || `Day ${idx+1}`}
                  </button>
                ))}
                <button onClick={handleAddDay} title="添加一天" style={{padding:'6px 10px', borderRadius:16, border:'1px dashed #d9d9d9', background:'#fff'}}>+ 添加一天</button>
                {days[activeDayIndex] && (
                  <>
                    <button onClick={()=>handleRenameDay(activeDayIndex)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #d9d9d9', background:'#fff'}}>重命名</button>
                    <button onClick={()=>handleRemoveDay(activeDayIndex)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #ffccc7', background:'#fff', color:'#ff4d4f'}}>删除当天</button>
                  </>
                )}
              </div>

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
                onUpdateDestination={(id, patch)=>{
                  updateCurrentDayItems(items => items.map(d => d.id===id ? { ...d, ...patch } : d));
                }}
              />
              {routeNeedsUpdate && destinations.length >= 2 && (
                <div className="route-update-tip">
                  ⚠️ 行程已更新，请重新规划路线
                </div>
              )}
            </div>
          ) : activeTab === 'route' ? (
            <div className="tab-content">
              <RouteInfo routeInfo={routeInfo} />

              {/* 每日时间轴 */}
              <DayTimeline destinations={destinations} />

              {/* 导航与路况控制 */}
              <div className="route-controls" style={{marginTop: 10, marginBottom: 10, background:'#fff', border:'1px solid #f0f0f0', borderRadius:8, padding:12}}>
                <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8}}>
                  <label style={{display:'flex', alignItems:'center', gap:6}}>
                    <input type="checkbox" checked={trafficOn} onChange={(e)=>setTrafficOn(e.target.checked)} /> 实时路况
                  </label>
                  <label style={{display:'flex', alignItems:'center', gap:6}}>
                    <input type="checkbox" checked={ttsOn} onChange={(e)=>{ 
                      const on = e.target.checked;
                      setTtsOn(on);
                      if(!on){
                        ttsAbortRef.current = true;
                        try{ window.speechSynthesis?.cancel(); }catch{}
                        setTtsSpeaking(false);
                      }
                    }} /> 语音播报
                  </label>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <span style={{fontSize:12, color:'#666'}}>语速</span>
                    <input type="range" min="0.7" max="1.8" step="0.1" value={ttsRate} onChange={(e)=>setTtsRate(parseFloat(e.target.value))} style={{width:120}} />
                  </div>
                  <button onClick={handleSpeakRoute} disabled={!routeInfo || !ttsOn} style={{padding:'8px 12px', background:'#faad14', color:'#fff', border:'none', borderRadius:6, cursor: (routeInfo && ttsOn)?'pointer':'not-allowed'}}>{ttsSpeaking?'停止播报':'播报路线指令'}</button>
                </div>
              </div>

              <CostEstimator routeInfo={routeInfo} />
              <RouteSegments routeInfo={routeInfo} destinations={destinations} />
            </div>
          ) : (
            <div className="tab-content">
              <HistoryList 
                history={history}
                onLoad={(item) => {
                  setDestinations(item.destinations || []);
                  setRouteInfo(item.routeInfo || null);
                  setActiveTab('itinerary');
                  setRouteNeedsUpdate(true);
                }}
                onDelete={(id) => {
                  const newHistory = (history || []).filter(h => h.id !== id);
                  setHistory(newHistory);
                  localStorage.setItem('travel_planner_history', JSON.stringify(newHistory));
                }}
                onClearAll={() => {
                  if (window.confirm('确认清空所有历史记录？')) {
                    setHistory([]);
                    localStorage.removeItem('travel_planner_history');
                  }
                }}
              />
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
