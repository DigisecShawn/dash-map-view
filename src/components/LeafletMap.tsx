import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Video, AlertTriangle, WifiOff } from 'lucide-react';
import { renderToString } from 'react-dom/server';

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  battery: number;
  signal: number;
  status: 'online' | 'offline';
}

interface LeafletMapProps {
  devices: Device[];
  selectedDevice: string | null;
  onDeviceSelect: (deviceId: string) => void;
  onDeviceClick?: (deviceId: string) => void;
  onDeviceDoubleClick?: (deviceId: string) => void;
}

interface MapConfig {
  provider: string;
  defaultZoom: number;
  centerLat: number;
  centerLng: number;
}

const defaultConfig: MapConfig = {
  provider: 'leaflet-osm',
  defaultZoom: 12,
  centerLat: 25.033,
  centerLng: 121.5654,
};

const getDeviceState = (device: Device) => {
  if (device.status === 'offline') return 'offline';
  if (device.battery <= 20) return 'low-battery';
  if (device.signal <= 20) return 'weak-signal';
  return 'healthy';
};

const getMarkerColor = (state: string) => {
  switch (state) {
    case 'offline': return '#6b7280';
    case 'low-battery': return '#f59e0b';
    case 'weak-signal': return '#3b82f6';
    default: return '#ee7800';
  }
};

const createCustomIcon = (device: Device, isSelected: boolean) => {
  const state = getDeviceState(device);
  const color = getMarkerColor(state);
  const size = isSelected ? 56 : 44;
  const iconSize = isSelected ? 24 : 20;
  
  const iconHtml = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 4px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.8)'};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${isSelected ? `0 0 20px ${color}80` : `0 4px 12px rgba(0,0,0,0.3)`};
      transition: all 0.3s ease;
      ${state === 'offline' ? 'filter: grayscale(0.5);' : ''}
    ">
      <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
        <path d="m22 8-6 4 6 4V8Z"/>
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
      </svg>
      ${state !== 'offline' ? `
        <div style="
          position: absolute;
          top: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
        "></div>
      ` : `
        <div style="
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: white;
          font-weight: bold;
        ">✕</div>
      `}
      ${state === 'low-battery' ? `
        <div style="
          position: absolute;
          bottom: -4px;
          left: -4px;
          background: #f59e0b;
          color: white;
          font-size: 9px;
          font-weight: bold;
          padding: 1px 4px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">${device.battery}%</div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-device-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Component to handle map view changes
const MapController = ({ selectedDevice, devices, config }: { 
  selectedDevice: string | null; 
  devices: Device[];
  config: MapConfig;
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedDevice) {
      const device = devices.find(d => d.id === selectedDevice);
      if (device) {
        map.flyTo([device.lat, device.lng], 15, { duration: 0.5 });
      }
    }
  }, [selectedDevice, devices, map]);

  return null;
};

const LeafletMap = ({ 
  devices, 
  selectedDevice, 
  onDeviceSelect, 
  onDeviceClick, 
  onDeviceDoubleClick 
}: LeafletMapProps) => {
  const [config, setConfig] = useState<MapConfig>(defaultConfig);

  useEffect(() => {
    // Load config from localStorage
    const saved = localStorage.getItem('map_config');
    if (saved) {
      const parsedConfig = JSON.parse(saved);
      setConfig({
        provider: parsedConfig.provider || defaultConfig.provider,
        defaultZoom: parsedConfig.defaultZoom || defaultConfig.defaultZoom,
        centerLat: parsedConfig.centerLat ?? defaultConfig.centerLat,
        centerLng: parsedConfig.centerLng ?? defaultConfig.centerLng,
      });
    }
  }, []);

  const getStatusLabel = (device: Device) => {
    const state = getDeviceState(device);
    switch (state) {
      case 'offline': return '離線';
      case 'low-battery': return `電量不足 ${device.battery}%`;
      case 'weak-signal': return `訊號弱 ${device.signal}%`;
      default: return '正常運作';
    }
  };

  const getStatusColor = (device: Device) => {
    const state = getDeviceState(device);
    switch (state) {
      case 'offline': return '#6b7280';
      case 'low-battery': return '#f59e0b';
      case 'weak-signal': return '#3b82f6';
      default: return '#22c55e';
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <style>{`
        .custom-device-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          background: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border: 1px solid hsl(var(--border));
        }
        .leaflet-popup-tip {
          background: hsl(var(--card));
        }
        .leaflet-popup-content {
          margin: 12px 16px;
        }
        .leaflet-container {
          background: hsl(var(--background));
        }
      `}</style>
      <MapContainer
        center={[config.centerLat, config.centerLng]}
        zoom={config.defaultZoom}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController selectedDevice={selectedDevice} devices={devices} config={config} />
        
        {devices.map((device) => (
          <Marker
            key={device.id}
            position={[device.lat, device.lng]}
            icon={createCustomIcon(device, selectedDevice === device.id)}
            eventHandlers={{
              click: () => {
                onDeviceSelect(device.id);
                onDeviceClick?.(device.id);
              },
              dblclick: () => {
                onDeviceDoubleClick?.(device.id);
              },
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ background: getStatusColor(device) }}
                  />
                  <span className="font-semibold text-base">{device.name}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">狀態:</span>
                    <span style={{ color: getStatusColor(device) }}>{getStatusLabel(device)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">電量:</span>
                    <span>{device.battery}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">訊號:</span>
                    <span>{device.signal}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{device.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => onDeviceDoubleClick?.(device.id)}
                  className="w-full mt-3 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  查看詳情
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
