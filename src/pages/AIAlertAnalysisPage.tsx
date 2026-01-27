import { useState, useEffect, useMemo, useCallback } from 'react';
import { ShieldAlert, Monitor, Clock, Building2, MapPin, ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import CompanySiteFilter from '@/components/CompanySiteFilter';
import { useCompanySiteFilter } from '@/hooks/useCompanySiteFilter';
import { toast } from 'sonner';
import { getAlertTypeLabel } from '@/lib/alertTypeIcons';
import TrendAnalysisSkeleton from '@/components/TrendAnalysisSkeleton';
import AIAlertAnalysis from '@/components/trends/AIAlertAnalysis';

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

const AIAlertAnalysisPage = () => {
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
      
      const [devicesRes, wsAlertsRes] = await Promise.all([
        supabase.from('devices').select('id, device_id, name, location, company_id, site_id'),
        supabase.from('websocket_alerts').select('*').gte('created_at', startTime).order('created_at', { ascending: true }),
      ]);
      
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

  // Get selected device name
  const selectedDeviceName = useMemo(() => {
    if (selectedDevice === 'all') return '全部設備';
    const device = devices.find(d => d.device_id === selectedDevice);
    return device?.name || selectedDevice;
  }, [selectedDevice, devices]);

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

  const isUsingMockAlerts = filteredWsAlerts.length === 0;

  // CSV Export function
  const exportToCSV = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

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
      '=== 警報記錄 ===', 
      alertHeaders.join(','), 
      ...alertRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `AI警報分析報告_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`已匯出 ${filteredWsAlerts.length} 筆警報記錄`);
  }, [filteredWsAlerts]);

  if (loading || filterLoading) {
    return <TrendAnalysisSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            AI 偵測警報分析
          </h1>
          <p className="text-muted-foreground">{getTimeRangeLabel()} AI 影像辨識警報統計與趨勢</p>
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
            disabled={isUsingMockAlerts}
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
        {isUsingMockAlerts && (
          <Badge variant="outline" className="text-sm text-muted-foreground border-dashed">
            展示模擬數據
          </Badge>
        )}
      </div>

      {/* AI Alert Analysis Component */}
      <AIAlertAnalysis
        wsAlertStats={wsAlertStats}
        wsSeverityStats={wsSeverityStats}
        wsAlertTrendData={wsAlertTrendData}
        siteAlertDistribution={siteAlertDistribution}
        sitePieData={sitePieData}
        isUsingMockAlerts={isUsingMockAlerts}
      />
    </div>
  );
};

export default AIAlertAnalysisPage;
