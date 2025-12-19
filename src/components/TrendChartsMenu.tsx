import { useState, useEffect } from 'react';
import { X, BarChart3, Thermometer, Wind } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import DeviceTrendChart from './DeviceTrendChart';

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string;
}

interface TrendChartsMenuProps {
  onClose: () => void;
}

const TrendChartsMenu = ({ onClose }: TrendChartsMenuProps) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, device_id, name, location')
        .order('name');

      if (error) throw error;
      setDevices(data || []);
      if (data && data.length > 0) {
        setSelectedDeviceId(data[0].device_id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl bg-card shadow-glow max-h-[95vh] overflow-hidden">
        <div className="p-4 sm:p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">環境監測趨勢</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">PM2.5 與溫度歷史數據</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Device Selector */}
          <div className="mb-4">
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="選擇設備" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.device_id}>
                    {device.name} ({device.location || '未設定位置'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Charts */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">尚無設備資料</p>
                <p className="text-xs text-muted-foreground mt-1">請先在設備管理中新增設備</p>
              </div>
            ) : selectedDevice ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 bg-secondary border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                        <Thermometer className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">溫度監測</div>
                        <div className="text-lg font-bold text-foreground">即時追蹤</div>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-secondary border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                        <Wind className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">PM2.5 監測</div>
                        <div className="text-lg font-bold text-foreground">空氣品質</div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Trend Chart */}
                <DeviceTrendChart 
                  deviceId={selectedDeviceId} 
                  deviceName={selectedDevice.name} 
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                請選擇設備以查看趨勢圖
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
};

export default TrendChartsMenu;
