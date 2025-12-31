import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Filter, Download, ShieldAlert, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

interface NotificationLog {
  id: string;
  channel: string;
  device_id: string | null;
  device_name: string | null;
  message: string | null;
  screenshot_url: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
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

const ALERT_TYPE_LABELS: Record<string, string> = {
  'no_helmet': '未戴安全帽',
  'no_vest': '未穿反光背心',
  'intrusion': '入侵偵測',
  'fire_smoke': '煙霧偵測',
  'fall_detection': '跌倒偵測',
};

const AlarmHistory = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [wsAlerts, setWsAlerts] = useState<WebSocketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAlertType, setFilterAlertType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('notifications');

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const notifChannel = supabase
      .channel('notification-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_logs' }, () => {
        fetchData();
      })
      .subscribe();

    const wsChannel = supabase
      .channel('websocket-alerts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'websocket_alerts' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(wsChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, wsAlertsRes] = await Promise.all([
        supabase
          .from('notification_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('websocket_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (logsRes.data) setLogs(logsRes.data);
      if (wsAlertsRes.data) setWsAlerts(wsAlertsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-success/20 text-success border-success/30">已發送</Badge>;
      case 'failed':
        return <Badge variant="destructive">失敗</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">待處理</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'line':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">LINE</Badge>;
      case 'email':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Email</Badge>;
      case 'sms':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">SMS</Badge>;
      default:
        return <Badge variant="outline">{channel}</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterChannel !== 'all' && log.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.device_name?.toLowerCase().includes(query) ||
        log.device_id?.toLowerCase().includes(query) ||
        log.message?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredWsAlerts = wsAlerts.filter(alert => {
    if (filterAlertType !== 'all' && alert.alert_type !== filterAlertType) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        alert.device_name?.toLowerCase().includes(query) ||
        alert.device_id?.toLowerCase().includes(query) ||
        alert.message?.toLowerCase().includes(query) ||
        ALERT_TYPE_LABELS[alert.alert_type]?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive">嚴重</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">警告</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getAlertTypeBadge = (alertType: string) => {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
        {ALERT_TYPE_LABELS[alertType] || alertType}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (activeTab === 'notifications') {
      const headers = ['時間', '通道', '設備ID', '設備名稱', '訊息', '狀態', '錯誤訊息'];
      const rows = filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.channel,
        log.device_id || '',
        log.device_name || '',
        log.message || '',
        log.status,
        log.error_message || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notification-history-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['時間', '類型', '嚴重程度', '設備ID', '設備名稱', '訊息', '已確認'];
      const rows = filteredWsAlerts.map(alert => [
        format(new Date(alert.created_at), 'yyyy-MM-dd HH:mm:ss'),
        ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type,
        alert.severity,
        alert.device_id || '',
        alert.device_name || '',
        alert.message,
        alert.acknowledged ? '是' : '否'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-detection-history-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length,
    wsTotal: wsAlerts.length,
    wsError: wsAlerts.filter(a => a.severity === 'error').length,
    wsWarning: wsAlerts.filter(a => a.severity === 'warning').length,
    wsAcknowledged: wsAlerts.filter(a => a.acknowledged).length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-destructive to-orange-500 flex items-center justify-center shadow-glow">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">警報歷史紀錄</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">查看所有警報事件與AI偵測記錄</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">重新整理</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">匯出</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">通知總計</p>
                <p className="text-xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">已發送</p>
                <p className="text-xl font-bold text-success">{stats.sent}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">失敗</p>
                <p className="text-xl font-bold text-destructive">{stats.failed}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">待處理</p>
                <p className="text-xl font-bold text-warning">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AI偵測</p>
                <p className="text-xl font-bold text-purple-500">{stats.wsTotal}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">嚴重</p>
                <p className="text-xl font-bold text-red-500">{stats.wsError}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">警告</p>
                <p className="text-xl font-bold text-orange-500">{stats.wsWarning}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">已確認</p>
                <p className="text-xl font-bold text-green-500">{stats.wsAcknowledged}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-card">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
              <TabsList className="bg-secondary">
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="w-4 h-4" />
                  通知記錄
                </TabsTrigger>
                <TabsTrigger value="ai-detection" className="gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  AI偵測
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 ml-auto">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="搜尋..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-60 h-9"
              />
              
              {activeTab === 'notifications' ? (
                <>
                  <Select value={filterChannel} onValueChange={setFilterChannel}>
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue placeholder="通道" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部通道</SelectItem>
                      <SelectItem value="line">LINE</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue placeholder="狀態" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部狀態</SelectItem>
                      <SelectItem value="sent">已發送</SelectItem>
                      <SelectItem value="failed">失敗</SelectItem>
                      <SelectItem value="pending">待處理</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary">
                    {filteredLogs.length} 筆紀錄
                  </Badge>
                </>
              ) : (
                <>
                  <Select value={filterAlertType} onValueChange={setFilterAlertType}>
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue placeholder="類型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部類型</SelectItem>
                      <SelectItem value="no_helmet">未戴安全帽</SelectItem>
                      <SelectItem value="no_vest">未穿反光背心</SelectItem>
                      <SelectItem value="intrusion">入侵偵測</SelectItem>
                      <SelectItem value="fire_smoke">煙霧偵測</SelectItem>
                      <SelectItem value="fall_detection">跌倒偵測</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue placeholder="嚴重程度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部程度</SelectItem>
                      <SelectItem value="error">嚴重</SelectItem>
                      <SelectItem value="warning">警告</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary">
                    {filteredWsAlerts.length} 筆紀錄
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Logs List */}
          <div className="flex-1 px-4 sm:px-6 py-4 overflow-hidden">
            <div className="max-w-7xl mx-auto h-full">
              <TabsContent value="notifications" className="h-full m-0">
                <ScrollArea className="h-full">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium text-foreground">暫無通知紀錄</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        當感測器數據超過警報閾值時，通知紀錄將會顯示在這裡
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLogs.map((log) => (
                        <Card key={log.id} className="p-4 bg-card border-border hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            <div className="shrink-0 mt-1">
                              {getStatusIcon(log.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {getChannelBadge(log.channel)}
                                {getStatusBadge(log.status)}
                                {log.device_name && (
                                  <span className="text-sm font-medium text-foreground">
                                    {log.device_name}
                                  </span>
                                )}
                              </div>
                              {log.message && (
                                <p className="text-sm text-muted-foreground mb-2 whitespace-pre-line">
                                  {log.message}
                                </p>
                              )}
                              {log.error_message && (
                                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded mb-2">
                                  錯誤: {log.error_message}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                                </span>
                                {log.device_id && (
                                  <span>設備 ID: {log.device_id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ai-detection" className="h-full m-0">
                <ScrollArea className="h-full">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredWsAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium text-foreground">暫無AI偵測紀錄</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        當AI偵測到異常事件時，紀錄將會顯示在這裡
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredWsAlerts.map((alert) => (
                        <Card key={alert.id} className={`p-4 bg-card border-border hover:shadow-md transition-shadow ${alert.acknowledged ? 'opacity-60' : ''}`}>
                          <div className="flex items-start gap-4">
                            <div className="shrink-0 mt-1">
                              <AlertTriangle className={`w-4 h-4 ${alert.severity === 'error' ? 'text-destructive' : 'text-warning'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {getAlertTypeBadge(alert.alert_type)}
                                {getSeverityBadge(alert.severity)}
                                {alert.acknowledged && (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">已確認</Badge>
                                )}
                                {alert.device_name && (
                                  <span className="text-sm font-medium text-foreground">
                                    {alert.device_name}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {alert.message}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  {format(new Date(alert.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                                </span>
                                {alert.device_id && (
                                  <span>設備 ID: {alert.device_id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AlarmHistory;