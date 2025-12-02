import { useEffect, useRef } from 'react';

function MapContainer({ onMapReady }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // 确保 AMap 已加载
    if (!window.AMap) {
      console.error('高德地图 API 未加载');
      return;
    }

    // 创建地图实例
    const map = new AMap.Map('map-container', {
      zoom: 13, // 缩放级别（3-18）
      center: [116.397428, 39.90923], // 中心点坐标 [经度, 纬度]，默认北京天安门
      viewMode: '2D', // 使用 2D 视图
      mapStyle: 'amap://styles/normal', // 地图样式：标准
    });

    mapInstanceRef.current = map;

    // 地图加载完成后的回调
    map.on('complete', () => {
      console.log('地图加载完成');
      if (onMapReady) {
        onMapReady(map);
      }

      // 添加定位功能
      AMap.plugin(['AMap.Geolocation'], () => {
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true, // 是否使用高精度定位
          timeout: 10000, // 超时时间（毫秒）
          position: 'RB', // 定位按钮的位置：RB 表示右下角
          offset: [10, 20], // 按钮偏移量
          zoomToAccuracy: true, // 定位成功后自动调整地图视野
        });

        map.addControl(geolocation);

        // 执行定位
        geolocation.getCurrentPosition((status, result) => {
          if (status === 'complete') {
            console.log('定位成功', result);
            const { lng, lat } = result.position;
            
            // 在定位点添加标记
            const marker = new AMap.Marker({
              position: [lng, lat],
              title: '当前位置',
              // 使用默认图标，避免资源加载问题
            });
            // 使用 mapInstanceRef.current 而不是 map 变量
            if (mapInstanceRef.current) {
              mapInstanceRef.current.add(marker);
            }
          } else {
            console.error('定位失败', result);
            alert('定位失败，将显示默认位置（北京）');
          }
        });
      });
    });

    // 组件卸载时销毁地图
    return () => {
      map.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次

  return (
    <div
      id="map-container"
      style={{
        width: '100%',
        height: '100vh',
      }}
    />
  );
}

export default MapContainer;
