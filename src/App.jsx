import { useState } from 'react';
import MapContainer from './components/MapContainer';
import './App.css';

function App() {
  const [map, setMap] = useState(null);

  const handleMapReady = (mapInstance) => {
    setMap(mapInstance);
    console.log('地图已准备好', mapInstance);
  };

  return (
    <div className="app">
      <MapContainer onMapReady={handleMapReady} />
    </div>
  );
}

export default App;
