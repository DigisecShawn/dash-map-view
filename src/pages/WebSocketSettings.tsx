import { useState, useEffect } from 'react';
import { Wifi, Plus, Trash2, Save, RefreshCw, Power, PowerOff, Building2, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface WebSocketConfig {
  id: string;
  name: string;
  source_url: string;
  target_url: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  last_message_at: string | null;
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

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
}

interface SiteAlertSummary {
  device_id: string;
  device_name: string;
  location: string | null;
  total_alerts: number;
  error_count: number;
  warning_count: number;
  unacknowledged: number;
  latest_alert: string | null;
  alert_types: Record<string, number>;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  'no_helmet': '未戴安全帽',
  'no_vest': '未穿反光背心',
  'intrusion': '入侵偵測',
  'fire_smoke': '煙霧偵測',
  'fall_detection': '跌倒偵測',
};

const WebSocketSettings = () => {
  const [configs, setConfigs] = useState<WebSocketConfig[]>([
    {
      id: '1',
      name: 'AI 影像分析轉發',
      source_url: 'wss://ai-vision.example.com/stream',
      target_url: 'wss://dashboard.example.com/realtime',
      enabled: true,
      status: 'connected',
      last_message_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: '安全監控轉發',
      source_url: 'wss://safety.example.com/alerts',
      target_url: 'wss://api.example.com/ingest',
      enabled: true,
      status: 'connected',
      last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    source_url: '',
    target_url: '',
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [wsAlerts, setWsAlerts] = useState<WebSocketAlert[]>([]);
  const [siteSummaries, setSiteSummaries] = useState<SiteAlertSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('ws-alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'websocket_alerts' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, alertsRes] = await Promise.all([
        supabase.from('devices').select('id, device_id, name, location'),
        supabase.from('websocket_alerts').select('*').order('created_at', { ascending: false }),
      ]);

      if (devicesRes.data) setDevices(devicesRes.data);
      if (alertsRes.data) {
        setWsAlerts(alertsRes.data);
        calculateSiteSummaries(devicesRes.data || [], alertsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSiteSummaries = (deviceList: Device[], alerts: WebSocketAlert[]) => {
    const summaryMap: Record<string, SiteAlertSummary> = {};

    // Initialize with all devices
    deviceList.forEach(device => {
      summaryMap[device.device_id] = {
        device_id: device.device_id,
        device_name: device.name,
        location: device.location,
        total_alerts: 0,
        error_count: 0,
        warning_count: 0,
        unacknowledged: 0,
        latest_alert: null,
        alert_types: {},
      };
    });

    // Aggregate alerts
    alerts.forEach(alert => {
      if (!alert.device_id) return;
      
      if (!summaryMap[alert.device_id]) {
        summaryMap[alert.device_id] = {
          device_id: alert.device_id,
          device_name: alert.device_name || alert.device_id,
          location: null,
          total_alerts: 0,
          error_count: 0,
          warning_count: 0,
          unacknowledged: 0,
          latest_alert: null,
          alert_types: {},
        };
      }

      const summary = summaryMap[alert.device_id];
      summary.total_alerts++;
      if (alert.severity === 'error') summary.error_count++;
      if (alert.severity === 'warning') summary.warning_count++;
      if (!alert.acknowledged) summary.unacknowledged++;
      if (!summary.latest_alert || new Date(alert.created_at) > new Date(summary.latest_alert)) {
        summary.latest_alert = alert.created_at;
      }
      summary.alert_types[alert.alert_type] = (summary.alert_types[alert.alert_type] || 0) + 1;
    });

    // Sort by total alerts (descending) and filter only those with alerts
    const summaries = Object.values(summaryMap)
      .filter(s => s.total_alerts > 0)
      .sort((a, b) => b.total_alerts - a.total_alerts);

    setSiteSummaries(summaries);
  };

  const generateTestAlerts = async () => {
    const testAlerts = [
      { device_id: 'DEV-001', device_name: '內湖汙水廠工地', alert_type: 'no_helmet', severity: 'error', message: '偵測到人員未配戴安全帽', metadata: { confidence: 0.93, camera_id: 'CAM-A1', location: '入口區' } },
      { device_id: 'DEV-001', device_name: '內湖汙水廠工地', alert_type: 'intrusion', severity: 'error', message: '偵測到未授權人員進入管制區', metadata: { confidence: 0.89, camera_id: 'CAM-A2', zone: 'A區' } },
      { device_id: 'DEV-002', device_name: '新莊土地重劃工地', alert_type: 'no_vest', severity: 'warning', message: '偵測到人員未穿著反光背心', metadata: { confidence: 0.87, camera_id: 'CAM-B1', location: '施工區' } },
      { device_id: 'DEV-002', device_name: '新莊土地重劃工地', alert_type: 'fall_detection', severity: 'error', message: '偵測到人員跌倒', metadata: { confidence: 0.91, camera_id: 'CAM-B2', location: '鷹架區' } },
      { device_id: 'DEV-003', device_name: '板橋車站雙子星工地', alert_type: 'no_helmet', severity: 'error', message: '偵測到人員未配戴安全帽', metadata: { confidence: 0.95, camera_id: 'CAM-C1', location: '卸貨區' } },
      { device_id: 'DEV-003', device_name: '板橋車站雙子星工地', alert_type: 'fire_smoke', severity: 'error', message: '偵測到疑似煙霧', metadata: { confidence: 0.82, camera_id: 'CAM-C2', location: '倉儲區' } },
      { device_id: 'DEV-003', device_name: '板橋車站雙子星工地', alert_type: 'no_helmet', severity: 'error', message: '偵測到多名人員未配戴安全帽', metadata: { confidence: 0.88, camera_id: 'CAM-C3', location: '地下室', count: 3 } },
      { device_id: 'DEV-004', device_name: '新店道路拓寬工地', alert_type: 'intrusion', severity: 'warning', message: '偵測到非工作時間人員活動', metadata: { confidence: 0.79, camera_id: 'CAM-D1', zone: 'B區' } },
      { device_id: 'DEV-005', device_name: '松山捷運站新建工地', alert_type: 'no_helmet', severity: 'error', message: '偵測到人員未配戴安全帽', metadata: { confidence: 0.94, camera_id: 'CAM-E1', location: '隧道入口' } },
      { device_id: 'DEV-005', device_name: '松山捷運站新建工地', alert_type: 'no_vest', severity: 'warning', message: '偵測到人員未穿著反光背心', metadata: { confidence: 0.86, camera_id: 'CAM-E2', location: '月台區' } },
    ];

    try {
      const { error } = await supabase.from('websocket_alerts').insert(
        testAlerts.map(alert => ({
          ...alert,
          metadata: alert.metadata as Json,
        }))
      );

      if (error) throw error;
      toast.success(`已新增 ${testAlerts.length} 筆模擬警報資料`);
      fetchData();
    } catch (error) {
      console.error('Error inserting test alerts:', error);
      toast.error('新增模擬資料失敗');
    }
  };

  const handleAddConfig = () => {
    if (!newConfig.name || !newConfig.source_url || !newConfig.target_url) {
      toast.error('請填寫所有欄位');
      return;
    }

    const config: WebSocketConfig = {
      id: Date.now().toString(),
      ...newConfig,
      enabled: false,
      status: 'disconnected',
      last_message_at: null,
    };

    setConfigs(prev => [...prev, config]);
    setNewConfig({ name: '', source_url: '', target_url: '' });
    setIsAdding(false);
    toast.success('已新增轉發設定');
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setConfigs(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, enabled, status: enabled ? 'connected' : 'disconnected' }
          : c
      )
    );
    toast.success(enabled ? '已啟用轉發' : '已停用轉發');
  };

  const handleDelete = (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
    toast.success('已刪除轉發設定');
  };

  const getStatusBadge = (status: WebSocketConfig['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-success text-success-foreground">已連線</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">已斷線</Badge>;
      case 'error':
        return <Badge variant="destructive">錯誤</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WebSocket 轉發設定</h2>
          <p className="text-muted-foreground">設定 WebSocket 訊息轉發規則與查看工地警報歸納</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generateTestAlerts} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            產生模擬資料
          </Button>
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            新增轉發
          </Button>
        </div>
      </div>

      {/* Site Alert Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            工地場站警報歸納
            <Badge variant="outline" className="ml-auto">
              {siteSummaries.length} 個工地有警報
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : siteSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
              <p>目前無工地警報</p>
              <p className="text-sm">點擊「產生模擬資料」新增測試警報</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {siteSummaries.map(site => (
                  <Card key={site.device_id} className={`border ${site.error_count > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-semibold truncate">{site.device_name}</h3>
                            {site.location && (
                              <span className="text-xs text-muted-foreground">({site.location})</span>
                            )}
                          </div>
                          
                          {/* Alert Stats */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge variant="outline" className="bg-card">
                              總計 {site.total_alerts} 次
                            </Badge>
                            {site.error_count > 0 && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                嚴重 {site.error_count}
                              </Badge>
                            )}
                            {site.warning_count > 0 && (
                              <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                警告 {site.warning_count}
                              </Badge>
                            )}
                            {site.unacknowledged > 0 && (
                              <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                                待確認 {site.unacknowledged}
                              </Badge>
                            )}
                          </div>

                          {/* Alert Types */}
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(site.alert_types).map(([type, count]) => (
                              <div key={type} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                                <ShieldAlert className="w-3 h-3" />
                                <span>{ALERT_TYPE_LABELS[type] || type}</span>
                                <Badge variant="secondary" className="h-4 px-1 text-xs">{count}</Badge>
                              </div>
                            ))}
                          </div>

                          {site.latest_alert && (
                            <p className="text-xs text-muted-foreground mt-2">
                              最近警報: {new Date(site.latest_alert).toLocaleString('zh-TW')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add new config form */}
      {isAdding && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">新增轉發設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>名稱</Label>
                <Input
                  placeholder="轉發名稱"
                  value={newConfig.name}
                  onChange={e => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>來源 WebSocket URL</Label>
                <Input
                  placeholder="wss://source.example.com"
                  value={newConfig.source_url}
                  onChange={e => setNewConfig(prev => ({ ...prev, source_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>目標 WebSocket URL</Label>
                <Input
                  placeholder="wss://target.example.com"
                  value={newConfig.target_url}
                  onChange={e => setNewConfig(prev => ({ ...prev, target_url: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                取消
              </Button>
              <Button onClick={handleAddConfig} className="gap-2">
                <Save className="w-4 h-4" />
                儲存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            轉發設定列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wifi className="w-12 h-12 mb-4 opacity-50" />
                <p>尚無轉發設定</p>
                <p className="text-sm">點擊「新增轉發」開始設定</p>
              </div>
            ) : (
              configs.map(config => (
                <Card key={config.id} className={config.enabled ? 'border-success/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold truncate">{config.name}</h3>
                          {getStatusBadge(config.status)}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">來源:</span>
                            <code className="bg-muted px-2 py-0.5 rounded text-xs truncate max-w-md">
                              {config.source_url}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">目標:</span>
                            <code className="bg-muted px-2 py-0.5 rounded text-xs truncate max-w-md">
                              {config.target_url}
                            </code>
                          </div>
                          {config.last_message_at && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="w-16">最後訊息:</span>
                              <span>{new Date(config.last_message_at).toLocaleString('zh-TW')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {config.enabled ? (
                            <Power className="w-4 h-4 text-success" />
                          ) : (
                            <PowerOff className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={config.enabled}
                            onCheckedChange={checked => handleToggleEnabled(config.id, checked)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">關於 WebSocket 轉發</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 轉發功能會將來源 WebSocket 的訊息轉發至目標 WebSocket</li>
            <li>• 支援 AI 影像分析警報轉發，如安全帽偵測、入侵偵測等</li>
            <li>• 啟用後會自動重連，確保訊息不中斷</li>
            <li>• 建議使用 wss:// 安全連線</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebSocketSettings;