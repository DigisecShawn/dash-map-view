import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, Monitor, Clock, Building2, MapPin, ChevronRight, Download, Target, ShieldAlert, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import CompanySiteFilter from '@/components/CompanySiteFilter';
import { useCompanySiteFilter } from '@/hooks/useCompanySiteFilter';
import { toast } from 'sonner';
import { getAlertTypeLabel } from '@/lib/alertTypeIcons';
import TrendAnalysisSkeleton from '@/components/TrendAnalysisSkeleton';
import DecisionAnalyticsDashboard from '@/components/trends/DecisionAnalyticsDashboard';
import AIAlertAnalysis from '@/components/trends/AIAlertAnalysis';
import EnvironmentalTrends from '@/components/trends/EnvironmentalTrends';

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

const TIME_RANGES = [
  { value: '6h', label: '6 小時', hours: 6 },
  { value: '12h', label: '12 小時', hours: 12 },
  { value: '24h', label: '24 小時', hours: 24 },
  { value: '7d', label: '7 天', hours: 168 },
];

const SEVERITY_LABELS: Record<string, string> = {
  'warning': '警告',
  'error': '嚴重',
  'critical': '緊急',
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

// Generate mock data for demonstration
const generateMockTrendData = (timeRange: string) => {
  const is7Days = timeRange === '7d';
  const points = is7Days ? 7 : 12;
  const now = new Date();
  return Array.from({ length: points }, (_, i) => {
    const date = new Date(now);
    if (is7Days) {
      date.setDate(date.getDate() - (points - 1 - i));
    } else {
      date.setHours(date.getHours() - (points - 1 - i) * 2);
    }
    const timeKey = is7Days 
      ? date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) 
      : date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    return {
      time: timeKey,
      temperature: Math.round((25 + Math.sin(i * 0.5) * 5 + Math.random() * 2) * 10) / 10,
      humidity: Math.round((60 + Math.cos(i * 0.3) * 15 + Math.random() * 5) * 10) / 10,
      pm25: Math.round((35 + Math.sin(i * 0.4) * 20 + Math.random() * 10) * 10) / 10,
      pm10: Math.round((50 + Math.cos(i * 0.35) * 25 + Math.random() * 15) * 10) / 10,
      noise: Math.round((65 + Math.sin(i * 0.6) * 10 + Math.random() * 5) * 10) / 10,
      solar: Math.round((3 + Math.sin(i * 0.4) * 2 + Math.random()) * 10) / 10,
    };
  });
};

const generateMockAlertData = (timeRange: string) => {
  const is7Days = timeRange === '7d';
  const points = is7Days ? 7 : 8;
  const now = new Date();
  return Array.from({ length: points }, (_, i) => {
    const date = new Date(now);
    if (is7Days) {
      date.setDate(date.getDate() - (points - 1 - i));
    } else {
      date.setHours(date.getHours() - (points - 1 - i) * 3);
    }
    const timeKey = is7Days 
      ? date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) 
      : date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    return {
      time: timeKey,
      count: Math.floor(Math.random() * 8) + 1,
    };
  });
};

const generateMockAlertStats = () => [
  { type: 'no_helmet', label: '未戴安全帽', count: 12 },
  { type: 'no_seatbelt', label: '未戴安全帶', count: 5 },
  { type: 'fire_detection', label: '火焰偵測', count: 3 },
  { type: 'smoke_detection', label: '煙霧偵測', count: 1 },
  { type: 'fall_detection', label: '跌倒偵測', count: 2 },
];

const generateMockSeverityStats = () => [
  { severity: 'warning', label: '警告', count: 18 },
  { severity: 'error', label: '嚴重', count: 7 },
  { severity: 'critical', label: '危害', count: 3 },
];

const generateMockSiteDistribution = () => [
  { id: '1', name: '內湖汙水處理廠', total: 15, warning: 8, error: 5, critical: 2 },
  { id: '2', name: '松山捷運站工地', total: 12, warning: 7, error: 4, critical: 1 },
  { id: '3', name: '板橋車站雙子星', total: 9, warning: 6, error: 2, critical: 1 },
  { id: '4', name: '新莊土地重劃區', total: 6, warning: 4, error: 1, critical: 1 },
  { id: '5', name: '新店道路拓寬', total: 4, warning: 2, error: 1, critical: 1 },
];

const TrendAnalysisPage = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [wsAlerts, setWsAlerts] = useState<WebSocketAlert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('decision');

  const {
    companies,
    filteredSites,
    selectedCompanyId,
    selectedSiteId,
    setSelectedCompanyId,
    setSelectedSiteId,
    loading: filterLoading,
    getCompanyName,
    getSiteName,
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
      
      const [sensorRes, devicesRes, wsAlertsRes] = await Promise.all([
        supabase.from('device_sensor_history').select('*').gte('recorded_at', startTime).order('recorded_at', { ascending: true }),
        supabase.from('devices').select('id, device_id, name, location, company_id, site_id'),
        supabase.from('websocket_alerts').select('*').gte('created_at', startTime).order('created_at', { ascending: true }),
      ]);
      
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
      count: stats[type] || 0,
    }));
  }, [filteredWsAlerts]);

  // WebSocket alert trend data
  const wsAlertTrendData = useMemo(() => {
    if (filteredWsAlerts.length === 0) return generateMockAlertData(timeRange);
    const grouped: { [key: string]: number } = {};
    const is7Days = timeRange === '7d';
    
    filteredWsAlerts.forEach(alert => {
      let timeKey: string;
      if (is7Days) {
        timeKey = new Date(alert.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
      } else {
        timeKey = new Date(alert.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      }
      grouped[timeKey] = (grouped[timeKey] || 0) + 1;
    });
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }));
  }, [filteredWsAlerts, timeRange]);

  // WebSocket alert severity statistics
  const wsSeverityStats = useMemo(() => {
    if (filteredWsAlerts.length === 0) return generateMockSeverityStats();
    const stats: Record<string, number> = { warning: 0, error: 0, critical: 0 };
    
    filteredWsAlerts.forEach(alert => {
      if (stats[alert.severity] !== undefined) {
        stats[alert.severity]++;
      } else {
        stats['warning']++;
      }
    });
    
    return Object.entries(stats).map(([severity, count]) => ({
      severity,
      label: SEVERITY_LABELS[severity] || severity,
      count,
    }));
  }, [filteredWsAlerts]);

  // Site alert distribution data
  const siteAlertDistribution = useMemo(() => {
    if (wsAlerts.length === 0) return generateMockSiteDistribution();
    const siteStats: Record<string, { name: string; total: number; warning: number; error: number; critical: number }> = {};
    
    wsAlerts.forEach(alert => {
      if (!alert.device_id) return;
      const device = devices.find(d => d.device_id === alert.device_id);
      const siteName = device?.name || alert.device_name || alert.device_id;
      
      if (!siteStats[alert.device_id]) {
        siteStats[alert.device_id] = { name: siteName, total: 0, warning: 0, error: 0, critical: 0 };
      }
      siteStats[alert.device_id].total++;
      if (alert.severity === 'warning') siteStats[alert.device_id].warning++;
      else if (alert.severity === 'error') siteStats[alert.device_id].error++;
      else if (alert.severity === 'critical') siteStats[alert.device_id].critical++;
    });
    
    return Object.entries(siteStats)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [wsAlerts, devices]);

  // Site alert pie chart data
  const sitePieData = useMemo(() => {
    return siteAlertDistribution.map(site => ({
      name: site.name.length > 10 ? site.name.substring(0, 10) + '...' : site.name,
      fullName: site.name,
      value: site.total,
    }));
  }, [siteAlertDistribution]);

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
        max: COMPLIANCE_THRESHOLDS.temperature.max,
      }),
    };
  }, [filteredSensorData]);

  // Get current (latest) sensor values
  const currentValues = useMemo(() => {
    if (filteredSensorData.length === 0) {
      // Mock data when no real data
      return {
        pm25: 28,
        pm10: 85,
        noise: 58,
        temperature: 26.5,
      };
    }
    
    const latest = filteredSensorData[filteredSensorData.length - 1];
    return {
      pm25: latest.pm25,
      pm10: latest.pm10,
      noise: latest.noise,
      temperature: latest.temperature,
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
    const avgResponseTime = 4.5 + Math.random() * 2;
    
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
    
    for (let h = 0; h < 24; h++) {
      hourCounts[h] = { warning: 0, error: 0, critical: 0, total: 0 };
    }
    
    if (filteredWsAlerts.length === 0) {
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
      hour: `${String(hour).padStart(2, '0')}:00`,
      hourNum: parseInt(hour),
      warning: counts.warning,
      error: counts.error,
      critical: counts.critical,
      total: counts.total,
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
        const solars = records.map(r => r.solar_power).filter(v => v !== null) as number[];
        
        return {
          time,
          temperature: temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10 : null,
          pm25: pm25s.length > 0 ? Math.round(pm25s.reduce((a, b) => a + b, 0) / pm25s.length * 10) / 10 : null,
          humidity: humids.length > 0 ? Math.round(humids.reduce((a, b) => a + b, 0) / humids.length * 10) / 10 : null,
          pm10: pm10s.length > 0 ? Math.round(pm10s.reduce((a, b) => a + b, 0) / pm10s.length * 10) / 10 : null,
          noise: noises.length > 0 ? Math.round(noises.reduce((a, b) => a + b, 0) / noises.length * 10) / 10 : null,
          solar: solars.length > 0 ? Math.round(solars.reduce((a, b) => a + b, 0) / solars.length * 10) / 10 : null,
        };
      });
  }, [filteredSensorData, timeRange]);

  // Check if using mock data
  const isUsingMockData = filteredSensorData.length === 0;
  const isUsingMockAlerts = filteredWsAlerts.length === 0;

  // CSV Export function
  const exportToCSV = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const sensorHeaders = ['設備ID', '記錄時間', '溫度(°C)', '濕度(%)', 'PM2.5(µg/m³)', 'PM10(µg/m³)', '噪音(dB)', '太陽能功率(W)'];
    const sensorRows = filteredSensorData.map(d => [
      d.device_id, 
      new Date(d.recorded_at).toLocaleString('zh-TW'), 
      d.temperature ?? '', 
      d.humidity ?? '', 
      d.pm25 ?? '', 
      d.pm10 ?? '', 
      d.noise ?? '', 
      d.solar_power ?? '',
    ]);

    const alertHeaders = ['警報ID', '警報類型', '訊息', '設備ID', '設備名稱', '嚴重程度', '已確認', '建立時間'];
    const alertRows = filteredWsAlerts.map(a => [
      a.id, 
      getAlertTypeLabel(a.alert_type), 
      a.message, 
      a.device_id ?? '', 
      a.device_name ?? '', 
      SEVERITY_LABELS[a.severity] || a.severity, 
      a.acknowledged ? '是' : '否', 
      new Date(a.created_at).toLocaleString('zh-TW'),
    ]);

    const csvContent = [
      '=== 感測器數據 ===', 
      sensorHeaders.join(','), 
      ...sensorRows.map(row => row.map(cell => `"${cell}"`).join(',')), 
      '', 
      '=== 警報記錄 ===', 
      alertHeaders.join(','), 
      ...alertRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
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

  return (
    <div className="p-4 md:p-6 space-y-6">
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
          <CompanySiteFilter 
            companies={companies} 
            filteredSites={filteredSites} 
            selectedCompanyId={selectedCompanyId} 
            selectedSiteId={selectedSiteId} 
            onCompanyChange={setSelectedCompanyId} 
            onSiteChange={setSelectedSiteId} 
            compact 
          />
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[100px] bg-card">
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
          
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="選擇設備" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">全部設備</SelectItem>
                {companyFilteredDevices.map(device => (
                  <SelectItem key={device.device_id} value={device.device_id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline" 
            onClick={exportToCSV} 
            className="gap-2" 
            disabled={isUsingMockData && isUsingMockAlerts}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">匯出 CSV</span>
          </Button>
        </div>
      </div>

      {/* Current Selection Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {(selectedCompanyId !== 'all' || selectedSiteId !== 'all') && (
          <>
            <Badge variant="outline" className="text-sm flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {selectedCompanyId === 'all' ? '全部公司' : getCompanyName(selectedCompanyId)}
            </Badge>
            {selectedSiteId !== 'all' && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline" className="text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {getSiteName(selectedSiteId)}
                </Badge>
              </>
            )}
          </>
        )}
        <Badge variant="outline" className="text-sm">
          設備: {selectedDeviceName}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          時間: {getTimeRangeLabel()}
        </Badge>
        {(isUsingMockData || isUsingMockAlerts) && (
          <Badge variant="outline" className="text-sm text-muted-foreground border-dashed">
            展示模擬數據
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="decision" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">決策分析儀表板</span>
            <span className="sm:hidden">決策分析</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">AI偵測警報分析</span>
            <span className="sm:hidden">警報分析</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">環境趨勢分析</span>
            <span className="sm:hidden">環境趨勢</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decision">
          <DecisionAnalyticsDashboard
            complianceAnalysis={complianceAnalysis}
            alertEfficiencyKPI={alertEfficiencyKPI}
            anomalyData={anomalyData}
            currentValues={currentValues}
            isUsingMockData={isUsingMockData}
            isUsingMockAlerts={isUsingMockAlerts}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <AIAlertAnalysis
            wsAlertStats={wsAlertStats}
            wsSeverityStats={wsSeverityStats}
            wsAlertTrendData={wsAlertTrendData}
            siteAlertDistribution={siteAlertDistribution}
            sitePieData={sitePieData}
            isUsingMockAlerts={isUsingMockAlerts}
          />
        </TabsContent>

        <TabsContent value="trends">
          <EnvironmentalTrends
            trendData={trendData}
            envStats={envStats}
            isUsingMockData={isUsingMockData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrendAnalysisPage;
