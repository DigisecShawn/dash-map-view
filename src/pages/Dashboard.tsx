import { useState, useEffect, useMemo } from 'react';
import { 
  Monitor, Wifi, WifiOff, Thermometer, Droplets, Wind, Volume2, 
  TrendingUp, AlertTriangle, Activity, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

interface Device {
  id: string;
  device_id: string;
  name: string;
  status: string;
  battery: number | null;
  signal_strength: number | null;
  location: string | null;
}

interface SensorData {
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
  noise: number | null;
  recorded_at: string;
}

interface AlarmThreshold {
  device_id: string;
  metric_type: string;
  threshold_value: number;
  enabled: boolean;
}

const Dashboard = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, sensorRes, thresholdsRes] = await Promise.all([
        supabase.from('devices').select('*'),
        supabase
          .from('device_sensor_history')
          .select('*')
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: true }),
        supabase.from('device_alarm_thresholds').select('*').eq('enabled', true),
      ]);

      if (devicesRes.data) setDevices(devicesRes.data);
      if (sensorRes.data) setSensorData(sensorRes.data);
      if (thresholdsRes.data) setThresholds(thresholdsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Device statistics
  const deviceStats = useMemo(() => {
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const avgBattery = devices.reduce((sum, d) => sum + (d.battery || 0), 0) / (devices.length || 1);
    const avgSignal = devices.reduce((sum, d) => sum + (d.signal_strength || 0), 0) / (devices.length || 1);
    return { total: devices.length, online, offline, avgBattery: Math.round(avgBattery), avgSignal: Math.round(avgSignal) };
  }, [devices]);

  // Environment statistics
  const envStats = useMemo(() => {
    if (sensorData.length === 0) return null;
    
    const temps = sensorData.map(d => d.temperature).filter(v => v !== null) as number[];
    const humids = sensorData.map(d => d.humidity).filter(v => v !== null) as number[];
    const pm25s = sensorData.map(d => d.pm25).filter(v => v !== null) as number[];
    const pm10s = sensorData.map(d => d.pm10).filter(v => v !== null) as number[];
    const noises = sensorData.map(d => d.noise).filter(v => v !== null) as number[];

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
      dataCount: sensorData.length,
    };
  }, [sensorData]);

  // Active alarms check
  const activeAlarms = useMemo(() => {
    if (sensorData.length === 0 || thresholds.length === 0) return [];
    
    // Get latest data per device
    const latestByDevice: { [key: string]: SensorData } = {};
    sensorData.forEach(d => {
      if (!latestByDevice[d.device_id] || new Date(d.recorded_at) > new Date(latestByDevice[d.device_id].recorded_at)) {
        latestByDevice[d.device_id] = d;
      }
    });

    const alarms: { device: string; metric: string; value: number; threshold: number }[] = [];
    thresholds.forEach(t => {
      const data = latestByDevice[t.device_id];
      if (!data) return;
      
      const value = data[t.metric_type as keyof SensorData] as number;
      if (value !== null && value > t.threshold_value) {
        const device = devices.find(d => d.device_id === t.device_id);
        alarms.push({
          device: device?.name || t.device_id,
          metric: t.metric_type,
          value,
          threshold: t.threshold_value,
        });
      }
    });
    return alarms;
  }, [sensorData, thresholds, devices]);

  // Trend chart data
  const trendData = useMemo(() => {
    const grouped: { [key: string]: SensorData[] } = {};
    sensorData.forEach(d => {
      const hour = new Date(d.recorded_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(d);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
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
  }, [sensorData]);

  // Pie chart data for device status
  const pieData = [
    { name: '上線', value: deviceStats.online, color: 'hsl(var(--success))' },
    { name: '離線', value: deviceStats.offline, color: 'hsl(var(--muted-foreground))' },
  ];

  const getMetricLabel = (metric: string) => {
    const labels: { [key: string]: string } = {
      temperature: '溫度',
      humidity: '濕度',
      pm25: 'PM2.5',
      pm10: 'PM10',
      noise: '噪音',
    };
    return labels[metric] || metric;
  };

  const getMetricUnit = (metric: string) => {
    const units: { [key: string]: string } = {
      temperature: '°C',
      humidity: '%',
      pm25: 'μg/m³',
      pm10: 'μg/m³',
      noise: 'dB',
    };
    return units[metric] || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">數據儀表板</h1>
        <p className="text-muted-foreground">即時設備監控與環境數據總覽</p>
      </div>

      {/* Device Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">總設備數</p>
                  <p className="text-3xl font-bold">{deviceStats.total}</p>
                </div>
                <Monitor className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">上線設備</p>
                  <p className="text-3xl font-bold text-success">{deviceStats.online}</p>
                </div>
                <Wifi className="w-10 h-10 text-success/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">離線設備</p>
                  <p className="text-3xl font-bold text-muted-foreground">{deviceStats.offline}</p>
                </div>
                <WifiOff className="w-10 h-10 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">活動警報</p>
                  <p className="text-3xl font-bold text-warning">{activeAlarms.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-warning/50" />
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Device Status & Active Alarms */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Device Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              設備狀態分佈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">平均電量</span>
                    <span className="font-medium">{deviceStats.avgBattery}%</span>
                  </div>
                  <Progress value={deviceStats.avgBattery} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">平均訊號</span>
                    <span className="font-medium">{deviceStats.avgSignal}%</span>
                  </div>
                  <Progress value={deviceStats.avgSignal} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alarms */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              活動警報
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAlarms.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                <p>目前沒有活動警報</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {activeAlarms.slice(0, 5).map((alarm, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div>
                      <p className="text-sm font-medium">{alarm.device}</p>
                      <p className="text-xs text-muted-foreground">
                        {getMetricLabel(alarm.metric)}: {alarm.value}{getMetricUnit(alarm.metric)} &gt; {alarm.threshold}{getMetricUnit(alarm.metric)}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">超標</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Environment Stats */}
      {envStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              24 小時環境監測統計
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
      )}

      {/* Trend Charts */}
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

      {/* Device List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            設備清單
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">設備名稱</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">位置</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">狀態</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">電量</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">訊號</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2 font-medium">{device.name}</td>
                    <td className="py-2 text-muted-foreground">{device.location || '--'}</td>
                    <td className="py-2 text-center">
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                        {device.status === 'online' ? '上線' : '離線'}
                      </Badge>
                    </td>
                    <td className="py-2 text-center">{device.battery ?? '--'}%</td>
                    <td className="py-2 text-center">{device.signal_strength ?? '--'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
