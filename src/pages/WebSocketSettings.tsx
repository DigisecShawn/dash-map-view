import { useState, useEffect } from 'react';
import { ArrowLeft, Wifi, Plus, Trash2, Save, RefreshCw, Power, PowerOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WebSocketConfig {
  id: string;
  name: string;
  source_url: string;
  target_url: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  last_message_at: string | null;
}

const WebSocketSettings = () => {
  const [configs, setConfigs] = useState<WebSocketConfig[]>([
    {
      id: '1',
      name: 'MQTT to Dashboard',
      source_url: 'wss://mqtt.example.com/devices',
      target_url: 'wss://dashboard.example.com/realtime',
      enabled: true,
      status: 'connected',
      last_message_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Sensor Data Relay',
      source_url: 'wss://sensors.example.com/stream',
      target_url: 'wss://api.example.com/ingest',
      enabled: false,
      status: 'disconnected',
      last_message_at: null,
    },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    source_url: '',
    target_url: '',
  });

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
          <p className="text-muted-foreground">設定 WebSocket 訊息轉發規則</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新增轉發
        </Button>
      </div>

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
      <div className="space-y-4">
        {configs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wifi className="w-12 h-12 mb-4 opacity-50" />
              <p>尚無轉發設定</p>
              <p className="text-sm">點擊「新增轉發」開始設定</p>
            </CardContent>
          </Card>
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

      {/* Info card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">關於 WebSocket 轉發</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 轉發功能會將來源 WebSocket 的訊息轉發至目標 WebSocket</li>
            <li>• 支援雙向轉發，可用於 MQTT、感測器數據等即時通訊</li>
            <li>• 啟用後會自動重連，確保訊息不中斷</li>
            <li>• 建議使用 wss:// 安全連線</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebSocketSettings;
