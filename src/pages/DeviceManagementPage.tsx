import { useState, useEffect, useMemo } from 'react';
import { Monitor, Bell, Settings, Trash2, Plus, MapPin, Save, Edit2, X, Camera, Video, Cctv, Webcam, ScanEye, Eye, LucideIcon, Building2, Factory, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  description: string | null;
}

interface Site {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  description: string | null;
}

interface Device {
  id: string;
  device_id: string;
  name: string;
  lat: number;
  lng: number;
  location: string | null;
  status: string;
  battery: number | null;
  signal_strength: number | null;
  mqtt_topic: string | null;
  company_id: string | null;
  site_id: string | null;
}

interface DeviceCamera {
  id: string;
  device_id: string;
  name: string;
  stream_url: string;
  icon_type: string;
  is_active: boolean;
}

interface AlarmThreshold {
  id: string;
  device_id: string;
  metric_type: string;
  threshold_value: number;
  enabled: boolean;
}

const CAMERA_ICON_TYPES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'video', label: 'CCTV', Icon: Video },
  { value: 'cctv', label: 'CCTV', Icon: Cctv },
  { value: 'webcam', label: '網路攝影機', Icon: Webcam },
  { value: 'dome', label: '球型攝影機', Icon: ScanEye },
  { value: 'eye', label: '監視', Icon: Eye },
  { value: 'camera', label: '相機', Icon: Camera },
];

const getCameraIcon = (iconType: string): LucideIcon => {
  const found = CAMERA_ICON_TYPES.find(t => t.value === iconType);
  return found ? found.Icon : Camera;
};

const DeviceManagementPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<DeviceCamera[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [editingCamera, setEditingCamera] = useState<DeviceCamera | null>(null);
  const [isAddingCamera, setIsAddingCamera] = useState(false);
  const [selectedDeviceForCamera, setSelectedDeviceForCamera] = useState<string>('');

  // New device form with hierarchical selection
  const [newDevice, setNewDevice] = useState({
    company_id: '',
    site_id: '',
    device_id: '',
    name: '',
    lat: '',
    lng: '',
    location: '',
    mqtt_topic: '',
  });

  const [newCamera, setNewCamera] = useState({
    name: '',
    stream_url: '',
    icon_type: 'camera',
  });

  // Filter sites based on selected company
  const filteredSitesForNewDevice = useMemo(() => {
    if (!newDevice.company_id) return [];
    return sites.filter(s => s.company_id === newDevice.company_id);
  }, [sites, newDevice.company_id]);

  // Get company and site names
  const getCompanyName = (id: string | null) => companies.find(c => c.id === id)?.name || '-';
  const getSiteName = (id: string | null) => sites.find(s => s.id === id)?.name || '-';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, sitesRes, devicesRes, camerasRes, thresholdsRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('sites').select('*').order('name'),
        supabase.from('devices').select('*').order('created_at', { ascending: false }),
        supabase.from('cameras').select('*').order('created_at', { ascending: false }),
        supabase.from('device_alarm_thresholds').select('*'),
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
      if (camerasRes.data) setCameras(camerasRes.data);
      if (thresholdsRes.data) setThresholds(thresholdsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.company_id) {
      toast.error('請先選擇公司');
      return;
    }
    if (!newDevice.site_id) {
      toast.error('請先選擇工地');
      return;
    }
    if (!newDevice.device_id || !newDevice.name || !newDevice.lat || !newDevice.lng) {
      toast.error('請填寫必要欄位');
      return;
    }

    try {
      const { error } = await supabase.from('devices').insert({
        company_id: newDevice.company_id,
        site_id: newDevice.site_id,
        device_id: newDevice.device_id,
        name: newDevice.name,
        lat: parseFloat(newDevice.lat),
        lng: parseFloat(newDevice.lng),
        location: newDevice.location || null,
        mqtt_topic: newDevice.mqtt_topic || null,
        status: 'offline',
      });

      if (error) throw error;

      toast.success('設備新增成功');
      setNewDevice({ company_id: '', site_id: '', device_id: '', name: '', lat: '', lng: '', location: '', mqtt_topic: '' });
      setIsAddingDevice(false);
      fetchData();
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('新增設備失敗');
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    try {
      const { error } = await supabase
        .from('devices')
        .update({
          name: editingDevice.name,
          lat: editingDevice.lat,
          lng: editingDevice.lng,
          location: editingDevice.location,
          mqtt_topic: editingDevice.mqtt_topic,
        })
        .eq('id', editingDevice.id);

      if (error) throw error;

      toast.success('設備更新成功');
      setEditingDevice(null);
      fetchData();
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('更新設備失敗');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) throw error;
      toast.success('設備已刪除');
      fetchData();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('刪除設備失敗');
    }
  };

  const handleAddCamera = async () => {
    if (!selectedDeviceForCamera || !newCamera.name || !newCamera.stream_url) {
      toast.error('請填寫必要欄位');
      return;
    }

    try {
      const device = devices.find(d => d.device_id === selectedDeviceForCamera);
      if (!device) return;

      const { error } = await supabase.from('cameras').insert({
        device_id: device.id,
        name: newCamera.name,
        stream_url: newCamera.stream_url,
        icon_type: newCamera.icon_type,
      });

      if (error) throw error;

      toast.success('攝影機新增成功');
      setNewCamera({ name: '', stream_url: '', icon_type: 'camera' });
      setSelectedDeviceForCamera('');
      setIsAddingCamera(false);
      fetchData();
    } catch (error) {
      console.error('Error adding camera:', error);
      toast.error('新增攝影機失敗');
    }
  };

  const handleDeleteCamera = async (id: string) => {
    try {
      const { error } = await supabase.from('cameras').delete().eq('id', id);
      if (error) throw error;
      toast.success('攝影機已刪除');
      fetchData();
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('刪除攝影機失敗');
    }
  };

  const handleToggleThreshold = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('device_alarm_thresholds')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
      
      setThresholds(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
      toast.success(enabled ? '已啟用警報' : '已停用警報');
    } catch (error) {
      console.error('Error toggling threshold:', error);
      toast.error('更新失敗');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設備管理</h1>
        <p className="text-muted-foreground">管理監控設備、攝影機和警報閾值</p>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices" className="gap-2">
            <Monitor className="w-4 h-4" />
            設備
          </TabsTrigger>
          <TabsTrigger value="cameras" className="gap-2">
            <Camera className="w-4 h-4" />
            攝影機
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="gap-2">
            <Bell className="w-4 h-4" />
            警報閾值
          </TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddingDevice(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              新增設備
            </Button>
          </div>

          {isAddingDevice && (
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  新增設備
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step indicator */}
                <div className="flex items-center gap-2 text-sm">
                  <div className={`flex items-center gap-1 ${newDevice.company_id ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Building2 className="w-4 h-4" />
                    <span>1. 公司</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <div className={`flex items-center gap-1 ${newDevice.site_id ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Factory className="w-4 h-4" />
                    <span>2. 工地</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <div className={`flex items-center gap-1 ${newDevice.name ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Monitor className="w-4 h-4" />
                    <span>3. 設備資訊</span>
                  </div>
                </div>

                {/* Step 1: Select Company */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    隸屬公司 *
                  </Label>
                  <Select 
                    value={newDevice.company_id} 
                    onValueChange={v => setNewDevice(prev => ({ ...prev, company_id: v, site_id: '' }))}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="請先選擇公司" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {companies.length === 0 && (
                    <p className="text-xs text-muted-foreground">尚無公司資料，請先在組織管理中新增公司</p>
                  )}
                </div>

                {/* Step 2: Select Site (only shown after company selected) */}
                {newDevice.company_id && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Factory className="w-4 h-4" />
                      隸屬工地 *
                    </Label>
                    <Select 
                      value={newDevice.site_id} 
                      onValueChange={v => setNewDevice(prev => ({ ...prev, site_id: v }))}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="請選擇工地" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {filteredSitesForNewDevice.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <Factory className="w-4 h-4" />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filteredSitesForNewDevice.length === 0 && (
                      <p className="text-xs text-muted-foreground">此公司尚無工地資料，請先在組織管理中新增工地</p>
                    )}
                  </div>
                )}

                {/* Step 3: Device Details (only shown after site selected) */}
                {newDevice.site_id && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Monitor className="w-4 h-4" />
                      設備資訊
                    </Label>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label>設備 ID *</Label>
                        <Input
                          placeholder="DEV-001"
                          value={newDevice.device_id}
                          onChange={e => setNewDevice(prev => ({ ...prev, device_id: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>設備名稱 *</Label>
                        <Input
                          placeholder="設備名稱"
                          value={newDevice.name}
                          onChange={e => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>安裝位置</Label>
                        <Input
                          placeholder="安裝位置描述"
                          value={newDevice.location}
                          onChange={e => setNewDevice(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>緯度 *</Label>
                        <Input
                          type="number"
                          placeholder="25.0330"
                          value={newDevice.lat}
                          onChange={e => setNewDevice(prev => ({ ...prev, lat: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>經度 *</Label>
                        <Input
                          type="number"
                          placeholder="121.5654"
                          value={newDevice.lng}
                          onChange={e => setNewDevice(prev => ({ ...prev, lng: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>MQTT Topic</Label>
                        <Input
                          placeholder="devices/dev-001"
                          value={newDevice.mqtt_topic}
                          onChange={e => setNewDevice(prev => ({ ...prev, mqtt_topic: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setIsAddingDevice(false);
                    setNewDevice({ company_id: '', site_id: '', device_id: '', name: '', lat: '', lng: '', location: '', mqtt_topic: '' });
                  }}>取消</Button>
                  <Button 
                    onClick={handleAddDevice}
                    disabled={!newDevice.company_id || !newDevice.site_id}
                  >
                    儲存設備
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {devices.map(device => (
              <Card key={device.id}>
                <CardContent className="p-4">
                  {editingDevice?.id === device.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editingDevice.name}
                        onChange={e => setEditingDevice(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                      <Input
                        value={editingDevice.location || ''}
                        placeholder="位置"
                        onChange={e => setEditingDevice(prev => prev ? { ...prev, location: e.target.value } : null)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateDevice}>儲存</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDevice(null)}>取消</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{device.name}</h3>
                          <p className="text-sm text-muted-foreground">{device.device_id}</p>
                        </div>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status === 'online' ? '上線' : '離線'}
                        </Badge>
                      </div>
                      {/* Company and Site info */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Building2 className="w-3 h-3" />
                          {getCompanyName(device.company_id)}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Factory className="w-3 h-3" />
                          {getSiteName(device.site_id)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{device.location || '未設定位置'}</span>
                        </div>
                        <div>座標: {device.lat}, {device.lng}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingDevice(device)}>
                          <Edit2 className="w-3 h-3 mr-1" />
                          編輯
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteDevice(device.id)}>
                          <Trash2 className="w-3 h-3 mr-1" />
                          刪除
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cameras Tab */}
        <TabsContent value="cameras" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddingCamera(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              新增攝影機
            </Button>
          </div>

          {isAddingCamera && (
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">新增攝影機</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>關聯設備 *</Label>
                    <Select value={selectedDeviceForCamera} onValueChange={setSelectedDeviceForCamera}>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="選擇設備" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {devices.map(d => (
                          <SelectItem key={d.device_id} value={d.device_id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>攝影機名稱 *</Label>
                    <Input
                      placeholder="主攝影機"
                      value={newCamera.name}
                      onChange={e => setNewCamera(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>串流 URL *</Label>
                    <Input
                      placeholder="rtsp://..."
                      value={newCamera.stream_url}
                      onChange={e => setNewCamera(prev => ({ ...prev, stream_url: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>圖示類型</Label>
                    <Select value={newCamera.icon_type} onValueChange={v => setNewCamera(prev => ({ ...prev, icon_type: v }))}>
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {CAMERA_ICON_TYPES.map(type => {
                          const IconComponent = type.Icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsAddingCamera(false)}>取消</Button>
                  <Button onClick={handleAddCamera}>儲存</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cameras.map(camera => {
              const IconComponent = getCameraIcon(camera.icon_type);
              return (
                <Card key={camera.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="font-semibold">{camera.name}</h3>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{camera.stream_url}</p>
                        </div>
                      </div>
                      <Badge variant={camera.is_active ? 'default' : 'secondary'}>
                        {camera.is_active ? '啟用' : '停用'}
                      </Badge>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteCamera(camera.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />
                      刪除
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds" className="space-y-4">
          {thresholds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>尚無警報閾值設定</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {thresholds.map(threshold => {
                const device = devices.find(d => d.device_id === threshold.device_id);
                return (
                  <Card key={threshold.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{device?.name || threshold.device_id}</h3>
                        <Switch
                          checked={threshold.enabled}
                          onCheckedChange={checked => handleToggleThreshold(threshold.id, checked)}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="capitalize">{threshold.metric_type}</span>: {threshold.threshold_value}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeviceManagementPage;
