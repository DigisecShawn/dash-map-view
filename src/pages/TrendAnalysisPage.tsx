import { useState, useEffect, useMemo, useCallback } from 'react';
import { Thermometer, Droplets, Wind, Volume2, TrendingUp, BarChart3, Monitor, Clock, AlertTriangle, ShieldAlert, Building2, MapPin, ChevronRight, Sun, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Json } from '@/integrations/supabase/types';
import CompanySiteFilter from '@/components/CompanySiteFilter';
import { useCompanySiteFilter } from '@/hooks/useCompanySiteFilter';
import { toast } from 'sonner';
import { ALERT_TYPE_CONFIG, getAlertTypeLabel } from '@/lib/alertTypeIcons';

interface SensorData {
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
  noise: number | null;
  solar_power: number | null;
  recorded_at: string;
}
interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
  company_id: string | null;
  site_id: string | null;
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
  metadata: Json | null;
}
const TIME_RANGES = [{
  value: '6h',
  label: '6 小時',
  hours: 6
}, {
  value: '12h',
  label: '12 小時',
  hours: 12
}, {
  value: '24h',
  label: '24 小時',
  hours: 24
}, {
  value: '7d',
  label: '7 天',
  hours: 168
}];

// Generate mock data for demonstration
const generateMockTrendData = (timeRange: string) => {
  const is7Days = timeRange === '7d';
  const points = is7Days ? 7 : 12;
  const now = new Date();
  return Array.from({
    length: points
  }, (_, i) => {
    const date = new Date(now);
    if (is7Days) {
      date.setDate(date.getDate() - (points - 1 - i));
    } else {
      date.setHours(date.getHours() - (points - 1 - i) * 2);
    }
    const timeKey = is7Days ? date.toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric'
    }) : date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return {
      time: timeKey,
      temperature: Math.round((25 + Math.sin(i * 0.5) * 5 + Math.random() * 2) * 10) / 10,
      humidity: Math.round((60 + Math.cos(i * 0.3) * 15 + Math.random() * 5) * 10) / 10,
      pm25: Math.round((35 + Math.sin(i * 0.4) * 20 + Math.random() * 10) * 10) / 10,
      pm10: Math.round((50 + Math.cos(i * 0.35) * 25 + Math.random() * 15) * 10) / 10,
      noise: Math.round((65 + Math.sin(i * 0.6) * 10 + Math.random() * 5) * 10) / 10,
      solar: Math.round((3 + Math.sin(i * 0.4) * 2 + Math.random()) * 10) / 10
    };
  });
};
const generateMockAlertData = (timeRange: string) => {
  const is7Days = timeRange === '7d';
  const points = is7Days ? 7 : 8;
  const now = new Date();
  return Array.from({
    length: points
  }, (_, i) => {
    const date = new Date(now);
    if (is7Days) {
      date.setDate(date.getDate() - (points - 1 - i));
    } else {
      date.setHours(date.getHours() - (points - 1 - i) * 3);
    }
    const timeKey = is7Days ? date.toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric'
    }) : date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return {
      time: timeKey,
      count: Math.floor(Math.random() * 8) + 1
    };
  });
};
const SEVERITY_LABELS: Record<string, string> = {
  'warning': '警告',
  'error': '嚴重',
  'critical': '緊急'
};
const SEVERITY_COLORS: Record<string, string> = {
  'warning': '#facc15',
  // 🟨 黃色 - 警告
  'error': '#f97316',
  // 🟧 橘色 - 嚴重
  'critical': '#ef4444' // 🟥 紅色 - 緊急
};
// Only show these 5 specific AI detection types
const FEATURED_ALERT_TYPES = ['no_helmet', 'no_seatbelt', 'fire_detection', 'smoke_detection', 'fall_detection'];

const FEATURED_ALERT_LABELS: Record<string, string> = {
  'no_helmet': '未戴安全帽',
  'no_seatbelt': '未戴安全帶',
  'fire_detection': '火焰偵測',
  'smoke_detection': '煙霧偵測',
  'fall_detection': '跌倒偵測',
};

