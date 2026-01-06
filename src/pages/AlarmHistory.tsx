import { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Download, ShieldAlert, Eye, Search, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Json } from '@/integrations/supabase/types';
import { ALERT_TYPE_CONFIG, getAlertTypeIcon, getAlertTypeLabel } from '@/lib/alertTypeIcons';

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-success/20 text-success border-0">已發送</Badge>;
      case 'failed':
        return <Badge variant="destructive">失敗</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning border-0">待處理</Badge>;
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive">嚴重</Badge>;
      case 'warning':
        return <Badge className="bg-warning/20 text-warning border-0">警告</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
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
        getAlertTypeLabel(alert.alert_type).toLowerCase().includes(query)
      );
    }
    return true;
  });

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
        getAlertTypeLabel(alert.alert_type),
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">警報歷史紀錄</h1>
          <p className="text-sm text-muted-foreground">查看所有警報事件與 AI 偵測記錄</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            匯出
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <div>
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">通知總計</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <div>
                <p className="text-lg font-bold text-success">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">已發送</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/10 to-transparent border-destructive/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-lg font-bold text-destructive">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">失敗</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-transparent border-warning/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <div>
                <p className="text-lg font-bold text-warning">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">待處理</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-lg font-bold text-purple-500">{stats.wsTotal}</p>
                <p className="text-xs text-muted-foreground">AI 偵測</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-lg font-bold text-destructive">{stats.wsError}</p>
                <p className="text-xs text-muted-foreground">嚴重</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <div>
                <p className="text-lg font-bold text-warning">{stats.wsWarning}</p>
                <p className="text-xs text-muted-foreground">警告</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-success" />
              <div>
                <p className="text-lg font-bold text-success">{stats.wsAcknowledged}</p>
                <p className="text-xs text-muted-foreground">已確認</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              通知記錄
              <Badge variant="secondary" className="ml-1">{filteredLogs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ai-detection" className="gap-2">
              <ShieldAlert className="w-4 h-4" />
              AI 偵測
              <Badge variant="secondary" className="ml-1">{filteredWsAlerts.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜尋..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            
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
              </>
            ) : (
              <>
                <Select value={filterAlertType} onValueChange={setFilterAlertType}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder="類型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部類型</SelectItem>
                    {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue placeholder="嚴重程度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="error">嚴重</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-480px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">時間</TableHead>
                      <TableHead className="w-[80px]">通道</TableHead>
                      <TableHead>設備</TableHead>
                      <TableHead>訊息</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          無符合條件的記錄
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(log.created_at), 'MM/dd HH:mm:ss')}
                            </div>
                          </TableCell>
                          <TableCell>{getChannelBadge(log.channel)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{log.device_name || '-'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{log.device_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-[300px]">{log.message || '-'}</p>
                            {log.error_message && (
                              <p className="text-xs text-destructive truncate">{log.error_message}</p>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Detection Tab */}
        <TabsContent value="ai-detection" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-480px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">時間</TableHead>
                      <TableHead className="w-[120px]">類型</TableHead>
                      <TableHead className="w-[80px]">嚴重程度</TableHead>
                      <TableHead>設備</TableHead>
                      <TableHead>訊息</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredWsAlerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          無符合條件的記錄
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWsAlerts.map(alert => (
                        <TableRow key={alert.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(alert.created_at), 'MM/dd HH:mm:ss')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getAlertTypeIcon(alert.alert_type)}
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                {getAlertTypeLabel(alert.alert_type)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{alert.device_name || '-'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{alert.device_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-[300px]">{alert.message}</p>
                          </TableCell>
                          <TableCell>
                            {alert.acknowledged ? (
                              <Badge className="bg-success/20 text-success border-0">已確認</Badge>
                            ) : (
                              <Badge variant="outline" className="text-warning border-warning/30">待確認</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlarmHistory;
