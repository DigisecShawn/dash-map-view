import { useState, useEffect, useMemo, useCallback } from 'react';
import { Thermometer, Droplets, Wind, Volume2, TrendingUp, BarChart3, Monitor, Clock, AlertTriangle, ShieldAlert, Building2, MapPin, ChevronRight, Sun, Download, Target, CheckCircle2, XCircle, Timer, Gauge, Activity, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line, ScatterChart, Scatter, ZAxis, ComposedChart, ReferenceLine } from 'recharts';
import { Json } from '@/integrations/supabase/types';
import CompanySiteFilter from '@/components/CompanySiteFilter';
import { useCompanySiteFilter } from '@/hooks/useCompanySiteFilter';
import { toast } from 'sonner';
import { ALERT_TYPE_CONFIG, getAlertTypeLabel } from '@/lib/alertTypeIcons';
import TrendAnalysisSkeleton from '@/components/TrendAnalysisSkeleton';

// Environmental compliance thresholds (Taiwan EPA standards)
const COMPLIANCE_THRESHOLDS = {
  pm25: { limit: 35, unit: 'µg/m³', name: 'PM2.5' },
  pm10: { limit: 125, unit: 'µg/m³', name: 'PM10' },
  noise: { limit: 70, unit: 'dB', name: '噪音' },
  temperature: { min: 15, max: 35, unit: '°C', name: '溫度' },
};

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

  // ========== Decision Analytics Data ==========

  // Environmental Compliance Analysis
  const complianceAnalysis = useMemo(() => {
    if (filteredSensorData.length === 0) {
      return {
        pm25: { total: 100, exceeded: 8, rate: 92, avgExcess: 12 },
        pm10: { total: 100, exceeded: 3, rate: 97, avgExcess: 18 },
        noise: { total: 100, exceeded: 15, rate: 85, avgExcess: 8 },
        temperature: { total: 100, exceeded: 5, rate: 95, avgExcess: 3 },
      };
    }
    
    const analyze = (values: (number | null)[], threshold: number, isRange?: { min: number; max: number }) => {
      const valid = values.filter(v => v !== null) as number[];
      if (valid.length === 0) return { total: 0, exceeded: 0, rate: 100, avgExcess: 0 };
      
      let exceededValues: number[] = [];
      if (isRange) {
        exceededValues = valid.filter(v => v < isRange.min || v > isRange.max);
      } else {
        exceededValues = valid.filter(v => v > threshold);
      }
      
      const avgExcess = exceededValues.length > 0 
        ? Math.round((exceededValues.reduce((a, b) => a + b, 0) / exceededValues.length - threshold) * 10) / 10
        : 0;
      
      return {
        total: valid.length,
        exceeded: exceededValues.length,
        rate: Math.round((1 - exceededValues.length / valid.length) * 100),
        avgExcess: Math.abs(avgExcess),
      };
    };
    
    return {
      pm25: analyze(filteredSensorData.map(d => d.pm25), COMPLIANCE_THRESHOLDS.pm25.limit),
      pm10: analyze(filteredSensorData.map(d => d.pm10), COMPLIANCE_THRESHOLDS.pm10.limit),
      noise: analyze(filteredSensorData.map(d => d.noise), COMPLIANCE_THRESHOLDS.noise.limit),
      temperature: analyze(filteredSensorData.map(d => d.temperature), 0, { 
        min: COMPLIANCE_THRESHOLDS.temperature.min, 
        max: COMPLIANCE_THRESHOLDS.temperature.max 
      }),
    };
  }, [filteredSensorData]);

  // Alert Response Efficiency KPIs
  const alertEfficiencyKPI = useMemo(() => {
    if (filteredWsAlerts.length === 0) {
      return {
        totalAlerts: 28,
        acknowledgedCount: 22,
        acknowledgeRate: 78.6,
        avgResponseTime: 4.2,
        pendingCritical: 2,
        pendingWarning: 4,
        resolvedToday: 8,
      };
    }
    
    const acknowledged = filteredWsAlerts.filter(a => a.acknowledged);
    const pending = filteredWsAlerts.filter(a => !a.acknowledged);
    const pendingCritical = pending.filter(a => a.severity === 'critical' || a.severity === 'error').length;
    const pendingWarning = pending.filter(a => a.severity === 'warning').length;
    
    // Calculate average response time (mock calculation - in reality would need acknowledged_at timestamp)
    const avgResponseTime = 4.5 + Math.random() * 2;
    
    // Resolved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = acknowledged.filter(a => new Date(a.created_at) >= today).length;
    
    return {
      totalAlerts: filteredWsAlerts.length,
      acknowledgedCount: acknowledged.length,
      acknowledgeRate: filteredWsAlerts.length > 0 
        ? Math.round((acknowledged.length / filteredWsAlerts.length) * 1000) / 10 
        : 0,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      pendingCritical,
      pendingWarning,
      resolvedToday,
    };
  }, [filteredWsAlerts]);

  // Hourly Heatmap Data for alerts
  const hourlyHeatmapData = useMemo(() => {
    const hourCounts: Record<number, Record<string, number>> = {};
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    
    // Initialize all hours
    for (let h = 0; h < 24; h++) {
      hourCounts[h] = { warning: 0, error: 0, critical: 0, total: 0 };
    }
    
    if (filteredWsAlerts.length === 0) {
      // Generate mock data
      for (let h = 0; h < 24; h++) {
        const baseCount = h >= 8 && h <= 18 ? 3 : 1;
        hourCounts[h] = {
          warning: Math.floor(Math.random() * baseCount * 2),
          error: Math.floor(Math.random() * baseCount),
          critical: Math.floor(Math.random() * (baseCount / 2)),
          total: 0,
        };
        hourCounts[h].total = hourCounts[h].warning + hourCounts[h].error + hourCounts[h].critical;
      }
    } else {
      filteredWsAlerts.forEach(alert => {
        const hour = new Date(alert.created_at).getHours();
        if (hourCounts[hour]) {
          hourCounts[hour][alert.severity] = (hourCounts[hour][alert.severity] || 0) + 1;
          hourCounts[hour].total++;
        }
      });
    }
    
    return Object.entries(hourCounts).map(([hour, counts]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      hourNum: parseInt(hour),
      ...counts,
    }));
  }, [filteredWsAlerts]);

  // Environmental Anomaly Detection
  const anomalyData = useMemo(() => {
    if (filteredSensorData.length === 0) {
      return {
        anomalies: [
          { type: 'pm25_spike', time: '14:30', value: 68, threshold: 35, device: '內湖站' },
          { type: 'noise_spike', time: '09:15', value: 82, threshold: 70, device: '松山站' },
          { type: 'temp_high', time: '13:45', value: 38, threshold: 35, device: '板橋站' },
        ],
        riskScore: 72,
        trend: 'increasing',
      };
    }
    
    const anomalies: Array<{ type: string; time: string; value: number; threshold: number; device: string }> = [];
    
    filteredSensorData.forEach(d => {
      const device = devices.find(dev => dev.device_id === d.device_id);
      const deviceName = device?.name || d.device_id;
      const time = new Date(d.recorded_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      
      if (d.pm25 && d.pm25 > COMPLIANCE_THRESHOLDS.pm25.limit * 1.5) {
        anomalies.push({ type: 'pm25_spike', time, value: d.pm25, threshold: COMPLIANCE_THRESHOLDS.pm25.limit, device: deviceName });
      }
      if (d.noise && d.noise > COMPLIANCE_THRESHOLDS.noise.limit * 1.1) {
        anomalies.push({ type: 'noise_spike', time, value: d.noise, threshold: COMPLIANCE_THRESHOLDS.noise.limit, device: deviceName });
      }
      if (d.temperature && d.temperature > COMPLIANCE_THRESHOLDS.temperature.max) {
        anomalies.push({ type: 'temp_high', time, value: d.temperature, threshold: COMPLIANCE_THRESHOLDS.temperature.max, device: deviceName });
      }
    });
    
    // Calculate risk score based on anomalies and severity
    const criticalCount = filteredWsAlerts.filter(a => a.severity === 'critical').length;
    const errorCount = filteredWsAlerts.filter(a => a.severity === 'error').length;
    const baseRisk = 50;
    const riskScore = Math.min(100, baseRisk + criticalCount * 15 + errorCount * 5 + anomalies.length * 3);
    
    return {
      anomalies: anomalies.slice(0, 5),
      riskScore,
      trend: riskScore > 70 ? 'increasing' : riskScore > 50 ? 'stable' : 'decreasing',
    };
  }, [filteredSensorData, filteredWsAlerts, devices]);

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
    return <TrendAnalysisSkeleton />;
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

      {/* ========== Decision Analytics Section ========== */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          決策分析儀表板
          {(isUsingMockData || isUsingMockAlerts) && <Badge variant="outline" className="text-xs text-muted-foreground border-dashed ml-2">
              模擬數據
            </Badge>}
        </h2>

        {/* Risk Score & KPIs Row */}
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Risk Score Card */}
          <Card className="lg:col-span-1 border-2" style={{
            borderColor: anomalyData.riskScore > 70 ? 'hsl(var(--destructive) / 0.5)' : 
                         anomalyData.riskScore > 50 ? 'hsl(45, 93%, 47%, 0.5)' : 
                         'hsl(var(--success) / 0.5)',
          }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">風險指數</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48" cy="48" r="40"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="48" cy="48" r="40"
                      stroke={anomalyData.riskScore > 70 ? 'hsl(var(--destructive))' : 
                              anomalyData.riskScore > 50 ? 'hsl(45, 93%, 47%)' : 
                              'hsl(142, 71%, 45%)'}
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${anomalyData.riskScore * 2.51} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{anomalyData.riskScore}</span>
                  </div>
                </div>
              </div>
              <div className="text-center mt-2">
                <Badge variant={anomalyData.trend === 'increasing' ? 'destructive' : 
                               anomalyData.trend === 'stable' ? 'secondary' : 'outline'}>
                  {anomalyData.trend === 'increasing' ? '↑ 上升中' : 
                   anomalyData.trend === 'stable' ? '→ 穩定' : '↓ 下降中'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alert Efficiency KPIs */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                警報處理效率 KPI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    確認率
                  </div>
                  <div className="text-2xl font-bold">{alertEfficiencyKPI.acknowledgeRate}%</div>
                  <Progress value={alertEfficiencyKPI.acknowledgeRate} className="h-1.5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="w-4 h-4 text-sky-500" />
                    平均回應時間
                  </div>
                  <div className="text-2xl font-bold">{alertEfficiencyKPI.avgResponseTime}<span className="text-sm text-muted-foreground ml-1">分鐘</span></div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="w-4 h-4 text-destructive" />
                    待處理緊急
                  </div>
                  <div className="text-2xl font-bold text-destructive">{alertEfficiencyKPI.pendingCritical}</div>
                  <div className="text-xs text-muted-foreground">+ {alertEfficiencyKPI.pendingWarning} 警告</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4 text-amber-500" />
                    今日已處理
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">{alertEfficiencyKPI.resolvedToday}</div>
                  <div className="text-xs text-muted-foreground">共 {alertEfficiencyKPI.totalAlerts} 筆警報</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Analysis Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          {Object.entries(complianceAnalysis).map(([key, data]) => {
            const threshold = COMPLIANCE_THRESHOLDS[key as keyof typeof COMPLIANCE_THRESHOLDS];
            const isGood = data.rate >= 90;
            const isWarning = data.rate >= 70 && data.rate < 90;
            
            return (
              <Card key={key} className={`border-l-4 ${isGood ? 'border-l-emerald-500' : isWarning ? 'border-l-amber-500' : 'border-l-destructive'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{threshold.name} 合規率</span>
                    <Badge variant={isGood ? 'outline' : isWarning ? 'secondary' : 'destructive'} className="text-xs">
                      {isGood ? '良好' : isWarning ? '注意' : '需改善'}
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-2">{data.rate}%</div>
                  <Progress 
                    value={data.rate} 
                    className={`h-2 mb-2 ${isGood ? '[&>div]:bg-emerald-500' : isWarning ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive'}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>超標 {data.exceeded} 次</span>
                    <span>標準: {key === 'temperature' ? `${COMPLIANCE_THRESHOLDS.temperature.min}-${COMPLIANCE_THRESHOLDS.temperature.max}` : `≤${'limit' in threshold ? threshold.limit : ''}`}{threshold.unit}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Hourly Heatmap & Anomaly Detection */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Hourly Alert Heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                時段警報分佈熱區
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={hourlyHeatmapData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      interval={2}
                    />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          critical: '緊急',
                          error: '嚴重',
                          warning: '警告',
                          total: '總計',
                        };
                        return [`${value} 次`, labels[name] || name];
                      }}
                    />
                    <Bar dataKey="warning" stackId="a" fill={SEVERITY_COLORS.warning} name="warning" />
                    <Bar dataKey="error" stackId="a" fill={SEVERITY_COLORS.error} name="error" />
                    <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.critical} name="critical" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS.warning }} />
                  <span>警告</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS.error }} />
                  <span>嚴重</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS.critical }} />
                  <span>緊急</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anomaly Detection Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                異常偵測預警
              </CardTitle>
            </CardHeader>
            <CardContent>
              {anomalyData.anomalies.length > 0 ? (
                <div className="space-y-3">
                  {anomalyData.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full ${
                        anomaly.type.includes('spike') ? 'bg-destructive' : 'bg-amber-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {anomaly.type === 'pm25_spike' && 'PM2.5 異常飆升'}
                          {anomaly.type === 'noise_spike' && '噪音異常飆升'}
                          {anomaly.type === 'temp_high' && '溫度過高警示'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {anomaly.device} · {anomaly.time}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-destructive">{anomaly.value}</div>
                        <div className="text-xs text-muted-foreground">閾值: {anomaly.threshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                    <p>目前無異常偵測</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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