const generateMockAlertStats = () => [
  { type: 'no_helmet', label: '未戴安全帽', count: 12 },
  { type: 'no_seatbelt', label: '未戴安全帶', count: 5 },
  { type: 'fire_detection', label: '火焰偵測', count: 3 },
  { type: 'smoke_detection', label: '煙霧偵測', count: 1 },
  { type: 'fall_detection', label: '跌倒偵測', count: 2 },
];
const generateMockSeverityStats = () => [{
  severity: 'warning',
  label: '警告',
  count: 18
}, {
  severity: 'error',
  label: '嚴重',
  count: 7
}, {
  severity: 'critical',
  label: '危害',
  count: 3
}];
const generateMockSiteDistribution = () => [{
  id: '1',
  name: '內湖汙水處理廠',
  total: 15,
  warning: 8,
  error: 5,
  critical: 2
}, {
  id: '2',
  name: '松山捷運站工地',
  total: 12,
  warning: 7,
  error: 4,
  critical: 1
}, {
  id: '3',
  name: '板橋車站雙子星',
  total: 9,
  warning: 6,
  error: 2,
  critical: 1
}, {
  id: '4',
  name: '新莊土地重劃區',
  total: 6,
  warning: 4,
  error: 1,
  critical: 1
}, {
  id: '5',
  name: '新店道路拓寬',
  total: 4,
  warning: 2,
  error: 1,
  critical: 1
}];
const TrendAnalysisPage = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [wsAlerts, setWsAlerts] = useState<WebSocketAlert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
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
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const [sensorRes, devicesRes, wsAlertsRes] = await Promise.all([supabase.from('device_sensor_history').select('*').gte('recorded_at', startTime).order('recorded_at', {
        ascending: true
      }), supabase.from('devices').select('id, device_id, name, location, company_id, site_id'), supabase.from('websocket_alerts').select('*').gte('created_at', startTime).order('created_at', {
        ascending: true
      })]);
      if (sensorRes.data) setSensorData(sensorRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
      if (wsAlertsRes.data) setWsAlerts(wsAlertsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter devices by company and site
  const companyFilteredDevices = useMemo(() => {
    let result = devices;
    if (selectedCompanyId !== 'all') {
      result = result.filter(d => d.company_id === selectedCompanyId);
    }
    if (selectedSiteId !== 'all') {
      result = result.filter(d => d.site_id === selectedSiteId);
    }
    return result;
  }, [devices, selectedCompanyId, selectedSiteId]);

  // Filter sensor data based on company/site filtered devices and selected device
  const filteredSensorData = useMemo(() => {
    const deviceIds = new Set(companyFilteredDevices.map(d => d.device_id));
    let filtered = sensorData.filter(d => deviceIds.has(d.device_id));
    if (selectedDevice !== 'all') {
      filtered = filtered.filter(d => d.device_id === selectedDevice);
    }
    return filtered;
  }, [sensorData, companyFilteredDevices, selectedDevice]);

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
      max: Math.round(Math.max(...arr) * 10) / 10
    } : null;
    return {
      temperature: calcStats(temps),
      humidity: calcStats(humids),
      pm25: calcStats(pm25s),
      pm10: calcStats(pm10s),
      noise: calcStats(noises),
      dataCount: filteredSensorData.length
    };
  }, [filteredSensorData]);

  // Filter WebSocket alerts based on company/site and selected device
  const filteredWsAlerts = useMemo(() => {
    const deviceIds = new Set(companyFilteredDevices.map(d => d.device_id));
    let filtered = wsAlerts.filter(a => !a.device_id || deviceIds.has(a.device_id));
    if (selectedDevice !== 'all') {
      filtered = filtered.filter(a => a.device_id === selectedDevice);
    }
    return filtered;
  }, [wsAlerts, companyFilteredDevices, selectedDevice]);

  // WebSocket alert statistics by type - only show 5 featured types
  const wsAlertStats = useMemo(() => {
    if (filteredWsAlerts.length === 0) return generateMockAlertStats();
    
    // Count alerts for featured types only
    const stats: Record<string, number> = {};
    FEATURED_ALERT_TYPES.forEach(type => {
      stats[type] = 0;
    });
    
    filteredWsAlerts.forEach(alert => {
      if (FEATURED_ALERT_TYPES.includes(alert.alert_type)) {
        stats[alert.alert_type] = (stats[alert.alert_type] || 0) + 1;
      }
    });
    
    return FEATURED_ALERT_TYPES.map(type => ({
      type,
      label: FEATURED_ALERT_LABELS[type] || getAlertTypeLabel(type),
      count: stats[type] || 0
    }));
  }, [filteredWsAlerts]);

  // WebSocket alert trend data
  const wsAlertTrendData = useMemo(() => {
    if (filteredWsAlerts.length === 0) return generateMockAlertData(timeRange);
    const grouped: {
      [key: string]: number;
    } = {};
    const is7Days = timeRange === '7d';
    filteredWsAlerts.forEach(alert => {
      let timeKey: string;
      if (is7Days) {
        timeKey = new Date(alert.created_at).toLocaleDateString('zh-TW', {
          month: 'numeric',
          day: 'numeric'
        });
      } else {
        timeKey = new Date(alert.created_at).toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      grouped[timeKey] = (grouped[timeKey] || 0) + 1;
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([time, count]) => ({
      time,
      count
    }));
  }, [filteredWsAlerts, timeRange]);

  // WebSocket alert severity statistics
  const wsSeverityStats = useMemo(() => {
    if (filteredWsAlerts.length === 0) return generateMockSeverityStats();
    const stats: Record<string, number> = {
      warning: 0,
      error: 0,
      critical: 0
    };
    filteredWsAlerts.forEach(alert => {
      if (stats[alert.severity] !== undefined) {
        stats[alert.severity]++;
      } else {
        // Map unknown severities to warning
        stats['warning']++;
      }
    });
    return Object.entries(stats).map(([severity, count]) => ({
      severity,
      label: SEVERITY_LABELS[severity] || severity,
      count
    }));
  }, [filteredWsAlerts]);

  // Site alert distribution data
  const siteAlertDistribution = useMemo(() => {
    if (wsAlerts.length === 0) return generateMockSiteDistribution();
    const siteStats: Record<string, {
      name: string;
      total: number;
      warning: number;
      error: number;
      critical: number;
    }> = {};
    wsAlerts.forEach(alert => {
      if (!alert.device_id) return;
      const device = devices.find(d => d.device_id === alert.device_id);
      const siteName = device?.name || alert.device_name || alert.device_id;
      if (!siteStats[alert.device_id]) {
        siteStats[alert.device_id] = {
          name: siteName,
          total: 0,
          warning: 0,
          error: 0,
          critical: 0
        };
      }
      siteStats[alert.device_id].total++;
      if (alert.severity === 'warning') siteStats[alert.device_id].warning++;else if (alert.severity === 'error') siteStats[alert.device_id].error++;else if (alert.severity === 'critical') siteStats[alert.device_id].critical++;
    });
    return Object.entries(siteStats).map(([id, stats]) => ({
      id,
      ...stats
    })).sort((a, b) => b.total - a.total);
  }, [wsAlerts, devices]);

  // Site alert pie chart data
  const sitePieData = useMemo(() => {
    return siteAlertDistribution.map(site => ({
      name: site.name.length > 10 ? site.name.substring(0, 10) + '...' : site.name,
      fullName: site.name,
      value: site.total
    }));
  }, [siteAlertDistribution]);
  const SITE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

  // Trend chart data with mock fallback
  const trendData = useMemo(() => {
    if (filteredSensorData.length === 0) return generateMockTrendData(timeRange);
    const grouped: {
      [key: string]: SensorData[];
    } = {};
    const is7Days = timeRange === '7d';
    filteredSensorData.forEach(d => {
      let timeKey: string;
      if (is7Days) {
        timeKey = new Date(d.recorded_at).toLocaleDateString('zh-TW', {
          month: 'numeric',
          day: 'numeric'
        });
      } else {
        timeKey = new Date(d.recorded_at).toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (!grouped[timeKey]) grouped[timeKey] = [];
      grouped[timeKey].push(d);
    });
    const maxPoints = is7Days ? 14 : 12;
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-maxPoints).map(([time, records]) => {
      const temps = records.map(r => r.temperature).filter(v => v !== null) as number[];
      const pm25s = records.map(r => r.pm25).filter(v => v !== null) as number[];
      const humids = records.map(r => r.humidity).filter(v => v !== null) as number[];
      const pm10s = records.map(r => r.pm10).filter(v => v !== null) as number[];
      const noises = records.map(r => r.noise).filter(v => v !== null) as number[];
      const solars = records.map(r => r.solar_power).filter(v => v !== null) as number[];
      return {
        time,
        temperature: temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10 : null,
        pm25: pm25s.length > 0 ? Math.round(pm25s.reduce((a, b) => a + b, 0) / pm25s.length * 10) / 10 : null,
        humidity: humids.length > 0 ? Math.round(humids.reduce((a, b) => a + b, 0) / humids.length * 10) / 10 : null,
        pm10: pm10s.length > 0 ? Math.round(pm10s.reduce((a, b) => a + b, 0) / pm10s.length * 10) / 10 : null,
        noise: noises.length > 0 ? Math.round(noises.reduce((a, b) => a + b, 0) / noises.length * 10) / 10 : null,
        solar: solars.length > 0 ? Math.round(solars.reduce((a, b) => a + b, 0) / solars.length * 10) / 10 : null
      };
    });
  }, [filteredSensorData, timeRange]);

  // Check if using mock data
  const isUsingMockData = filteredSensorData.length === 0;
  const isUsingMockAlerts = filteredWsAlerts.length === 0;

  // CSV Export function
  const exportToCSV = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Export sensor data
    const sensorHeaders = ['設備ID', '記錄時間', '溫度(°C)', '濕度(%)', 'PM2.5(µg/m³)', 'PM10(µg/m³)', '噪音(dB)', '太陽能功率(W)'];
    const sensorRows = filteredSensorData.map(d => [d.device_id, new Date(d.recorded_at).toLocaleString('zh-TW'), d.temperature ?? '', d.humidity ?? '', d.pm25 ?? '', d.pm10 ?? '', d.noise ?? '', d.solar_power ?? '']);

    // Export alert data
    const alertHeaders = ['警報ID', '警報類型', '訊息', '設備ID', '設備名稱', '嚴重程度', '已確認', '建立時間'];
    const alertRows = filteredWsAlerts.map(a => [a.id, getAlertTypeLabel(a.alert_type), a.message, a.device_id ?? '', a.device_name ?? '', SEVERITY_LABELS[a.severity] || a.severity, a.acknowledged ? '是' : '否', new Date(a.created_at).toLocaleString('zh-TW')]);

    // Combine into single CSV with sections
    const csvContent = ['=== 感測器數據 ===', sensorHeaders.join(','), ...sensorRows.map(row => row.map(cell => `"${cell}"`).join(',')), '', '=== 警報記錄 ===', alertHeaders.join(','), ...alertRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `趨勢分析報告_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`已匯出 ${filteredSensorData.length} 筆感測器數據和 ${filteredWsAlerts.length} 筆警報記錄`);
  }, [filteredSensorData, filteredWsAlerts]);
  if (loading || filterLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>;
  }
  return <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            趨勢分析
          </h1>
          <p className="text-muted-foreground">{getTimeRangeLabel()}環境監測數據趨勢與統計</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <CompanySiteFilter companies={companies} filteredSites={filteredSites} selectedCompanyId={selectedCompanyId} selectedSiteId={selectedSiteId} onCompanyChange={setSelectedCompanyId} onSiteChange={setSelectedSiteId} compact />
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[100px] bg-card">
                <SelectValue placeholder="時間範圍" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {TIME_RANGES.map(range => <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="選擇設備" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">全部設備</SelectItem>
                {companyFilteredDevices.map(device => <SelectItem key={device.device_id} value={device.device_id}>
                    {device.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={exportToCSV} className="gap-2" disabled={isUsingMockData && isUsingMockAlerts}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">匯出 CSV</span>
          </Button>
        </div>
      </div>

      {/* Current Selection Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {(selectedCompanyId !== 'all' || selectedSiteId !== 'all') && <>
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
          </>}
        <Badge variant="outline" className="text-sm">
          設備: {selectedDeviceName}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          時間: {getTimeRangeLabel()}
        </Badge>
        {(isUsingMockData || isUsingMockAlerts) && <Badge variant="outline" className="text-sm text-muted-foreground border-dashed">
            展示模擬數據
          </Badge>}
      </div>


      {/* AI Detection Alert Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          AI 偵測警報分析
          {isUsingMockAlerts && <Badge variant="outline" className="text-xs text-muted-foreground border-dashed ml-2">
              模擬數據
            </Badge>}
        </h2>
        
        {/* Severity Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {wsSeverityStats.map(stat => <Card key={stat.severity} className="border-2" style={{
          borderColor: `${SEVERITY_COLORS[stat.severity]}40`,
          background: `linear-gradient(135deg, ${SEVERITY_COLORS[stat.severity]}15, ${SEVERITY_COLORS[stat.severity]}05)`
        }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{
                backgroundColor: SEVERITY_COLORS[stat.severity]
              }} />
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
                <div className="text-3xl font-bold" style={{
              color: SEVERITY_COLORS[stat.severity]
            }}>
                  {stat.count}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.severity === 'warning' && '需要注意的潛在問題'}
                  {stat.severity === 'error' && '需要立即處理'}
                  {stat.severity === 'critical' && '緊急危險狀況'}
                </div>
              </CardContent>
            </Card>)}
        </div>

        {/* Alert Type Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {wsAlertStats.map(stat => (
            <Card key={stat.type} className="p-4">
              <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
              <div className="mt-2 text-2xl font-bold">{stat.count}</div>
            </Card>
          ))}
        </div>

        {/* Alert Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Alert Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                警報趨勢
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wsAlertTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))'
                  }} />
                    <YAxis tick={{
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))'
                  }} />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} formatter={(value: number) => [`${value} 次`, '警報次數']} />
                    <Bar dataKey="count" fill="hsl(185, 85%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Alert Type Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-violet-500" />
                警報類型分佈
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wsAlertStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))'
                  }} />
                    <YAxis type="category" dataKey="label" tick={{
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))'
                  }} width={80} />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} formatter={(value: number) => [`${value} 次`, '次數']} />
                    <Bar dataKey="count" fill="hsl(270, 70%, 55%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Site Alert Bar Chart - Full Width */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              各工地警報統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteAlertDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                  <YAxis type="category" dataKey="name" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} width={120} tickFormatter={value => value.length > 12 ? value.substring(0, 12) + '...' : value} />
                    <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} formatter={(value: number, name: string) => {
                  return [`${value} 次`, SEVERITY_LABELS[name] || name];
                }} />
                    <Legend formatter={value => SEVERITY_LABELS[value] || value} />
                    <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.critical} name="critical" />
                    <Bar dataKey="error" stackId="a" fill={SEVERITY_COLORS.error} name="error" />
                    <Bar dataKey="warning" stackId="a" fill={SEVERITY_COLORS.warning} name="warning" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Site Alert Pie Chart - Standalone */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              工地警報佔比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Pie Chart */}
              <div className="h-72 w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sitePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" stroke="hsl(var(--background))" strokeWidth={2} label={({
                    percent
                  }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {sitePieData.map((_, index) => <Cell key={`cell-${index}`} fill={SITE_COLORS[index % SITE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} formatter={(value: number, _: string, props: any) => [`${value} 次警報`, props.payload.fullName]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Custom Legend */}
              <div className="w-full lg:w-1/2 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">工地圖例</p>
                <div className="grid grid-cols-1 gap-2">
                  {sitePieData.map((site, index) => <div key={site.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{
                    backgroundColor: SITE_COLORS[index % SITE_COLORS.length]
                  }} />
                      <span className="text-sm truncate flex-1" title={site.fullName}>
                        {site.fullName}
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {site.value} 次
                      </Badge>
                    </div>)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Grid - 2x2 Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Temperature & Humidity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              溫溼度趨勢
              <div className="ml-auto flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-red-500 rounded" />
                  <span className="text-muted-foreground">溫度</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-sky-500 rounded" />
                  <span className="text-muted-foreground">濕度</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                  <YAxis yAxisId="temp" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} unit="°C" orientation="left" />
                  <YAxis yAxisId="humid" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} unit="%" orientation="right" />
                  <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} formatter={(value: number, name: string) => {
                  if (name === 'temperature') return [`${value}°C`, '溫度'];
                  if (name === 'humidity') return [`${value}%`, '濕度'];
                  return [value, name];
                }} />
                  <Area yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ef4444" fill="url(#tempGradient)" strokeWidth={2} name="temperature" />
                  <Area yAxisId="humid" type="monotone" dataKey="humidity" stroke="#0ea5e9" fill="url(#humidGradient)" strokeWidth={2} name="humidity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Air Quality Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wind className="w-4 h-4 text-violet-500" />
              空氣品質趨勢
              <div className="ml-auto flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-violet-500 rounded" />
                  <span className="text-muted-foreground">PM2.5</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-amber-600 rounded" />
                  <span className="text-muted-foreground">PM10</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pm10Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                  <YAxis tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} unit="μg/m³" />
                  <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    pm25: 'PM2.5',
                    pm10: 'PM10'
                  };
                  return [`${value} μg/m³`, labels[name] || name];
                }} />
                  <Area type="monotone" dataKey="pm25" stroke="#8b5cf6" fill="url(#pm25Gradient)" strokeWidth={2} name="pm25" />
                  <Area type="monotone" dataKey="pm10" stroke="#d97706" fill="url(#pm10Gradient)" strokeWidth={2} name="pm10" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Noise Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-500" />
              噪音趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="noiseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                  <YAxis tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} unit="dB" />
                  <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} formatter={(value: number) => [`${value} dB`, '噪音']} />
                  <Area type="monotone" dataKey="noise" stroke="#64748b" fill="url(#noiseGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Solar Power Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              太陽能發電趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} />
                  <YAxis tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} unit=" kW" />
                  <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} formatter={(value: number) => [`${value} kW`, '發電量']} />
                  <Area type="monotone" dataKey="solar" stroke="#eab308" fill="url(#solarGradient)" strokeWidth={2} name="solar" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default TrendAnalysisPage;