import { useState, useEffect } from 'react';
import { X, Radio, Wifi, WifiOff, Bell, Trash2, Settings2, Play, Pause, AlertTriangle, Plus, MapPin, Network, Camera, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMqtt, MqttConfig, DeviceStatusUpdate } from '@/hooks/useMqtt';
import { toast } from 'sonner';

// Device configuration types
interface CameraChannel {
  id: string;
  name: string;
  snapshotUrl: string;
  streamUrl: string;
  username: string;
  password: string;
}

interface DeviceConfig {
  id: string;
  name: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  ipAddress: string;
  port: number;
  protocol: 'mqtt' | 'http' | 'rtsp' | 'onvif';
  mqttTopic: string;
  cameraChannels: CameraChannel[];
}

interface MqttConnectionProps {
  onClose: () => void;
  onDeviceUpdate?: (update: DeviceStatusUpdate) => void;
  onDevicesSave?: (devices: DeviceConfig[]) => void;
}

const defaultConfig: MqttConfig = {
  brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
  username: '',
  password: '',
  topics: ['device/+/status', 'device/+/alert'],
};

const defaultDevice: DeviceConfig = {
  id: '',
  name: '',
  description: '',
  location: '',
  lat: 25.033,
  lng: 121.565,
  ipAddress: '',
  port: 80,
  protocol: 'http',
  mqttTopic: '',
  cameraChannels: [],
};

const defaultChannel: CameraChannel = {
  id: '',
  name: '',
  snapshotUrl: '',
  streamUrl: '',
  username: '',
  password: '',
};

