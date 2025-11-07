import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

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
          <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
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
          styles={[
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#1e293b" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#94a3b8" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#0f172a" }]
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#0c4a6e" }]
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#334155" }]
            }
          ]}
        >
          {devices.map((device) => (
            <AdvancedMarker
              key={device.id}
              position={{ lat: device.lat, lng: device.lng }}
              onClick={() => onDeviceSelect(device.id)}
              className="cursor-pointer"
            >
              <div className="relative group">
                {/* Pulse effect for selected device */}
                {selectedDevice === device.id && (
                  <div className="absolute -inset-2 animate-ping">
                    <div className="w-14 h-14 rounded-full bg-primary opacity-75" />
                  </div>
                )}
                
                {/* Marker */}
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                  selectedDevice === device.id 
                    ? 'bg-gradient-primary shadow-glow scale-125' 
                    : 'bg-card group-hover:bg-gradient-primary'
                }`}>
                  <MapPin className="w-6 h-6 text-foreground" />
                </div>

                {/* Device label */}
                <div className={`absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-card shadow-card text-xs font-medium transition-opacity duration-300 ${
                  selectedDevice === device.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {device.name}
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
