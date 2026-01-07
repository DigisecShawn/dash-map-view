import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const getStatusColor = (device: Device) => {
  const state = getDeviceState(device);
  switch (state) {
    case 'offline': return '#6b7280';
    case 'low-battery': return '#f59e0b';
    case 'weak-signal': return '#3b82f6';
    default: return '#22c55e';
  }
};

const getStatusLabel = (device: Device) => {
  const state = getDeviceState(device);
  switch (state) {
    case 'offline': return '離線';
    case 'low-battery': return `電量不足 ${device.battery}%`;
    case 'weak-signal': return `訊號弱 ${device.signal}%`;
    default: return '正常運作';
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
      box-shadow: ${isSelected ? '0 0 20px ' + color + '80' : '0 4px 12px rgba(0,0,0,0.3)'};
      transition: all 0.3s ease;
      ${state === 'offline' ? 'filter: grayscale(0.5);' : ''}
      position: relative;
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
          background: #22c55e;
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

const createPopupContent = (device: Device, onDoubleClick?: (id: string) => void) => {
  const statusColor = getStatusColor(device);
  const statusLabel = getStatusLabel(device);
  
  const container = document.createElement('div');
  container.className = 'min-w-[180px]';
  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: ${statusColor};"></div>
      <span style="font-weight: 600; font-size: 14px;">${device.name}</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #888;">狀態:</span>
        <span style="color: ${statusColor};">${statusLabel}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #888;">電量:</span>
        <span>${device.battery}%</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #888;">訊號:</span>
        <span>${device.signal}%</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #888;">ID:</span>
        <span style="font-family: monospace; font-size: 11px;">${device.id}</span>
      </div>
    </div>
    <button id="popup-btn-${device.id}" style="
      width: 100%;
      margin-top: 12px;
      padding: 6px 12px;
      background: hsl(30, 100%, 47%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    ">查看詳情</button>
  `;
  
  // Add click handler after the element is in the DOM
  setTimeout(() => {
    const btn = document.getElementById(`popup-btn-${device.id}`);
    if (btn && onDoubleClick) {
      btn.onclick = () => onDoubleClick(device.id);
    }
  }, 0);
  
  return container;
};

const LeafletMap = ({ 
  devices, 
  selectedDevice, 
  onDeviceSelect, 
  onDeviceClick, 
  onDeviceDoubleClick 
}: LeafletMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);

  // Get config from localStorage synchronously for initial render
  const getInitialConfig = (): MapConfig => {
    try {
      const saved = localStorage.getItem('map_config');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        return {
          provider: parsedConfig.provider || defaultConfig.provider,
          defaultZoom: parsedConfig.defaultZoom || defaultConfig.defaultZoom,
          centerLat: parsedConfig.centerLat ?? defaultConfig.centerLat,
          centerLng: parsedConfig.centerLng ?? defaultConfig.centerLng,
        };
      }
    } catch (e) {
      console.error('Error parsing map config:', e);
    }
    return defaultConfig;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Clean up existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const config = getInitialConfig();
    
    const map = L.map(mapContainerRef.current, {
      center: [config.centerLat, config.centerLng],
      zoom: config.defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;
    setIsMapReady(true);

    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  // Update markers when devices change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Remove old markers that are no longer in devices
    markersRef.current.forEach((marker, id) => {
      if (!devices.find(d => d.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    devices.forEach(device => {
      const existingMarker = markersRef.current.get(device.id);
      const isSelected = selectedDevice === device.id;

      if (existingMarker) {
        // Update existing marker
        existingMarker.setLatLng([device.lat, device.lng]);
        existingMarker.setIcon(createCustomIcon(device, isSelected));
      } else {
        // Create new marker
        const marker = L.marker([device.lat, device.lng], {
          icon: createCustomIcon(device, isSelected),
        });

        marker.on('click', () => {
          onDeviceSelect(device.id);
          onDeviceClick?.(device.id);
        });

        marker.on('dblclick', () => {
          onDeviceDoubleClick?.(device.id);
        });

        marker.bindPopup(() => createPopupContent(device, onDeviceDoubleClick));
        marker.addTo(map);
        markersRef.current.set(device.id, marker);
      }
    });
  }, [devices, selectedDevice, isMapReady, onDeviceSelect, onDeviceClick, onDeviceDoubleClick]);

  // Handle selected device change - fly to it
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDevice) return;

    const device = devices.find(d => d.id === selectedDevice);
    if (device) {
      map.flyTo([device.lat, device.lng], 15, { duration: 0.5 });
    }
  }, [selectedDevice, devices]);

  // Update marker icons when selection changes
  useEffect(() => {
    devices.forEach(device => {
      const marker = markersRef.current.get(device.id);
      if (marker) {
        marker.setIcon(createCustomIcon(device, selectedDevice === device.id));
      }
    });
  }, [selectedDevice, devices]);

  return (
    <div className="absolute inset-0 leaflet-map-wrapper">
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />
    </div>
  );
};

export default LeafletMap;