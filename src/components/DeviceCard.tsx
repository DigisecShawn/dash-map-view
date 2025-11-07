import { Battery, Signal, Monitor } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DeviceCardProps {
  id: string;
  name: string;
  battery: number;
  signal: number;
  status: 'online' | 'offline';
  isSelected: boolean;
  onClick: () => void;
}

const DeviceCard = ({ name, battery, signal, status, isSelected, onClick }: DeviceCardProps) => {
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
    <Card
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-glow ${
        isSelected ? 'bg-gradient-primary shadow-glow border-primary' : 'bg-card shadow-card hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isSelected ? 'bg-white/20' : 'bg-secondary'
        }`}>
          <Monitor className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${
              status === 'online' ? 'bg-success animate-pulse' : 'bg-muted-foreground'
            }`} />
            <span className="text-xs text-muted-foreground capitalize">{status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Battery className={`w-4 h-4 ${getBatteryColor(battery)}`} />
          <div>
            <div className="text-xs text-muted-foreground">電量</div>
            <div className={`text-sm font-semibold ${getBatteryColor(battery)}`}>
              {battery}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Signal className={`w-4 h-4 ${getSignalColor(signal)}`} />
          <div>
            <div className="text-xs text-muted-foreground">訊號</div>
            <div className={`text-sm font-semibold ${getSignalColor(signal)}`}>
              {signal}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DeviceCard;
