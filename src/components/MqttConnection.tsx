import { useState, useEffect } from 'react';
import { X, Radio, Wifi, WifiOff, Bell, Trash2, Settings2, Play, Pause, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMqtt, MqttConfig, DeviceStatusUpdate } from '@/hooks/useMqtt';
import { toast } from 'sonner';

interface MqttConnectionProps {
  onClose: () => void;
  onDeviceUpdate?: (update: DeviceStatusUpdate) => void;
}

const defaultConfig: MqttConfig = {
  brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
  username: '',
  password: '',
  topics: ['device/+/status', 'device/+/alert'],
};

const MqttConnection = ({ onClose, onDeviceUpdate }: MqttConnectionProps) => {
  const [config, setConfig] = useState<MqttConfig>(defaultConfig);
  const [newTopic, setNewTopic] = useState('');
  const [autoReconnect, setAutoReconnect] = useState(true);
  
  const {
    isConnected,
    isConnecting,
    lastMessage,
    messages,
    alerts,
    connect,
    disconnect,
    clearAlerts,
  } = useMqtt();

  // Notify parent of device updates
  useEffect(() => {
    if (lastMessage && onDeviceUpdate) {
      onDeviceUpdate(lastMessage);
    }
  }, [lastMessage, onDeviceUpdate]);

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect(config);
    }
  };

  const addTopic = () => {
    if (newTopic && !config.topics.includes(newTopic)) {
      setConfig({
        ...config,
        topics: [...config.topics, newTopic],
      });
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setConfig({
      ...config,
      topics: config.topics.filter((t) => t !== topic),
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getAlertIcon = (alertType?: string) => {
    switch (alertType) {
      case 'battery_low':
        return '🔋';
      case 'signal_weak':
        return '📶';
      case 'offline':
        return '🔴';
      case 'motion_detected':
        return '🚨';
      case 'error':
        return '❌';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-card shadow-glow">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isConnected ? 'bg-success' : 'bg-gradient-primary'
            }`}>
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">MQTT 連線管理</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {isConnected ? (
                  <Badge variant="default" className="bg-success text-white">
                    <Wifi className="w-3 h-3 mr-1" />
                    已連線
                  </Badge>
                ) : isConnecting ? (
                  <Badge variant="secondary">
                    <span className="animate-pulse">連線中...</span>
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <WifiOff className="w-3 h-3 mr-1" />
                    未連線
                  </Badge>
                )}
                {alerts.length > 0 && (
                  <Badge variant="destructive">
                    <Bell className="w-3 h-3 mr-1" />
                    {alerts.length} 則警報
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="connection" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 pt-2">
              <TabsTrigger value="connection" className="gap-2">
                <Settings2 className="w-4 h-4" />
                連線設定
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2">
                <Radio className="w-4 h-4" />
                訊息記錄
                {messages.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {messages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                警報
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {alerts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="p-4">
              <TabsContent value="connection" className="mt-0 space-y-4">
                <div>
                  <Label>MQTT Broker URL</Label>
                  <Input
                    value={config.brokerUrl}
                    onChange={(e) => setConfig({ ...config, brokerUrl: e.target.value })}
                    placeholder="wss://broker.example.com:8084/mqtt"
                    className="mt-1 font-mono text-sm"
                    disabled={isConnected}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    使用 WebSocket 協議 (wss:// 或 ws://)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>使用者名稱</Label>
                    <Input
                      value={config.username}
                      onChange={(e) => setConfig({ ...config, username: e.target.value })}
                      placeholder="(選填)"
                      className="mt-1"
                      disabled={isConnected}
                    />
                  </div>
                  <div>
                    <Label>密碼</Label>
                    <Input
                      type="password"
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      placeholder="(選填)"
                      className="mt-1"
                      disabled={isConnected}
                    />
                  </div>
                </div>

                <div>
                  <Label>訂閱主題 (Topics)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder="device/+/status"
                      className="font-mono text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                      disabled={isConnected}
                    />
                    <Button onClick={addTopic} variant="secondary" disabled={isConnected}>
                      新增
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.topics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className={`font-mono text-xs ${!isConnected ? 'cursor-pointer hover:bg-destructive hover:text-destructive-foreground' : ''}`}
                        onClick={() => !isConnected && removeTopic(topic)}
                      >
                        {topic} {!isConnected && '×'}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    使用 + 作為單層通配符，# 作為多層通配符
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium text-sm">自動重連</p>
                    <p className="text-xs text-muted-foreground">連線中斷時自動嘗試重新連線</p>
                  </div>
                  <Switch
                    checked={autoReconnect}
                    onCheckedChange={setAutoReconnect}
                  />
                </div>

                <Button
                  onClick={handleConnect}
                  className={`w-full ${isConnected ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-primary'}`}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      連線中...
                    </>
                  ) : isConnected ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      斷開連線
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      建立連線
                    </>
                  )}
                </Button>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-2">預期的訊息格式 (JSON):</p>
                  <pre className="text-xs text-muted-foreground font-mono overflow-x-auto">
{`{
  "deviceId": "CAM-001",
  "status": "online",
  "battery": 85,
  "signal": 92,
  "alertType": "battery_low",
  "alertMessage": "電量低於 30%"
}`}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="messages" className="mt-0">
                <ScrollArea className="h-[400px]">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Radio className="w-12 h-12 mb-2 opacity-50" />
                      <p>尚無訊息</p>
                      <p className="text-sm">連線後將顯示接收到的訊息</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className="p-3 bg-secondary rounded-lg text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="font-mono">
                              {msg.deviceId}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className={msg.status === 'online' ? 'text-success' : 'text-destructive'}>
                              ● {msg.status === 'online' ? '在線' : '離線'}
                            </span>
                            {msg.battery !== undefined && (
                              <span>🔋 {msg.battery}%</span>
                            )}
                            {msg.signal !== undefined && (
                              <span>📶 {msg.signal}%</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="alerts" className="mt-0">
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAlerts}
                    disabled={alerts.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    清除全部
                  </Button>
                </div>
                <ScrollArea className="h-[360px]">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Bell className="w-12 h-12 mb-2 opacity-50" />
                      <p>沒有警報</p>
                      <p className="text-sm">警報訊息將顯示在這裡</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map((alert, index) => (
                        <div
                          key={index}
                          className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getAlertIcon(alert.alertType)}</span>
                              <Badge variant="destructive" className="font-mono">
                                {alert.deviceId}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(alert.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">
                            {alert.alertMessage || `警報類型: ${alert.alertType}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MqttConnection;
