import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Video } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  battery: number;
  signal: number;
}

interface MapProps {
  devices: Device[];
  selectedDevice: string | null;
  onDeviceSelect: (deviceId: string) => void;
  apiKey: string;
}

const Map = ({ devices, selectedDevice, onDeviceSelect, apiKey }: MapProps) => {
  // 台灣中心位置
  const center = { lat: 25.0330, lng: 121.5654 };

  if (!apiKey) {
    return (
      <div className="relative w-full h-full bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-8">
          <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">需要 Google Maps API Key</h3>
          <p className="text-muted-foreground text-sm">
            請在下方輸入您的 Google Maps API Key
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={center}
          defaultZoom={11}
          mapId="monitoring-dashboard"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          {devices.map((device) => (
            <AdvancedMarker
              key={device.id}
              position={{ lat: device.lat, lng: device.lng }}
              onClick={() => onDeviceSelect(device.id)}
              className="cursor-pointer"
            >
              <div className="relative group">
                {/* Outer pulse ring - always visible */}
                <div className="absolute -inset-4 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-primary/20" />
                </div>
                
                {/* Selected pulse effect */}
                {selectedDevice === device.id && (
                  <div className="absolute -inset-3 animate-ping">
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-primary opacity-60" />
                  </div>
                )}
                
                {/* Marker container with glow */}
                <div className={`relative transition-all duration-300 ${
                  selectedDevice === device.id ? 'scale-125' : 'scale-100 group-hover:scale-110'
                }`}>
                  {/* Background glow */}
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl" />
                  
                  {/* Main marker */}
                  <div className={`relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 border-4 ${
                    selectedDevice === device.id 
                      ? 'bg-primary border-primary shadow-glow' 
                      : 'bg-gradient-primary border-primary/80 shadow-lg group-hover:border-primary'
                  }`}>
                    {/* Camera icon with recording indicator */}
                    <div className="relative">
                      <Video className="w-8 h-8 text-white drop-shadow-lg" fill="white" strokeWidth={1.5} />
                      {/* Recording red dot */}
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white animate-pulse" />
                    </div>
                  </div>

                  {/* Status indicator dot */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-white shadow-lg animate-pulse" />
                </div>

                {/* Device label */}
                <div className={`absolute top-full mt-3 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-3 py-2 rounded-lg bg-card/95 backdrop-blur-sm shadow-glow border border-primary/30 text-sm font-semibold transition-all duration-300 ${
                  selectedDevice === device.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
                }`}>
                  <div className="text-foreground">{device.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{device.id}</div>
                </div>
              </div>
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};

export default Map;
