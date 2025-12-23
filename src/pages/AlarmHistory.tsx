import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Filter, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

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

const AlarmHistory = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notification-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
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

  const exportToCSV = () => {
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
    link.download = `alarm-history-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length,
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
              <p className="text-xs sm:text-sm text-muted-foreground">查看所有警報事件與通知狀態</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
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
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">總計</p>
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
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">篩選:</span>
          </div>
          <Input
            placeholder="搜尋設備..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40 sm:w-60 h-9"
          />
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
          <Badge variant="secondary" className="ml-auto">
            {filteredLogs.length} 筆紀錄
          </Badge>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 px-4 sm:px-6 py-4 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">暫無警報紀錄</p>
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
        </div>
      </div>
    </div>
  );
};

export default AlarmHistory;