import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Video, Wifi, WifiOff, Settings, Camera, Cctv, Webcam, ScanEye, LucideIcon, Bell, Thermometer, Droplets, Volume2, Wind } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_id: string;
  name: string;
  lat: number;
  lng: number;
  battery: number;
  signal_strength: number;
  status: string;
  location: string;
  mqtt_topic: string;
}

interface CameraItem {
  id: string;
  device_id: string;
  name: string;
  stream_url: string;
  is_active: boolean;
  icon_type: string;
}

interface AlarmThreshold {
  id?: string;
  device_id: string;
  metric_type: string;
  threshold_value: number;
  enabled: boolean;
}

interface DeviceManagementProps {
  onClose: () => void;
}

// Alarm metric types configuration
const ALARM_METRICS: { value: string; label: string; unit: string; Icon: LucideIcon; defaultThreshold: number }[] = [
  { value: 'pm25', label: 'PM2.5', unit: 'µg/m³', Icon: Wind, defaultThreshold: 35 },
  { value: 'pm10', label: 'PM10', unit: 'µg/m³', Icon: Wind, defaultThreshold: 125 },
  { value: 'temperature', label: '溫度', unit: '°C', Icon: Thermometer, defaultThreshold: 35 },
  { value: 'humidity', label: '濕度', unit: '%', Icon: Droplets, defaultThreshold: 80 },
  { value: 'noise', label: '噪音', unit: 'dB', Icon: Volume2, defaultThreshold: 85 },
];

// Camera icon types configuration
const CAMERA_ICON_TYPES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'video', label: '錄影機', Icon: Video },
  { value: 'cctv', label: 'CCTV', Icon: Cctv },
  { value: 'webcam', label: '網路攝影機', Icon: Webcam },
  { value: 'dome', label: '球型攝影機', Icon: ScanEye },
];

const getCameraIcon = (iconType: string): LucideIcon => {
  const found = CAMERA_ICON_TYPES.find(t => t.value === iconType);
  return found?.Icon || Camera;
};

