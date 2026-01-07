import { useState, useEffect, useMemo } from 'react';
import { Monitor, Wifi, WifiOff, AlertTriangle, Building2, MapPin, ChevronRight, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CompanySiteFilter from '@/components/CompanySiteFilter';
import { useCompanySiteFilter } from '@/hooks/useCompanySiteFilter';
import { getAlertTypeIcon, getAlertTypeLabel, getAlertTypeSeverity, SEVERITY_CONFIG, type AlertSeverity } from '@/lib/alertTypeIcons';
import { getStatusBadgeClass, getStatusLabel, type DeviceStatus } from '@/lib/statusUtils';
interface Device {
  id: string;
  device_id: string;
  name: string;
  status: string;
  battery: number | null;
  signal_strength: number | null;
  location: string | null;
  company_id: string | null;
  site_id: string | null;
  current_solar_power: number | null;
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
interface WebSocketAlert {
  id: string;
  alert_type: string;
  message: string;
  device_id: string | null;
  device_name: string | null;
  severity: string;
  acknowledged: boolean;
  created_at: string;
}
const Dashboard = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [wsAlerts, setWsAlerts] = useState<WebSocketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    companies,
    filteredSites,
    selectedCompanyId,
    selectedSiteId,
    setSelectedCompanyId,
    setSelectedSiteId,
    loading: filterLoading,
    getCompanyName,
    getSiteName
  } = useCompanySiteFilter();
  useEffect(() => {
    fetchData();

    // Subscribe to realtime WebSocket alerts
    const channel = supabase.channel('websocket-alerts').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'websocket_alerts'
    }, payload => {
      const newAlert = payload.new as WebSocketAlert;
      setWsAlerts(prev => [newAlert, ...prev].slice(0, 20));
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, sensorRes, thresholdsRes, wsAlertsRes] = await Promise.all([supabase.from('devices').select('*'), supabase.from('device_sensor_history').select('*').gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('recorded_at', {
        ascending: true
      }), supabase.from('device_alarm_thresholds').select('*').eq('enabled', true), supabase.from('websocket_alerts').select('*').eq('acknowledged', false).order('created_at', {
        ascending: false
      }).limit(20)]);
      if (devicesRes.data) setDevices(devicesRes.data);
      if (sensorRes.data) setSensorData(sensorRes.data);
      if (thresholdsRes.data) setThresholds(thresholdsRes.data);
      if (wsAlertsRes.data) setWsAlerts(wsAlertsRes.data as WebSocketAlert[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter devices based on company and site selection
  const filteredDevices = useMemo(() => {
    let result = devices;
    if (selectedCompanyId !== 'all') {
      result = result.filter(d => d.company_id === selectedCompanyId);
    }
    if (selectedSiteId !== 'all') {
      result = result.filter(d => d.site_id === selectedSiteId);
    }
    return result;
  }, [devices, selectedCompanyId, selectedSiteId]);

  // Device statistics based on filtered devices
  // Device statistics based on filtered devices
  const deviceStats = useMemo(() => {
    const online = filteredDevices.filter(d => d.status === 'online').length;
    const offline = filteredDevices.filter(d => d.status === 'offline').length;
    const avgBattery = filteredDevices.reduce((sum, d) => sum + (d.battery || 0), 0) / (filteredDevices.length || 1);
    const avgSignal = filteredDevices.reduce((sum, d) => sum + (d.signal_strength || 0), 0) / (filteredDevices.length || 1);
    return {
      total: filteredDevices.length,
      online,
      offline,
      avgBattery: Math.round(avgBattery),
      avgSignal: Math.round(avgSignal)
    };
  }, [filteredDevices]);

  // Solar power statistics
  const solarStats = useMemo(() => {
    const devicesWithSolar = filteredDevices.filter(d => d.current_solar_power !== null && d.current_solar_power > 0);
    const totalPower = filteredDevices.reduce((sum, d) => sum + (d.current_solar_power || 0), 0);
    const avgPower = devicesWithSolar.length > 0 ? totalPower / devicesWithSolar.length : 0;
    const maxPower = filteredDevices.reduce((max, d) => Math.max(max, d.current_solar_power || 0), 0);
    return {
      totalPower: Math.round(totalPower * 100) / 100,
      avgPower: Math.round(avgPower * 100) / 100,
      maxPower: Math.round(maxPower * 100) / 100,
      activeDevices: devicesWithSolar.length
    };
  }, [filteredDevices]);

  // Solar chart data
  const solarChartData = useMemo(() => {
    return filteredDevices.filter(d => d.current_solar_power !== null).map(d => ({
      name: d.name.length > 8 ? d.name.substring(0, 8) + '...' : d.name,
      fullName: d.name,
      power: d.current_solar_power || 0
    })).sort((a, b) => b.power - a.power);
  }, [filteredDevices]);

  // Sensor-based active alarms (filtered by device)
  const sensorAlarms = useMemo(() => {
    if (sensorData.length === 0 || thresholds.length === 0) return [];
    const filteredDeviceIds = new Set(filteredDevices.map(d => d.device_id));
    const latestByDevice: {
      [key: string]: SensorData;
    } = {};
    sensorData.forEach(d => {
      if (!filteredDeviceIds.has(d.device_id)) return;
      if (!latestByDevice[d.device_id] || new Date(d.recorded_at) > new Date(latestByDevice[d.device_id].recorded_at)) {
        latestByDevice[d.device_id] = d;
      }
    });
    const alarms: {
      device: string;
      metric: string;
      value: number;
      threshold: number;
      type: 'sensor';
    }[] = [];
    thresholds.forEach(t => {
      if (!filteredDeviceIds.has(t.device_id)) return;
      const data = latestByDevice[t.device_id];
      if (!data) return;
      const value = data[t.metric_type as keyof SensorData] as number;
      if (value !== null && value > t.threshold_value) {
        const device = filteredDevices.find(d => d.device_id === t.device_id);
        alarms.push({
          device: device?.name || t.device_id,
          metric: t.metric_type,
          value,
          threshold: t.threshold_value,
          type: 'sensor'
        });
      }
    });
    return alarms;
  }, [sensorData, thresholds, filteredDevices]);

  // Filter WebSocket alerts by device
  const filteredWsAlerts = useMemo(() => {
    const filteredDeviceIds = new Set(filteredDevices.map(d => d.device_id));
    return wsAlerts.filter(alert => !alert.device_id || filteredDeviceIds.has(alert.device_id));
  }, [wsAlerts, filteredDevices]);

  // Total alarm count
  const totalAlarmCount = sensorAlarms.length + filteredWsAlerts.length;
  const getMetricLabel = (metric: string) => {
    const labels: {
      [key: string]: string;
    } = {
      temperature: '溫度',
      humidity: '濕度',
      pm25: 'PM2.5',
      pm10: 'PM10',
      noise: '噪音'
    };
    return labels[metric] || metric;
  };
  const getMetricUnit = (metric: string) => {
    const units: {
      [key: string]: string;
    } = {
      temperature: '°C',
      humidity: '%',
      pm25: 'μg/m³',
      pm10: 'μg/m³',
      noise: 'dB'
    };
    return units[metric] || '';
  };

  // Alert type icon and label functions are now imported from @/lib/alertTypeIcons

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return <Badge variant="destructive" className="text-[10px] animate-pulse">緊急</Badge>;
      case 'critical':
        return <Badge className="bg-orange-500 text-white text-[10px]">嚴重</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-black text-[10px]">警告</Badge>;
      case 'info':
        return <Badge variant="secondary" className="text-[10px]">資訊</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{severity}</Badge>;
    }
  };

  // Get background color class based on severity
  const getSeverityBgClass = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return 'bg-red-500/15 border-red-500/30';
      case 'critical':
        return 'bg-orange-500/15 border-orange-500/30';
      case 'warning':
        return 'bg-yellow-500/15 border-yellow-500/30';
      default:
        return 'bg-muted/50 border-border';
    }
  };
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  if (loading || filterLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>;
  }
  return <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">數據儀表板</h1>
          <p className="text-muted-foreground">即時設備監控總覽</p>
        </div>
        
        {/* Company/Site Filter */}
        <CompanySiteFilter companies={companies} filteredSites={filteredSites} selectedCompanyId={selectedCompanyId} selectedSiteId={selectedSiteId} onCompanyChange={setSelectedCompanyId} onSiteChange={setSelectedSiteId} />
      </div>

      {/* Current Filter Badge */}
      {(selectedCompanyId !== 'all' || selectedSiteId !== 'all') && <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {selectedCompanyId === 'all' ? '全部公司' : getCompanyName(selectedCompanyId)}
          </Badge>
          {selectedSiteId !== 'all' && <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Badge variant="outline" className="text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {getSiteName(selectedSiteId)}
              </Badge>
            </>}
        </div>}

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
                <p className="text-3xl font-bold text-warning">{totalAlarmCount}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-warning/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solar Power Stats & Active Alarms */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Solar Power Statistics Chart */}
        <Card className="bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              太陽能發電統計
              <Badge variant="outline" className="ml-auto text-xs">
                總計 {solarStats.totalPower} kW
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {solarChartData.length === 0 ? <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>目前沒有太陽能發電數據</p>
              </div> : <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={solarChartData} layout="vertical" margin={{
                top: 5,
                right: 30,
                left: 10,
                bottom: 5
              }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" unit=" kW" tick={{
                  fontSize: 11,
                  fill: 'hsl(var(--muted-foreground))'
                }} axisLine={{
                  stroke: 'hsl(var(--border))'
                }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{
                  fontSize: 11,
                  fill: 'hsl(var(--muted-foreground))'
                }} axisLine={{
                  stroke: 'hsl(var(--border))'
                }} />
                    <Tooltip formatter={(value: number) => [`${value} kW`, '發電量']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} />
                    <Bar dataKey="power" radius={[0, 4, 4, 0]}>
                      {solarChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(${45 - index * 8}, 90%, ${55 + index * 3}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>}
            
            {/* Summary Stats */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xs text-muted-foreground">平均</span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">{solarStats.avgPower} kW</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-orange-500/10 rounded-lg">
                <span className="text-xs text-muted-foreground">最高</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">{solarStats.maxPower} kW</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">運轉中</span>
                <span className="font-semibold">{solarStats.activeDevices} 台</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alarms with Tabs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              活動警報
              {totalAlarmCount > 0 && <Badge variant="destructive" className="ml-auto text-xs">
                  {totalAlarmCount}
                </Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="all" className="text-xs">
                  全部 ({totalAlarmCount})
                </TabsTrigger>
                <TabsTrigger value="sensor" className="text-xs">
                  感測器 ({sensorAlarms.length})
                </TabsTrigger>
                <TabsTrigger value="websocket" className="text-xs">
                  AI偵測 ({filteredWsAlerts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {totalAlarmCount === 0 ? <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <p>目前沒有活動警報</p>
                  </div> : <div className="space-y-2 max-h-40 overflow-y-auto">
                    {filteredWsAlerts.slice(0, 3).map(alert => <div key={alert.id} className={`flex items-center justify-between p-2 rounded-lg border ${getSeverityBgClass(alert.severity)}`}>
                        <div className="flex items-center gap-2">
                          {getAlertTypeIcon(alert.alert_type)}
                          <div>
                            <p className="text-sm font-medium">{alert.device_name || '未知設備'}</p>
                            <p className="text-xs text-muted-foreground">
                              {getAlertTypeLabel(alert.alert_type)} • {formatTime(alert.created_at)}
                            </p>
                          </div>
                        </div>
                        {getSeverityBadge(alert.severity)}
                      </div>)}
                    {sensorAlarms.slice(0, 3).map((alarm, i) => <div key={`sensor-${i}`} className="flex items-center justify-between p-2 bg-orange-500/15 rounded-lg border border-orange-500/30">
                        <div>
                          <p className="text-sm font-medium">{alarm.device}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMetricLabel(alarm.metric)}: {alarm.value}{getMetricUnit(alarm.metric)} &gt; {alarm.threshold}{getMetricUnit(alarm.metric)}
                          </p>
                        </div>
                        <Badge className="bg-orange-500 text-white text-[10px]">超標</Badge>
                      </div>)}
                  </div>}
              </TabsContent>

              <TabsContent value="sensor" className="mt-0">
                {sensorAlarms.length === 0 ? <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <p>目前沒有感測器警報</p>
                  </div> : <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sensorAlarms.map((alarm, i) => <div key={i} className="flex items-center justify-between p-2 bg-orange-500/15 rounded-lg border border-orange-500/30">
                        <div>
                          <p className="text-sm font-medium">{alarm.device}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMetricLabel(alarm.metric)}: {alarm.value}{getMetricUnit(alarm.metric)} &gt; {alarm.threshold}{getMetricUnit(alarm.metric)}
                          </p>
                        </div>
                        <Badge className="bg-orange-500 text-white text-[10px]">超標</Badge>
                      </div>)}
                  </div>}
              </TabsContent>

              <TabsContent value="websocket" className="mt-0">
                {filteredWsAlerts.length === 0 ? <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <p>目前沒有 AI 偵測警報</p>
                  </div> : <div className="space-y-2 max-h-40 overflow-y-auto">
                    {filteredWsAlerts.map(alert => <div key={alert.id} className={`flex items-center justify-between p-2 rounded-lg border ${getSeverityBgClass(alert.severity)}`}>
                        <div className="flex items-center gap-2">
                          {getAlertTypeIcon(alert.alert_type)}
                          <div>
                            <p className="text-sm font-medium">{alert.device_name || '未知設備'}</p>
                            <p className="text-xs text-muted-foreground">
                              {getAlertTypeLabel(alert.alert_type)} • {formatTime(alert.created_at)}
                            </p>
                            {alert.message && <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {alert.message}
                              </p>}
                          </div>
                        </div>
                        {getSeverityBadge(alert.severity)}
                      </div>)}
                  </div>}
              </TabsContent>
            </Tabs>
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
                  <th className="text-left py-2 text-muted-foreground font-medium">公司</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">工地</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">位置</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">狀態</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">電量</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">訊號</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map(device => <tr key={device.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2 font-medium">{device.name}</td>
                    <td className="py-2 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {getCompanyName(device.company_id)}
                      </div>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getSiteName(device.site_id)}
                      </div>
                    </td>
                    <td className="py-2 text-muted-foreground">{device.location || '--'}</td>
                    <td className="py-2 text-center">
                      <Badge className={`text-xs ${getStatusBadgeClass(device.status as DeviceStatus)}`}>
                        {getStatusLabel(device.status as DeviceStatus)}
                      </Badge>
                    </td>
                    <td className="py-2 text-center">{device.battery ?? '--'}%</td>
                    <td className="py-2 text-center">{device.signal_strength ?? '--'}%</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Dashboard;