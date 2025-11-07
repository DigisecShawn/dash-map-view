import { X, MapPin, Battery, Signal, Monitor, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  battery: number;
  signal: number;
  status: 'online' | 'offline';
  location: string;
  cctvImage: string;
}

interface DeviceDetailsProps {
  device: Device | null;
  onClose: () => void;
}

const DeviceDetails = ({ device, onClose }: DeviceDetailsProps) => {
  if (!device) return null;

  const getBatteryColor = (level: number) => {
    if (level > 60) return 'text-success';
    if (level > 30) return 'text-warning';
    return 'text-destructive';
  };

  const getSignalColor = (level: number) => {
    if (level > 70) return 'text-success';
    if (level > 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl bg-card shadow-glow max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{device.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    device.status === 'online' ? 'bg-success animate-pulse' : 'bg-muted-foreground'
                  }`} />
                  <span className="text-sm text-muted-foreground capitalize">{device.status}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-secondary border-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  device.battery > 60 ? 'bg-success/20' : device.battery > 30 ? 'bg-warning/20' : 'bg-destructive/20'
                }`}>
                  <Battery className={`w-5 h-5 ${getBatteryColor(device.battery)}`} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">電量</div>
                  <div className={`text-xl font-bold ${getBatteryColor(device.battery)}`}>
                    {device.battery}%
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-secondary border-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  device.signal > 70 ? 'bg-success/20' : device.signal > 40 ? 'bg-warning/20' : 'bg-destructive/20'
                }`}>
                  <Signal className={`w-5 h-5 ${getSignalColor(device.signal)}`} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">訊號強度</div>
                  <div className={`text-xl font-bold ${getSignalColor(device.signal)}`}>
                    {device.signal}%
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-secondary border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-info" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">位置</div>
                  <div className="text-sm font-semibold text-foreground">
                    {device.location}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Live Video Feed */}
          <Card className="bg-secondary border-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">即時畫面</h3>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs text-muted-foreground">LIVE</span>
                </div>
              </div>
            </div>
            <div className="aspect-video bg-background relative overflow-hidden">
              {/* CCTV Feed */}
              <img 
                src={device.cctvImage} 
                alt={`${device.name} CCTV`}
                className="w-full h-full object-cover"
              />
              
              {/* Video overlay info */}
              <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                <div className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
                  <div className="text-xs text-muted-foreground">設備 ID</div>
                  <div className="text-sm font-mono font-semibold">{device.id}</div>
                </div>
                <div className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
                  <div className="text-xs text-muted-foreground">狀態</div>
                  <div className="text-sm font-semibold text-success">運行中</div>
                </div>
              </div>

              {/* Bottom overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">GPS: {device.lat.toFixed(4)}°N, {device.lng.toFixed(4)}°E</span>
                    <span className="text-muted-foreground">{device.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default DeviceDetails;
