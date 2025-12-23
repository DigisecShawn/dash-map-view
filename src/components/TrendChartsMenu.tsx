import { useState, useEffect, useCallback } from 'react';
import { X, BarChart3, Thermometer, Wind, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import DeviceTrendChart from './DeviceTrendChart';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string;
}

interface SensorData {
  id: string;
  device_id: string;
  device_name?: string;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
  noise: number | null;
  battery: number | null;
  signal_strength: number | null;
  recorded_at: string;
}

interface TrendChartsMenuProps {
  onClose: () => void;
}

const TrendChartsMenu = ({ onClose }: TrendChartsMenuProps) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<SensorData[]>([]);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      fetchChartData();
    }
  }, [selectedDeviceId, timeRange, devices]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, device_id, name, location')
        .order('name');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      let hoursAgo = 24;
      if (timeRange === '6h') hoursAgo = 6;
      else if (timeRange === '12h') hoursAgo = 12;
      else if (timeRange === '7d') hoursAgo = 168;

      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursAgo);

      let query = supabase
        .from('device_sensor_history')
        .select('*')
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedDeviceId !== 'all') {
        query = query.eq('device_id', selectedDeviceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Add device names to the data
      const dataWithNames = (data || []).map(d => ({
        ...d,
        device_name: devices.find(dev => dev.device_id === d.device_id)?.name || d.device_id
      }));

      setChartData(dataWithNames);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const exportToCSV = useCallback(() => {
    if (chartData.length === 0) {
      toast.error('沒有數據可匯出');
      return;
    }

    const headers = ['時間', '設備', '溫度(°C)', '濕度(%)', 'PM2.5(μg/m³)', 'PM10(μg/m³)', '噪音(dB)'];
    const csvContent = [
      headers.join(','),
      ...chartData.map(d => [
        new Date(d.recorded_at).toLocaleString('zh-TW'),
        d.device_name || d.device_id,
        d.temperature ?? '',
        d.humidity ?? '',
        d.pm25 ?? '',
        d.pm10 ?? '',
        d.noise ?? ''
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensor_data_${selectedDeviceId}_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV 匯出成功');
  }, [chartData, selectedDeviceId, timeRange]);

  const exportToJSON = useCallback(() => {
    if (chartData.length === 0) {
      toast.error('沒有數據可匯出');
      return;
    }

    const exportData = chartData.map(d => ({
      recorded_at: d.recorded_at,
      device_id: d.device_id,
      device_name: d.device_name,
      temperature: d.temperature,
      humidity: d.humidity,
      pm25: d.pm25,
      pm10: d.pm10,
      noise: d.noise
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensor_data_${selectedDeviceId}_${timeRange}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('JSON 匯出成功');
  }, [chartData, selectedDeviceId, timeRange]);

  const selectedDevice = selectedDeviceId === 'all' ? null : devices.find(d => d.device_id === selectedDeviceId);
  const displayName = selectedDeviceId === 'all' ? '所有設備' : selectedDevice?.name || '';

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">環境監測趨勢</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">PM2.5/PM10/溫濕度/噪音歷史數據</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">匯出</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  匯出 CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON} className="gap-2">
                  <FileText className="w-4 h-4" />
                  匯出 JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">返回監控台</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="max-w-7xl mx-auto h-full flex flex-col">

          {/* Device Selector */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="選擇設備" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📊 所有設備 (總量)</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.device_id}>
                    {device.name} ({device.location || '未設定位置'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6h">6 小時</SelectItem>
                <SelectItem value="12h">12 小時</SelectItem>
                <SelectItem value="24h">24 小時</SelectItem>
                <SelectItem value="7d">7 天</SelectItem>
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
            ) : (
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
                        <div className="text-xs text-muted-foreground">空氣品質</div>
                        <div className="text-lg font-bold text-foreground">
                          {chartData.length} 筆數據
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Trend Chart */}
                <DeviceTrendChart 
                  deviceId={selectedDeviceId}
                  deviceName={displayName}
                  externalData={chartData}
                  externalTimeRange={timeRange}
                  isAggregate={selectedDeviceId === 'all'}
                  devices={devices}
                />
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default TrendChartsMenu;