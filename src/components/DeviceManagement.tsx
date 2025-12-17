import { useState } from 'react';
import { X, Plus, Trash2, Save, MapPin, Network, Radio, Camera, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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
  mqttBroker: string;
  mqttUsername: string;
  mqttPassword: string;
  cameraChannels: CameraChannel[];
}

interface CameraChannel {
  id: string;
  name: string;
  snapshotUrl: string;
  streamUrl: string;
  username: string;
  password: string;
}

interface DeviceManagementProps {
  onClose: () => void;
  onSave: (devices: DeviceConfig[]) => void;
  initialDevices?: DeviceConfig[];
}

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
  mqttBroker: '',
  mqttUsername: '',
  mqttPassword: '',
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

const DeviceManagement = ({ onClose, onSave, initialDevices = [] }: DeviceManagementProps) => {
  const [devices, setDevices] = useState<DeviceConfig[]>(initialDevices);
  const [editingDevice, setEditingDevice] = useState<DeviceConfig | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  const handleAddDevice = () => {
    const newDevice: DeviceConfig = {
      ...defaultDevice,
      id: `DEV-${Date.now()}`,
    };
    setEditingDevice(newDevice);
  };

  const handleEditDevice = (device: DeviceConfig) => {
    setEditingDevice({ ...device });
  };

  const handleDeleteDevice = (deviceId: string) => {
    setDevices(devices.filter(d => d.id !== deviceId));
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
    onSave(devices);
    toast.success('所有設備設定已儲存');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-card shadow-glow">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-xl">設備管理</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex h-[calc(90vh-120px)]">
          {/* Device List */}
          <div className="w-64 border-r border-border p-4">
            <Button onClick={handleAddDevice} className="w-full mb-4 bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              新增設備
            </Button>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="space-y-2">
                {devices.map(device => (
                  <div
                    key={device.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      editingDevice?.id === device.id
                        ? 'bg-primary/20 border border-primary'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                    onClick={() => handleEditDevice(device)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{device.name || '未命名設備'}</p>
                        <p className="text-xs text-muted-foreground">{device.ipAddress || '未設定 IP'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDevice(device.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {devices.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    尚無設備，點擊上方按鈕新增
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Device Editor */}
          <div className="flex-1 p-4 overflow-y-auto">
            {editingDevice ? (
              <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic" className="gap-1 text-xs">
                      <MapPin className="w-3 h-3" />
                      基本資訊
                    </TabsTrigger>
                    <TabsTrigger value="network" className="gap-1 text-xs">
                      <Network className="w-3 h-3" />
                      網路設定
                    </TabsTrigger>
                    <TabsTrigger value="mqtt" className="gap-1 text-xs">
                      <Radio className="w-3 h-3" />
                      MQTT
                    </TabsTrigger>
                    <TabsTrigger value="camera" className="gap-1 text-xs">
                      <Camera className="w-3 h-3" />
                      攝影機頻道
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>設備 ID</Label>
                        <Input
                          value={editingDevice.id}
                          onChange={(e) => setEditingDevice({ ...editingDevice, id: e.target.value })}
                          className="mt-1"
                          placeholder="CAM-001"
                        />
                      </div>
                      <div>
                        <Label>設備名稱 *</Label>
                        <Input
                          value={editingDevice.name}
                          onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                          className="mt-1"
                          placeholder="工地監控攝影機"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>描述</Label>
                      <Textarea
                        value={editingDevice.description}
                        onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })}
                        className="mt-1"
                        placeholder="輸入設備描述..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>位置名稱</Label>
                      <Input
                        value={editingDevice.location}
                        onChange={(e) => setEditingDevice({ ...editingDevice, location: e.target.value })}
                        className="mt-1"
                        placeholder="台北市信義區"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>緯度 (Latitude)</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={editingDevice.lat}
                          onChange={(e) => setEditingDevice({ ...editingDevice, lat: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                          placeholder="25.0330"
                        />
                      </div>
                      <div>
                        <Label>經度 (Longitude)</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={editingDevice.lng}
                          onChange={(e) => setEditingDevice({ ...editingDevice, lng: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                          placeholder="121.5654"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="network" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>IP 位址 *</Label>
                        <Input
                          value={editingDevice.ipAddress}
                          onChange={(e) => setEditingDevice({ ...editingDevice, ipAddress: e.target.value })}
                          className="mt-1"
                          placeholder="192.168.1.100"
                        />
                      </div>
                      <div>
                        <Label>埠號 (Port)</Label>
                        <Input
                          type="number"
                          value={editingDevice.port}
                          onChange={(e) => setEditingDevice({ ...editingDevice, port: parseInt(e.target.value) || 80 })}
                          className="mt-1"
                          placeholder="80"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>通訊協議</Label>
                      <Select
                        value={editingDevice.protocol}
                        onValueChange={(value: 'mqtt' | 'http' | 'rtsp' | 'onvif') =>
                          setEditingDevice({ ...editingDevice, protocol: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="選擇協議" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="http">HTTP</SelectItem>
                          <SelectItem value="rtsp">RTSP</SelectItem>
                          <SelectItem value="mqtt">MQTT</SelectItem>
                          <SelectItem value="onvif">ONVIF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="mqtt" className="space-y-4 mt-4">
                    <div>
                      <Label>MQTT Broker 位址</Label>
                      <Input
                        value={editingDevice.mqttBroker}
                        onChange={(e) => setEditingDevice({ ...editingDevice, mqttBroker: e.target.value })}
                        className="mt-1"
                        placeholder="mqtt://broker.example.com:1883"
                      />
                    </div>

                    <div>
                      <Label>MQTT Topic</Label>
                      <Input
                        value={editingDevice.mqttTopic}
                        onChange={(e) => setEditingDevice({ ...editingDevice, mqttTopic: e.target.value })}
                        className="mt-1"
                        placeholder="device/camera/status"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>MQTT 使用者名稱</Label>
                        <Input
                          value={editingDevice.mqttUsername}
                          onChange={(e) => setEditingDevice({ ...editingDevice, mqttUsername: e.target.value })}
                          className="mt-1"
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <Label>MQTT 密碼</Label>
                        <Input
                          type="password"
                          value={editingDevice.mqttPassword}
                          onChange={(e) => setEditingDevice({ ...editingDevice, mqttPassword: e.target.value })}
                          className="mt-1"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="camera" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">攝影機頻道</p>
                        <p className="text-sm text-muted-foreground">設定多個攝影機頻道的截圖和串流語法</p>
                      </div>
                      <Button onClick={handleAddChannel} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        新增頻道
                      </Button>
                    </div>

                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {editingDevice.cameraChannels.map((channel, index) => (
                          <div key={channel.id} className="p-4 bg-secondary rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">頻道 {index + 1}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteChannel(channel.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">頻道名稱</Label>
                                <Input
                                  value={channel.name}
                                  onChange={(e) => handleUpdateChannel(channel.id, { name: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                  placeholder="主攝影機"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">頻道 ID</Label>
                                <Input
                                  value={channel.id}
                                  onChange={(e) => handleUpdateChannel(channel.id, { id: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                  placeholder="channel1"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">截圖 URL 語法</Label>
                              <Input
                                value={channel.snapshotUrl}
                                onChange={(e) => handleUpdateChannel(channel.id, { snapshotUrl: e.target.value })}
                                className="mt-1 h-8 text-sm font-mono"
                                placeholder="http://{ip}:{port}/cgi-bin/snapshot.cgi?channel={ch}"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                可用變數: {'{ip}'}, {'{port}'}, {'{ch}'}, {'{user}'}, {'{pass}'}
                              </p>
                            </div>

                            <div>
                              <Label className="text-xs">串流 URL 語法</Label>
                              <Input
                                value={channel.streamUrl}
                                onChange={(e) => handleUpdateChannel(channel.id, { streamUrl: e.target.value })}
                                className="mt-1 h-8 text-sm font-mono"
                                placeholder="rtsp://{user}:{pass}@{ip}:{port}/stream{ch}"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">認證帳號</Label>
                                <Input
                                  value={channel.username}
                                  onChange={(e) => handleUpdateChannel(channel.id, { username: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                  placeholder="admin"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">認證密碼</Label>
                                <Input
                                  type="password"
                                  value={channel.password}
                                  onChange={(e) => handleUpdateChannel(channel.id, { password: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                  placeholder="••••••••"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {editingDevice.cameraChannels.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>尚未設定攝影機頻道</p>
                            <p className="text-sm">點擊「新增頻道」開始設定</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium text-foreground mb-2">常用截圖語法範例：</p>
                      <div className="space-y-1 text-xs text-muted-foreground font-mono">
                        <p>• Hikvision: http://{'{ip}'}/ISAPI/Streaming/channels/{'{ch}'}/picture</p>
                        <p>• Dahua: http://{'{ip}'}/cgi-bin/snapshot.cgi?channel={'{ch}'}</p>
                        <p>• ONVIF: http://{'{ip}'}/onvif-http/snapshot?Profile_1</p>
                        <p>• RTSP: rtsp://{'{user}'}:{'{pass}'}@{'{ip}'}:{'{port}'}/Streaming/Channels/{'{ch}'}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setEditingDevice(null)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSaveDevice}
                    className="flex-1 bg-gradient-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    儲存設備
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>選擇設備進行編輯</p>
                  <p className="text-sm">或新增一個新設備</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            關閉
          </Button>
          <Button onClick={handleSaveAll} className="bg-gradient-primary">
            <Save className="w-4 h-4 mr-2" />
            儲存所有變更
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DeviceManagement;
