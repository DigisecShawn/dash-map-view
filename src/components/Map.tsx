import { useEffect, useRef, useState } from 'react';
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
}

const Map = ({ devices, selectedDevice, onDeviceSelect }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setMapLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full bg-secondary rounded-lg overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0">
        {/* Map Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary">
          {/* Grid overlay for map-like appearance */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        {/* Device Markers */}
        {mapLoaded && devices.map((device) => (
          <button
            key={device.id}
            onClick={() => onDeviceSelect(device.id)}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110 group ${
              selectedDevice === device.id ? 'z-20' : 'z-10'
            }`}
            style={{
              left: `${device.lng}%`,
              top: `${device.lat}%`,
            }}
          >
            {/* Pulse effect */}
            {selectedDevice === device.id && (
              <div className="absolute inset-0 animate-ping">
                <div className="w-12 h-12 rounded-full bg-primary opacity-75" />
              </div>
            )}
            
            {/* Marker */}
            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              selectedDevice === device.id 
                ? 'bg-gradient-primary shadow-glow scale-125' 
                : 'bg-card shadow-card group-hover:bg-gradient-primary'
            }`}>
              <MapPin className="w-6 h-6 text-foreground" />
            </div>

            {/* Device label */}
            <div className={`absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-card text-xs font-medium transition-opacity duration-300 ${
              selectedDevice === device.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {device.name}
            </div>
          </button>
        ))}
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
        <button className="w-10 h-10 rounded-lg bg-card hover:bg-secondary flex items-center justify-center transition-colors shadow-card">
          <span className="text-lg font-bold">+</span>
        </button>
        <button className="w-10 h-10 rounded-lg bg-card hover:bg-secondary flex items-center justify-center transition-colors shadow-card">
          <span className="text-lg font-bold">−</span>
        </button>
      </div>
    </div>
  );
};

export default Map;