const MqttConnection = ({ onClose, onDeviceUpdate, onDevicesSave }: MqttConnectionProps) => {
  const [config, setConfig] = useState<MqttConfig>(defaultConfig);
  const [newTopic, setNewTopic] = useState('');
  const [autoReconnect, setAutoReconnect] = useState(true);
  
  // Device management state
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [editingDevice, setEditingDevice] = useState<DeviceConfig | null>(null);
  const [deviceTab, setDeviceTab] = useState('basic');
  
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
      setConfig({ ...config, topics: [...config.topics, newTopic] });
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setConfig({ ...config, topics: config.topics.filter((t) => t !== topic) });
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
      case 'battery_low': return '🔋';
      case 'signal_weak': return '📶';
      case 'offline': return '🔴';
      case 'motion_detected': return '🚨';
      case 'error': return '❌';
      default: return '⚠️';
    }
  };

  // Device management functions
  const handleAddDevice = () => {
    setEditingDevice({ ...defaultDevice, id: `DEV-${Date.now()}` });
    setDeviceTab('basic');
  };

  const handleEditDevice = (device: DeviceConfig) => {
    setEditingDevice({ ...device });
    setDeviceTab('basic');
  };

  const handleDeleteDevice = (deviceId: string) => {
    setDevices(devices.filter(d => d.id !== deviceId));
    if (editingDevice?.id === deviceId) setEditingDevice(null);
    toast.success('設備已刪除');
  };

  const handleSaveDevice = () => {
    if (!editingDevice) return;
    if (!editingDevice.name || !editingDevice.ipAddress) {
      toast.error('請填寫設備名稱和 IP 位址');
      return;
    }

    const existingIndex = devices.findIndex(d => d.id === editingDevice.id);
    if (existingIndex >= 0) {
      const updated = [...devices];
      updated[existingIndex] = editingDevice;
      setDevices(updated);
    } else {
      setDevices([...devices, editingDevice]);
    }
    setEditingDevice(null);
    toast.success('設備已儲存');
  };

  const handleAddChannel = () => {
    if (!editingDevice) return;
    const newChannel: CameraChannel = {
      ...defaultChannel,
      id: `CH-${Date.now()}`,
      name: `頻道 ${editingDevice.cameraChannels.length + 1}`,
    };
    setEditingDevice({
      ...editingDevice,
      cameraChannels: [...editingDevice.cameraChannels, newChannel],
    });
  };

  const handleUpdateChannel = (channelId: string, updates: Partial<CameraChannel>) => {
    if (!editingDevice) return;
    setEditingDevice({
      ...editingDevice,
      cameraChannels: editingDevice.cameraChannels.map(ch =>
        ch.id === channelId ? { ...ch, ...updates } : ch
      ),
    });
  };

  const handleDeleteChannel = (channelId: string) => {
    if (!editingDevice) return;
    setEditingDevice({
      ...editingDevice,
      cameraChannels: editingDevice.cameraChannels.filter(ch => ch.id !== channelId),
    });
  };

  const handleSaveAll = () => {
    onDevicesSave?.(devices);
    toast.success('所有設定已儲存');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden bg-card shadow-glow">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-2 sm:py-3 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${isConnected ? 'bg-success' : 'bg-gradient-primary'}`}>
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-xl truncate">MQTT 與設備管理</CardTitle>
              <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                {isConnected ? (
                  <Badge variant="default" className="bg-success text-white text-[10px] sm:text-xs">
                    <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />已連線
                  </Badge>
                ) : isConnecting ? (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs"><span className="animate-pulse">連線中...</span></Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] sm:text-xs"><WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />未連線</Badge>
                )}
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] sm:text-xs"><Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />{alerts.length}</Badge>
                )}
                <Badge variant="secondary" className="text-[10px] sm:text-xs hidden xs:inline-flex">{devices.length} 設備</Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="connection" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2 sm:px-4 pt-1 sm:pt-2 overflow-x-auto">
              <TabsTrigger value="connection" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                <Settings2 className="w-3 h-3" />
                <span className="hidden xs:inline">連線</span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                <Camera className="w-3 h-3" />
                <span className="hidden xs:inline">設備</span>
                {devices.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{devices.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                <Radio className="w-3 h-3" />
                <span className="hidden xs:inline">訊息</span>
                {messages.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{messages.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden xs:inline">警報</span>
                {alerts.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{alerts.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <div className="p-3 sm:p-4 max-h-[calc(95vh-200px)] sm:max-h-[calc(90vh-180px)] overflow-y-auto">
              {/* Connection Tab */}
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
                  <p className="text-xs text-muted-foreground mt-1">使用 WebSocket 協議 (wss:// 或 ws://)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>使用者名稱</Label>
                    <Input value={config.username} onChange={(e) => setConfig({ ...config, username: e.target.value })} placeholder="(選填)" className="mt-1" disabled={isConnected} />
                  </div>
                  <div>
                    <Label>密碼</Label>
                    <Input type="password" value={config.password} onChange={(e) => setConfig({ ...config, password: e.target.value })} placeholder="(選填)" className="mt-1" disabled={isConnected} />
                  </div>
                </div>

                <div>
                  <Label>訂閱主題</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="device/+/status" className="font-mono text-sm" onKeyPress={(e) => e.key === 'Enter' && addTopic()} disabled={isConnected} />
                    <Button onClick={addTopic} variant="secondary" disabled={isConnected}>新增</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className={`font-mono text-xs ${!isConnected ? 'cursor-pointer hover:bg-destructive hover:text-destructive-foreground' : ''}`} onClick={() => !isConnected && removeTopic(topic)}>
                        {topic} {!isConnected && '×'}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium text-sm">自動重連</p>
                    <p className="text-xs text-muted-foreground">連線中斷時自動嘗試重新連線</p>
                  </div>
                  <Switch checked={autoReconnect} onCheckedChange={setAutoReconnect} />
                </div>

                <Button onClick={handleConnect} className={`w-full ${isConnected ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-primary'}`} disabled={isConnecting}>
                  {isConnecting ? <><span className="animate-spin mr-2">⏳</span>連線中...</> : isConnected ? <><Pause className="w-4 h-4 mr-2" />斷開連線</> : <><Play className="w-4 h-4 mr-2" />建立連線</>}
                </Button>
              </TabsContent>

              {/* Devices Tab */}
              <TabsContent value="devices" className="mt-0">
                <div className="flex gap-4 h-[400px]">
                  {/* Device List */}
                  <div className="w-56 border-r border-border pr-4">
                    <Button onClick={handleAddDevice} className="w-full mb-3 bg-gradient-primary" size="sm">
                      <Plus className="w-4 h-4 mr-1" />新增設備
                    </Button>
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2">
                        {devices.map(device => (
                          <div
                            key={device.id}
                            className={`p-2 rounded-lg cursor-pointer transition-colors text-sm ${editingDevice?.id === device.id ? 'bg-primary/20 border border-primary' : 'bg-secondary hover:bg-secondary/80'}`}
                            onClick={() => handleEditDevice(device)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="truncate">
                                <p className="font-medium text-foreground truncate">{device.name || '未命名'}</p>
                                <p className="text-xs text-muted-foreground truncate">{device.ipAddress || '未設定 IP'}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id); }}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {devices.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">尚無設備</p>}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Device Editor */}
                  <div className="flex-1 overflow-y-auto">
                    {editingDevice ? (
                      <div className="space-y-3">
                        <Tabs value={deviceTab} onValueChange={setDeviceTab}>
                          <TabsList className="grid w-full grid-cols-3 h-8">
                            <TabsTrigger value="basic" className="text-xs gap-1"><MapPin className="w-3 h-3" />基本</TabsTrigger>
                            <TabsTrigger value="network" className="text-xs gap-1"><Network className="w-3 h-3" />網路</TabsTrigger>
                            <TabsTrigger value="camera" className="text-xs gap-1"><Camera className="w-3 h-3" />攝影機</TabsTrigger>
                          </TabsList>

                          <TabsContent value="basic" className="space-y-3 mt-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">設備 ID</Label>
                                <Input value={editingDevice.id} onChange={(e) => setEditingDevice({ ...editingDevice, id: e.target.value })} className="mt-1 h-8 text-sm" placeholder="CAM-001" />
                              </div>
                              <div>
                                <Label className="text-xs">設備名稱 *</Label>
                                <Input value={editingDevice.name} onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })} className="mt-1 h-8 text-sm" placeholder="工地監控攝影機" />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">描述</Label>
                              <Textarea value={editingDevice.description} onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })} className="mt-1 text-sm" placeholder="輸入設備描述..." rows={2} />
                            </div>
                            <div>
                              <Label className="text-xs">位置名稱</Label>
                              <Input value={editingDevice.location} onChange={(e) => setEditingDevice({ ...editingDevice, location: e.target.value })} className="mt-1 h-8 text-sm" placeholder="台北市信義區" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">緯度</Label>
                                <Input type="number" step="0.0001" value={editingDevice.lat} onChange={(e) => setEditingDevice({ ...editingDevice, lat: parseFloat(e.target.value) || 0 })} className="mt-1 h-8 text-sm" />
                              </div>
                              <div>
                                <Label className="text-xs">經度</Label>
                                <Input type="number" step="0.0001" value={editingDevice.lng} onChange={(e) => setEditingDevice({ ...editingDevice, lng: parseFloat(e.target.value) || 0 })} className="mt-1 h-8 text-sm" />
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="network" className="space-y-3 mt-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">IP 位址 *</Label>
                                <Input value={editingDevice.ipAddress} onChange={(e) => setEditingDevice({ ...editingDevice, ipAddress: e.target.value })} className="mt-1 h-8 text-sm" placeholder="192.168.1.100" />
                              </div>
                              <div>
                                <Label className="text-xs">埠號</Label>
                                <Input type="number" value={editingDevice.port} onChange={(e) => setEditingDevice({ ...editingDevice, port: parseInt(e.target.value) || 80 })} className="mt-1 h-8 text-sm" />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">通訊協議</Label>
                              <Select value={editingDevice.protocol} onValueChange={(value: 'mqtt' | 'http' | 'rtsp' | 'onvif') => setEditingDevice({ ...editingDevice, protocol: value })}>
                                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="http">HTTP</SelectItem>
                                  <SelectItem value="rtsp">RTSP</SelectItem>
                                  <SelectItem value="mqtt">MQTT</SelectItem>
                                  <SelectItem value="onvif">ONVIF</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">MQTT Topic</Label>
                              <Input value={editingDevice.mqttTopic} onChange={(e) => setEditingDevice({ ...editingDevice, mqttTopic: e.target.value })} className="mt-1 h-8 text-sm font-mono" placeholder="device/{id}/status" />
                            </div>
                          </TabsContent>

                          <TabsContent value="camera" className="space-y-3 mt-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">攝影機頻道</Label>
                              <Button onClick={handleAddChannel} variant="outline" size="sm" className="h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" />新增頻道
                              </Button>
                            </div>
                            <ScrollArea className="h-[200px]">
                              <div className="space-y-3">
                                {editingDevice.cameraChannels.map((channel, index) => (
                                  <div key={channel.id} className="p-3 bg-secondary rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-xs">頻道 {index + 1}</span>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteChannel(channel.id)}>
                                        <Trash2 className="w-3 h-3 text-destructive" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input value={channel.name} onChange={(e) => handleUpdateChannel(channel.id, { name: e.target.value })} className="h-7 text-xs" placeholder="頻道名稱" />
                                      <Input value={channel.id} onChange={(e) => handleUpdateChannel(channel.id, { id: e.target.value })} className="h-7 text-xs" placeholder="頻道 ID" />
                                    </div>
                                    <Input value={channel.snapshotUrl} onChange={(e) => handleUpdateChannel(channel.id, { snapshotUrl: e.target.value })} className="h-7 text-xs font-mono" placeholder="截圖 URL: http://{ip}/snapshot?ch={ch}" />
                                    <Input value={channel.streamUrl} onChange={(e) => handleUpdateChannel(channel.id, { streamUrl: e.target.value })} className="h-7 text-xs font-mono" placeholder="串流 URL: rtsp://{ip}:{port}/stream{ch}" />
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input value={channel.username} onChange={(e) => handleUpdateChannel(channel.id, { username: e.target.value })} className="h-7 text-xs" placeholder="帳號" />
                                      <Input type="password" value={channel.password} onChange={(e) => handleUpdateChannel(channel.id, { password: e.target.value })} className="h-7 text-xs" placeholder="密碼" />
                                    </div>
                                  </div>
                                ))}
                                {editingDevice.cameraChannels.length === 0 && (
                                  <div className="text-center py-6 text-muted-foreground">
                                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">尚未設定攝影機頻道</p>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                        </Tabs>

                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button variant="outline" onClick={() => setEditingDevice(null)} className="flex-1 h-8 text-xs">取消</Button>
                          <Button onClick={handleSaveDevice} className="flex-1 h-8 text-xs bg-gradient-primary"><Save className="w-3 h-3 mr-1" />儲存設備</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">選擇設備進行編輯</p>
                          <p className="text-xs">或新增一個新設備</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Messages Tab */}
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
                        <div key={index} className="p-3 bg-secondary rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="font-mono">{msg.deviceId}</Badge>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className={msg.status === 'online' ? 'text-success' : 'text-destructive'}>● {msg.status === 'online' ? '在線' : '離線'}</span>
                            {msg.battery !== undefined && <span>🔋 {msg.battery}%</span>}
                            {msg.signal !== undefined && <span>📶 {msg.signal}%</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="mt-0">
                <div className="flex justify-end mb-2">
                  <Button variant="outline" size="sm" onClick={clearAlerts} disabled={alerts.length === 0}>
                    <Trash2 className="w-4 h-4 mr-1" />清除全部
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
                        <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getAlertIcon(alert.alertType)}</span>
                              <Badge variant="destructive" className="font-mono">{alert.deviceId}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(alert.timestamp)}</span>
                          </div>
                          <p className="text-sm text-foreground">{alert.alertMessage || `警報類型: ${alert.alertType}`}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>

        <div className="p-3 border-t border-border flex justify-end">
          <Button onClick={handleSaveAll} className="bg-gradient-primary" size="sm">
            <Save className="w-4 h-4 mr-2" />儲存所有設定
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MqttConnection;
