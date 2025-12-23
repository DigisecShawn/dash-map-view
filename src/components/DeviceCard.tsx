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
  onShowDetails: () => void;
}

import { useRef, useCallback } from 'react';

const DeviceCard = ({ name, battery, signal, status, isSelected, onClick, onShowDetails }: DeviceCardProps) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onShowDetails();
    }, 500);
  }, [onShowDetails]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      onClick();
    }
    isLongPress.current = false;
  }, [onClick]);
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
      onClick={handleClick}
      onDoubleClick={onShowDetails}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`p-3 sm:p-4 cursor-pointer transition-all duration-300 hover:shadow-glow select-none ${
        isSelected ? 'bg-gradient-primary shadow-glow border-primary' : 'bg-card shadow-card hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-white/20' : 'bg-secondary'
        }`}>
          <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{name}</h3>
          <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
            <div className={`w-2 h-2 rounded-full ${
              status === 'online' ? 'bg-success animate-pulse' : 'bg-muted-foreground'
            }`} />
            <span className="text-[10px] sm:text-xs text-muted-foreground capitalize">{status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Battery className={`w-3 h-3 sm:w-4 sm:h-4 ${getBatteryColor(battery)}`} />
          <div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">電量</div>
            <div className={`text-xs sm:text-sm font-semibold ${getBatteryColor(battery)}`}>
              {battery}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Signal className={`w-3 h-3 sm:w-4 sm:h-4 ${getSignalColor(signal)}`} />
          <div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">訊號</div>
            <div className={`text-xs sm:text-sm font-semibold ${getSignalColor(signal)}`}>
              {signal}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DeviceCard;
