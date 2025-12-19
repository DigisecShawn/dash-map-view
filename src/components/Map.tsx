import { useEffect } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Video, AlertTriangle, WifiOff } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  battery: number;
  signal: number;
  status: 'online' | 'offline';
}

interface MapProps {
  devices: Device[];
  selectedDevice: string | null;
  onDeviceSelect: (deviceId: string) => void;
  onDeviceClick?: (deviceId: string) => void;
  apiKey: string;
}

const getDeviceState = (device: Device) => {
  if (device.status === 'offline') return 'offline';
  if (device.battery <= 20) return 'low-battery';
  if (device.signal <= 20) return 'weak-signal';
  return 'healthy';
};

const getMarkerStyles = (state: string, isSelected: boolean) => {
  const baseStyles = 'relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 border-4';
  
  switch (state) {
    case 'offline':
      return `${baseStyles} ${isSelected 
        ? 'bg-muted border-muted-foreground/50 shadow-lg' 
        : 'bg-muted/80 border-muted-foreground/30 shadow-md grayscale'}`;
    case 'low-battery':
      return `${baseStyles} ${isSelected 
        ? 'bg-warning border-warning shadow-[0_0_20px_hsl(var(--warning)/0.5)]' 
        : 'bg-warning/80 border-warning/60 shadow-lg'}`;
    case 'weak-signal':
      return `${baseStyles} ${isSelected 
        ? 'bg-info border-info shadow-[0_0_20px_hsl(var(--info)/0.5)]' 
        : 'bg-info/80 border-info/60 shadow-lg'}`;
    default:
      return `${baseStyles} ${isSelected 
        ? 'bg-primary border-primary shadow-glow' 
        : 'bg-gradient-primary border-primary/80 shadow-lg group-hover:border-primary'}`;
  }
};

const getStatusIndicator = (state: string) => {
  switch (state) {
    case 'offline':
      return { color: 'bg-muted-foreground', icon: WifiOff, pulse: false };
    case 'low-battery':
      return { color: 'bg-warning', icon: AlertTriangle, pulse: true };
    case 'weak-signal':
      return { color: 'bg-info', icon: null, pulse: true };
    default:
      return { color: 'bg-success', icon: null, pulse: true };
  }
};

const getPulseColor = (state: string) => {
  switch (state) {
    case 'offline': return 'bg-muted-foreground/20';
    case 'low-battery': return 'bg-warning/30';
    case 'weak-signal': return 'bg-info/30';
    default: return 'bg-primary/20';
  }
};

// Inner component that has access to map instance
const MapContent = ({ devices, selectedDevice, onDeviceSelect, onDeviceClick }: Omit<MapProps, 'apiKey'>) => {
  const map = useMap();

  // Pan to selected device when it changes
  useEffect(() => {
    if (selectedDevice && map) {
      const device = devices.find(d => d.id === selectedDevice);
      if (device) {
        map.panTo({ lat: device.lat, lng: device.lng });
        map.setZoom(15);
      }
    }
  }, [selectedDevice, devices, map]);

  return (
    <>
      {devices.map((device) => {
        const state = getDeviceState(device);
        const statusIndicator = getStatusIndicator(state);
        const pulseColor = getPulseColor(state);
        
        return (
          <AdvancedMarker
            key={device.id}
            position={{ lat: device.lat, lng: device.lng }}
            onClick={() => {
              onDeviceSelect(device.id);
              onDeviceClick?.(device.id);
            }}
            className="cursor-pointer"
          >
            <div className="relative group">
              {/* Outer pulse ring */}
              <div className={`absolute -inset-4 ${state !== 'offline' ? 'animate-pulse' : ''}`}>
                <div className={`w-20 h-20 rounded-full ${pulseColor}`} />
              </div>
              
              {/* Selected pulse effect */}
              {selectedDevice === device.id && state !== 'offline' && (
                <div className="absolute -inset-3 animate-ping">
                  <div className={`w-[4.5rem] h-[4.5rem] rounded-full ${pulseColor} opacity-60`} />
                </div>
              )}
              
              {/* Marker container */}
              <div className={`relative transition-all duration-300 ${
                selectedDevice === device.id ? 'scale-125' : 'scale-100 group-hover:scale-110'
              }`}>
                {/* Background glow */}
                {state !== 'offline' && (
                  <div className={`absolute inset-0 rounded-full ${pulseColor} blur-xl`} />
                )}
                
                {/* Main marker */}
                <div className={getMarkerStyles(state, selectedDevice === device.id)}>
                  <div className="relative">
                    <Video 
                      className={`w-8 h-8 drop-shadow-lg ${state === 'offline' ? 'text-muted-foreground' : 'text-white'}`} 
                      fill={state === 'offline' ? 'hsl(var(--muted-foreground))' : 'white'} 
                      strokeWidth={1.5} 
                    />
                    {/* Recording indicator - only for online devices */}
                    {state !== 'offline' && (
                      <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white animate-pulse ${
                        state === 'low-battery' ? 'bg-destructive' : 'bg-red-500'
                      }`} />
                    )}
                    {/* Offline X mark */}
                    {state === 'offline' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive border border-white flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">✕</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${statusIndicator.color} border-2 border-white shadow-lg ${statusIndicator.pulse ? 'animate-pulse' : ''}`}>
                  {statusIndicator.icon && (
                    <statusIndicator.icon className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                
                {/* Warning badge for low battery */}
                {state === 'low-battery' && (
                  <div className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded bg-warning text-warning-foreground text-[10px] font-bold shadow-md">
                    {device.battery}%
                  </div>
                )}
              </div>

              {/* Device label */}
              <div className={`absolute top-full mt-3 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-3 py-2 rounded-lg bg-card/95 backdrop-blur-sm shadow-glow border border-primary/30 text-sm font-semibold transition-all duration-300 ${
                selectedDevice === device.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusIndicator.color}`} />
                  <span className="text-foreground">{device.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {state === 'offline' ? '離線' : state === 'low-battery' ? `電量不足 ${device.battery}%` : device.id}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
};

const Map = ({ devices, selectedDevice, onDeviceSelect, onDeviceClick, apiKey }: MapProps) => {
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
          <MapContent
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceSelect={onDeviceSelect}
            onDeviceClick={onDeviceClick}
          />
        </GoogleMap>
      </APIProvider>
    </div>
  );
};

export default Map;