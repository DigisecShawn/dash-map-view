import { X, MapPin, Battery, Signal, Monitor, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DeviceTrendChart from './DeviceTrendChart';

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
      <Card className="w-full max-w-3xl bg-card shadow-glow max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{device.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    device.status === 'online' ? 'bg-success animate-pulse' : 'bg-muted-foreground'
                  }`} />
                  <span className="text-sm text-muted-foreground capitalize">{device.status}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-secondary">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3 bg-secondary border-0">
              <div className="flex items-center gap-2">
                <Battery className={`w-4 h-4 ${getBatteryColor(device.battery)}`} />
                <div>
                  <div className="text-xs text-muted-foreground">電量</div>
                  <div className={`text-lg font-bold ${getBatteryColor(device.battery)}`}>{device.battery}%</div>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-secondary border-0">
              <div className="flex items-center gap-2">
                <Signal className={`w-4 h-4 ${getSignalColor(device.signal)}`} />
                <div>
                  <div className="text-xs text-muted-foreground">訊號</div>
                  <div className={`text-lg font-bold ${getSignalColor(device.signal)}`}>{device.signal}%</div>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-secondary border-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-info" />
                <div>
                  <div className="text-xs text-muted-foreground">位置</div>
                  <div className="text-sm font-semibold text-foreground truncate">{device.location}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs for Video and Charts */}
          <Tabs defaultValue="video" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="video" className="gap-2">
                <Video className="w-4 h-4" />
                即時畫面
              </TabsTrigger>
              <TabsTrigger value="sensors" className="gap-2">
                📊 環境監測
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video">
              <Card className="bg-secondary border-0 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">CCTV 直播</h3>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-xs text-muted-foreground">LIVE</span>
                    </div>
                  </div>
                </div>
                <div className="aspect-video bg-background relative overflow-hidden">
                  <img 
                    src={device.cctvImage} 
                    alt={`${device.name} CCTV`}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <div className="bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg border border-border">
                      <div className="text-xs text-muted-foreground">設備 ID</div>
                      <div className="text-sm font-mono font-semibold">{device.id}</div>
                    </div>
                    <div className="bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg border border-border">
                      <div className="text-xs text-muted-foreground">狀態</div>
                      <div className="text-sm font-semibold text-success">運行中</div>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg border border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">GPS: {device.lat.toFixed(4)}°N, {device.lng.toFixed(4)}°E</span>
                        <span className="text-muted-foreground">{device.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="sensors">
              <DeviceTrendChart deviceId={device.id} deviceName={device.name} />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default DeviceDetails;
