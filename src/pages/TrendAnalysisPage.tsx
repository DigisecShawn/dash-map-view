import { useState, useEffect, useMemo } from 'react';
import { 
  Thermometer, Droplets, Wind, Volume2, TrendingUp, BarChart3, Monitor, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SensorData {
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
  noise: number | null;
  recorded_at: string;
}

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
}

const TIME_RANGES = [
  { value: '6h', label: '6 小時', hours: 6 },
  { value: '12h', label: '12 小時', hours: 12 },
  { value: '24h', label: '24 小時', hours: 24 },
  { value: '7d', label: '7 天', hours: 168 },
];

const TrendAnalysisPage = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState(true);

  const getTimeRangeHours = () => {
    return TIME_RANGES.find(t => t.value === timeRange)?.hours || 24;
  };

  const getTimeRangeLabel = () => {
    return TIME_RANGES.find(t => t.value === timeRange)?.label || '24 小時';
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const hours = getTimeRangeHours();
      const [sensorRes, devicesRes] = await Promise.all([
        supabase
          .from('device_sensor_history')
          .select('*')
          .gte('recorded_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: true }),
        supabase.from('devices').select('id, device_id, name, location'),
      ]);

      if (sensorRes.data) setSensorData(sensorRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sensor data based on selected device
  const filteredSensorData = useMemo(() => {
    if (selectedDevice === 'all') return sensorData;
    return sensorData.filter(d => d.device_id === selectedDevice);
  }, [sensorData, selectedDevice]);

  // Get selected device name
  const selectedDeviceName = useMemo(() => {
    if (selectedDevice === 'all') return '全部設備';
    const device = devices.find(d => d.device_id === selectedDevice);
    return device?.name || selectedDevice;
  }, [selectedDevice, devices]);

  // Environment statistics
  const envStats = useMemo(() => {
    if (filteredSensorData.length === 0) return null;
    
    const temps = filteredSensorData.map(d => d.temperature).filter(v => v !== null) as number[];
    const humids = filteredSensorData.map(d => d.humidity).filter(v => v !== null) as number[];
    const pm25s = filteredSensorData.map(d => d.pm25).filter(v => v !== null) as number[];
    const pm10s = filteredSensorData.map(d => d.pm10).filter(v => v !== null) as number[];
    const noises = filteredSensorData.map(d => d.noise).filter(v => v !== null) as number[];

    const calcStats = (arr: number[]) => arr.length > 0 ? {
      avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10,
      min: Math.round(Math.min(...arr) * 10) / 10,
      max: Math.round(Math.max(...arr) * 10) / 10,
    } : null;

    return {
      temperature: calcStats(temps),
      humidity: calcStats(humids),
      pm25: calcStats(pm25s),
      pm10: calcStats(pm10s),
      noise: calcStats(noises),
      dataCount: filteredSensorData.length,
    };
  }, [filteredSensorData]);

  // Trend chart data
  const trendData = useMemo(() => {
    const grouped: { [key: string]: SensorData[] } = {};
    const is7Days = timeRange === '7d';
    
    filteredSensorData.forEach(d => {
      let timeKey: string;
      if (is7Days) {
        timeKey = new Date(d.recorded_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
      } else {
        timeKey = new Date(d.recorded_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      }
      if (!grouped[timeKey]) grouped[timeKey] = [];
      grouped[timeKey].push(d);
    });

    const maxPoints = is7Days ? 14 : 12;

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-maxPoints)
      .map(([time, records]) => {
        const temps = records.map(r => r.temperature).filter(v => v !== null) as number[];
        const pm25s = records.map(r => r.pm25).filter(v => v !== null) as number[];
        const humids = records.map(r => r.humidity).filter(v => v !== null) as number[];
        const pm10s = records.map(r => r.pm10).filter(v => v !== null) as number[];
        const noises = records.map(r => r.noise).filter(v => v !== null) as number[];
        return {
          time,
          temperature: temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10 : null,
          pm25: pm25s.length > 0 ? Math.round(pm25s.reduce((a, b) => a + b, 0) / pm25s.length * 10) / 10 : null,
          humidity: humids.length > 0 ? Math.round(humids.reduce((a, b) => a + b, 0) / humids.length * 10) / 10 : null,
          pm10: pm10s.length > 0 ? Math.round(pm10s.reduce((a, b) => a + b, 0) / pm10s.length * 10) / 10 : null,
          noise: noises.length > 0 ? Math.round(noises.reduce((a, b) => a + b, 0) / noises.length * 10) / 10 : null,
        };
      });
  }, [filteredSensorData, timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            趨勢分析
          </h1>
          <p className="text-muted-foreground">{getTimeRangeLabel()}環境監測數據趨勢與統計</p>
        </div>
        
        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px] bg-card">
                <SelectValue placeholder="時間範圍" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Device Selector */}
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[180px] bg-card">
                <SelectValue placeholder="選擇設備" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">全部設備</SelectItem>
                {devices.map(device => (
                  <SelectItem key={device.device_id} value={device.device_id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Current Selection Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-sm">
          目前檢視: {selectedDeviceName}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          時間範圍: {getTimeRangeLabel()}
        </Badge>
        {selectedDevice !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            單一設備
          </Badge>
        )}
      </div>

      {/* Environment Stats */}
      {envStats ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {getTimeRangeLabel()}環境監測統計
              <Badge variant="outline" className="ml-auto text-xs">
                {envStats.dataCount} 筆資料
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {envStats.temperature && (
                <div className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">溫度</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均</span>
                      <span className="font-medium">{envStats.temperature.avg}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">範圍</span>
                      <span>{envStats.temperature.min} ~ {envStats.temperature.max}°C</span>
                    </div>
                  </div>
                </div>
              )}

              {envStats.humidity && (
                <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-medium">濕度</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均</span>
                      <span className="font-medium">{envStats.humidity.avg}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">範圍</span>
                      <span>{envStats.humidity.min} ~ {envStats.humidity.max}%</span>
                    </div>
                  </div>
                </div>
              )}

              {envStats.pm25 && (
                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">PM2.5</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均</span>
                      <span className="font-medium">{envStats.pm25.avg} μg/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">範圍</span>
                      <span>{envStats.pm25.min} ~ {envStats.pm25.max}</span>
                    </div>
                  </div>
                </div>
              )}

              {envStats.pm10 && (
                <div className="p-3 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">PM10</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均</span>
                      <span className="font-medium">{envStats.pm10.avg} μg/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">範圍</span>
                      <span>{envStats.pm10.min} ~ {envStats.pm10.max}</span>
                    </div>
                  </div>
                </div>
              )}

              {envStats.noise && (
                <div className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">噪音</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均</span>
                      <span className="font-medium">{envStats.noise.avg} dB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">範圍</span>
                      <span>{envStats.noise.min} ~ {envStats.noise.max} dB</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>所選設備目前沒有數據</p>
          </CardContent>
        </Card>
      )}

      {/* Trend Charts */}
      {trendData.length > 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                溫度趨勢
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} unit="°C" className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="temperature" stroke="#f97316" fill="url(#tempGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-500" />
                濕度趨勢
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} unit="%" className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="humidity" stroke="#06b6d4" fill="url(#humidGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wind className="w-4 h-4 text-blue-500" />
                PM2.5 趨勢
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} unit="μg" className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="pm25" stroke="#3b82f6" fill="url(#pm25Gradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wind className="w-4 h-4 text-green-500" />
                PM10 趨勢
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="pm10Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} unit="μg" className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="pm10" stroke="#22c55e" fill="url(#pm10Gradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-500" />
                噪音趨勢
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="noiseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} unit="dB" className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="noise" stroke="#a855f7" fill="url(#noiseGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>所選設備目前沒有趨勢數據</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrendAnalysisPage;