const DeviceManagement = ({ onClose }: DeviceManagementProps) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [alarmThresholds, setAlarmThresholds] = useState<AlarmThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [savingAlarms, setSavingAlarms] = useState(false);
  
  // Form states
  const [newDevice, setNewDevice] = useState({
    device_id: '',
    name: '',
    lat: '',
    lng: '',
    location: '',
    mqtt_topic: ''
  });
  
  const [newCamera, setNewCamera] = useState({
    name: '',
    stream_url: '',
    icon_type: 'camera'
  });

  useEffect(() => {
    fetchDevices();
    fetchCameras();
    fetchAlarmThresholds();

    // Subscribe to realtime updates
    const devicesChannel = supabase
      .channel('devices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        fetchDevices();
      })
      .subscribe();

    const camerasChannel = supabase
      .channel('cameras-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cameras' }, () => {
        fetchCameras();
      })
      .subscribe();

    const alarmsChannel = supabase
      .channel('alarms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_alarm_thresholds' }, () => {
        fetchAlarmThresholds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(devicesChannel);
      supabase.removeChannel(camerasChannel);
      supabase.removeChannel(alarmsChannel);
    };
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('載入設備失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchCameras = async () => {
    try {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCameras(data || []);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    }
  };

  const fetchAlarmThresholds = async () => {
    try {
      const { data, error } = await supabase
        .from('device_alarm_thresholds')
        .select('*');

      if (error) throw error;
      setAlarmThresholds(data || []);
    } catch (error) {
      console.error('Error fetching alarm thresholds:', error);
    }
  };

  const getDeviceAlarmThreshold = (deviceId: string, metricType: string): AlarmThreshold | undefined => {
    return alarmThresholds.find(t => t.device_id === deviceId && t.metric_type === metricType);
  };

  const updateAlarmThreshold = async (deviceId: string, metricType: string, value: number, enabled: boolean) => {
    setSavingAlarms(true);
    try {
      const existing = getDeviceAlarmThreshold(deviceId, metricType);
      
      if (existing?.id) {
        const { error } = await supabase
          .from('device_alarm_thresholds')
          .update({ threshold_value: value, enabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('device_alarm_thresholds')
          .insert({
            device_id: deviceId,
            metric_type: metricType,
            threshold_value: value,
            enabled
          });
        if (error) throw error;
      }
      
      toast.success('警報設定已更新');
    } catch (error) {
      console.error('Error updating alarm threshold:', error);
      toast.error('更新警報設定失敗');
    } finally {
      setSavingAlarms(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.device_id || !newDevice.name) {
      toast.error('請填寫必要欄位');
      return;
    }

    try {
      const { error } = await supabase.from('devices').insert({
        device_id: newDevice.device_id,
        name: newDevice.name,
        lat: parseFloat(newDevice.lat) || 25.0330,
        lng: parseFloat(newDevice.lng) || 121.5654,
        location: newDevice.location || '未設定',
        mqtt_topic: newDevice.mqtt_topic || `device/${newDevice.device_id}`,
        status: 'offline',
        battery: 0,
        signal_strength: 0
      });

      if (error) throw error;

      toast.success('設備新增成功');
      setNewDevice({ device_id: '', name: '', lat: '', lng: '', location: '', mqtt_topic: '' });
      setShowAddDevice(false);
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('新增設備失敗');
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('確定要刪除此設備嗎？')) return;

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      toast.success('設備已刪除');
      if (selectedDevice?.id === deviceId) {
        setSelectedDevice(null);
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('刪除設備失敗');
    }
  };

  const handleAddCamera = async () => {
    if (!selectedDevice || !newCamera.name || !newCamera.stream_url) {
      toast.error('請填寫必要欄位');
      return;
    }

    try {
      const { error } = await supabase.from('cameras').insert({
        device_id: selectedDevice.id,
        name: newCamera.name,
        stream_url: newCamera.stream_url,
        icon_type: newCamera.icon_type,
        is_active: true
      });

      if (error) throw error;

      toast.success('攝影機新增成功');
      setNewCamera({ name: '', stream_url: '', icon_type: 'camera' });
      setShowAddCamera(false);
    } catch (error) {
      console.error('Error adding camera:', error);
      toast.error('新增攝影機失敗');
    }
  };

  const handleDeleteCamera = async (cameraId: string) => {
    if (!confirm('確定要刪除此攝影機嗎？')) return;

    try {
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', cameraId);

      if (error) throw error;

      toast.success('攝影機已刪除');
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('刪除攝影機失敗');
    }
  };

  const toggleCameraStatus = async (camera: CameraItem) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .update({ is_active: !camera.is_active })
        .eq('id', camera.id);

      if (error) throw error;

      toast.success(`攝影機已${camera.is_active ? '停用' : '啟用'}`);
    } catch (error) {
      console.error('Error toggling camera:', error);
      toast.error('更新攝影機狀態失敗');
    }
  };

  const updateCameraIcon = async (camera: CameraItem, iconType: string) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .update({ icon_type: iconType })
        .eq('id', camera.id);

      if (error) throw error;

      toast.success('攝影機圖示已更新');
    } catch (error) {
      console.error('Error updating camera icon:', error);
      toast.error('更新攝影機圖示失敗');
    }
  };

  const deviceCameras = selectedDevice 
    ? cameras.filter(c => c.device_id === selectedDevice.id)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">設備管理</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">管理設備與攝影機</p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">返回監控台</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="max-w-7xl mx-auto h-full">

          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Devices List */}
              <Card className="p-4 bg-secondary border-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">設備列表</h3>
                  <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1">
                        <Plus className="w-4 h-4" />
                        新增設備
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>新增設備</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>設備 ID *</Label>
                          <Input
                            placeholder="例: DEV-001"
                            value={newDevice.device_id}
                            onChange={(e) => setNewDevice({ ...newDevice, device_id: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>設備名稱 *</Label>
                          <Input
                            placeholder="例: 內湖工地監控站"
                            value={newDevice.name}
                            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>緯度</Label>
                            <Input
                              placeholder="25.0330"
                              type="number"
                              step="0.0001"
                              value={newDevice.lat}
                              onChange={(e) => setNewDevice({ ...newDevice, lat: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>經度</Label>
                            <Input
                              placeholder="121.5654"
                              type="number"
                              step="0.0001"
                              value={newDevice.lng}
                              onChange={(e) => setNewDevice({ ...newDevice, lng: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>位置描述</Label>
                          <Input
                            placeholder="例: 台北市內湖區"
                            value={newDevice.location}
                            onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>MQTT Topic</Label>
                          <Input
                            placeholder="例: device/DEV-001"
                            value={newDevice.mqtt_topic}
                            onChange={(e) => setNewDevice({ ...newDevice, mqtt_topic: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddDevice} className="w-full">
                          新增設備
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <ScrollArea className="flex-1">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">載入中...</div>
                  ) : devices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      尚無設備，點擊「新增設備」開始
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {devices.map((device) => (
                        <Card
                          key={device.id}
                          className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                            selectedDevice?.id === device.id
                              ? 'ring-2 ring-primary bg-primary/5'
                              : 'bg-background'
                          }`}
                          onClick={() => setSelectedDevice(device)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              {device.status === 'online' ? (
                                <Wifi className="w-4 h-4 text-success shrink-0" />
                              ) : (
                                <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{device.name}</div>
                                <div className="text-xs text-muted-foreground">{device.device_id}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                                {device.status === 'online' ? '在線' : '離線'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDevice(device.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {device.location} | MQTT: {device.mqtt_topic || '未設定'}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Card>

              {/* Camera Management */}
              <Card className="p-4 bg-secondary border-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    攝影機
                  </h3>
                  {selectedDevice && (
                    <Dialog open={showAddCamera} onOpenChange={setShowAddCamera}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                          <Plus className="w-4 h-4" />
                          新增
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>新增攝影機</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>攝影機名稱 *</Label>
                            <Input
                              placeholder="例: 主攝影機"
                              value={newCamera.name}
                              onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>串流 URL *</Label>
                            <Input
                              placeholder="例: rtsp://192.168.1.100:554/stream"
                              value={newCamera.stream_url}
                              onChange={(e) => setNewCamera({ ...newCamera, stream_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>攝影機圖示</Label>
                            <div className="grid grid-cols-5 gap-2">
                              {CAMERA_ICON_TYPES.map(({ value, label, Icon }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setNewCamera({ ...newCamera, icon_type: value })}
                                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                                    newCamera.icon_type === value
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border bg-background hover:border-primary/50'
                                  }`}
                                >
                                  <Icon className="w-6 h-6" />
                                  <span className="text-[10px]">{label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <Button onClick={handleAddCamera} className="w-full">
                            新增攝影機
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  {!selectedDevice ? (
                    <div className="text-center py-8 text-muted-foreground">
                      請先選擇設備
                    </div>
                  ) : deviceCameras.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      此設備尚無攝影機
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deviceCameras.map((camera) => {
                        const CameraIcon = getCameraIcon(camera.icon_type);
                        return (
                          <Card key={camera.id} className="p-3 bg-background">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <CameraIcon className={`w-4 h-4 shrink-0 ${camera.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                                <div className="min-w-0">
                                  <div className="font-medium text-xs truncate">{camera.name}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => toggleCameraStatus(camera)}
                                >
                                  {camera.is_active ? '停用' : '啟用'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteCamera(camera.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </Card>

              {/* Alarm Settings Panel - Large */}
              <Card className="p-4 bg-secondary border-0 flex flex-col lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-warning" />
                    警報設定
                  </h3>
                  {selectedDevice && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={savingAlarms}
                        onClick={async () => {
                          for (const metric of ALARM_METRICS) {
                            await updateAlarmThreshold(selectedDevice.device_id, metric.value, metric.defaultThreshold, true);
                          }
                        }}
                      >
                        全部啟用
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={savingAlarms}
                        onClick={async () => {
                          for (const metric of ALARM_METRICS) {
                            const threshold = getDeviceAlarmThreshold(selectedDevice.device_id, metric.value);
                            if (threshold?.enabled) {
                              await updateAlarmThreshold(selectedDevice.device_id, metric.value, threshold.threshold_value, false);
                            }
                          }
                        }}
                      >
                        全部停用
                      </Button>
                    </div>
                  )}
                </div>

                {!selectedDevice ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    請先選擇設備
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="grid grid-cols-1 gap-3">
                      {ALARM_METRICS.map(({ value: metricType, label, unit, Icon, defaultThreshold }) => {
                        const threshold = getDeviceAlarmThreshold(selectedDevice.device_id, metricType);
                        const currentValue = threshold?.threshold_value ?? defaultThreshold;
                        const isEnabled = threshold?.enabled ?? false;

                        return (
                          <Card 
                            key={metricType} 
                            className={`p-4 transition-all ${
                              isEnabled 
                                ? 'bg-background border-2 border-primary/30 shadow-sm' 
                                : 'bg-muted/30 border border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                  isEnabled 
                                    ? 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-base">{label}</div>
                                  {isEnabled ? (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs text-muted-foreground">閾值:</span>
                                      <Input
                                        type="number"
                                        value={currentValue}
                                        className="h-8 w-24 text-sm font-medium"
                                        disabled={savingAlarms}
                                        onChange={(e) => {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          setAlarmThresholds(prev => {
                                            const existing = prev.find(t => t.device_id === selectedDevice.device_id && t.metric_type === metricType);
                                            if (existing) {
                                              return prev.map(t => 
                                                t.device_id === selectedDevice.device_id && t.metric_type === metricType
                                                  ? { ...t, threshold_value: newValue }
                                                  : t
                                              );
                                            } else {
                                              return [...prev, {
                                                device_id: selectedDevice.device_id,
                                                metric_type: metricType,
                                                threshold_value: newValue,
                                                enabled: true
                                              }];
                                            }
                                          });
                                        }}
                                        onBlur={(e) => {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          updateAlarmThreshold(selectedDevice.device_id, metricType, newValue, true);
                                        }}
                                      />
                                      <span className="text-sm font-medium text-muted-foreground">{unit}</span>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground mt-1">警報未啟用</div>
                                  )}
                                </div>
                              </div>
                              <Switch
                                checked={isEnabled}
                                disabled={savingAlarms}
                                onCheckedChange={(checked) => {
                                  updateAlarmThreshold(selectedDevice.device_id, metricType, currentValue, checked);
                                }}
                              />
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceManagement;