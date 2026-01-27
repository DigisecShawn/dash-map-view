import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, Monitor, Clock, Building2, MapPin, ChevronRight, Download, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import CompanySiteFilter from '@/components/CompanySiteFilter';
import { useCompanySiteFilter } from '@/hooks/useCompanySiteFilter';
import { toast } from 'sonner';
import TrendAnalysisSkeleton from '@/components/TrendAnalysisSkeleton';
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

const TIME_RANGES = [
  { value: '6h', label: '6 小時', hours: 6 },
  { value: '12h', label: '12 小時', hours: 12 },
  { value: '24h', label: '24 小時', hours: 24 },
  { value: '7d', label: '7 天', hours: 168 },
];

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

const EnvironmentalTrendsPage = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
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
      
      const [sensorRes, devicesRes] = await Promise.all([
        supabase.from('device_sensor_history').select('*').gte('recorded_at', startTime).order('recorded_at', { ascending: true }),
        supabase.from('devices').select('id, device_id, name, location, company_id, site_id'),
      ]);
      
      if (sensorRes.data) setSensorData(sensorRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
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
    
    return {
      anomalies: anomalies.slice(0, 5),
      riskScore: 72,
      trend: 'increasing',
    };
  }, [filteredSensorData, devices]);

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

  const isUsingMockData = filteredSensorData.length === 0;

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

    const csvContent = [
      '=== 感測器數據 ===', 
      sensorHeaders.join(','), 
      ...sensorRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `環境趨勢分析報告_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`已匯出 ${filteredSensorData.length} 筆感測器數據`);
  }, [filteredSensorData]);

  if (loading || filterLoading) {
    return <TrendAnalysisSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            環境趨勢分析
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
            disabled={isUsingMockData}
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
        {isUsingMockData && (
          <Badge variant="outline" className="text-sm text-muted-foreground border-dashed">
            展示模擬數據
          </Badge>
        )}
      </div>

      {/* Environmental Trends Component */}
      <EnvironmentalTrends
        trendData={trendData}
        envStats={envStats}
        isUsingMockData={isUsingMockData}
        complianceAnalysis={complianceAnalysis}
        currentValues={currentValues}
      />
    </div>
  );
};

export default EnvironmentalTrendsPage;
