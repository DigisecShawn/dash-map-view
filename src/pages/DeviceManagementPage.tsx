import { useState, useEffect, useMemo } from 'react';
import { Monitor, Bell, Trash2, Plus, Save, Edit2, X, Camera, Video, Cctv, Webcam, ScanEye, Eye, LucideIcon, Building2, Factory, ChevronRight, Search, Filter, MoreVertical, Settings, Signal, Battery, Wifi, Thermometer, Droplets, Wind, Volume2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

const METRIC_TYPES = [
  { key: 'temperature', label: '溫度', unit: '°C', icon: Thermometer, color: 'text-orange-500', bgColor: 'bg-orange-500/20', defaultValue: 35 },
  { key: 'humidity', label: '濕度', unit: '%', icon: Droplets, color: 'text-blue-500', bgColor: 'bg-blue-500/20', defaultValue: 80 },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', icon: Wind, color: 'text-purple-500', bgColor: 'bg-purple-500/20', defaultValue: 75 },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', icon: Wind, color: 'text-cyan-500', bgColor: 'bg-cyan-500/20', defaultValue: 150 },
  { key: 'noise', label: '噪音', unit: 'dB', icon: Volume2, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', defaultValue: 85 },
];

const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  temperature: { label: '溫度', unit: '°C' },
  humidity: { label: '濕度', unit: '%' },
  pm25: { label: 'PM2.5', unit: 'µg/m³' },
  pm10: { label: 'PM10', unit: 'µg/m³' },
  noise: { label: '噪音', unit: 'dB' },
  battery: { label: '電量', unit: '%' },
  signal_strength: { label: '訊號', unit: '%' },
};

const DeviceManagementPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<DeviceCamera[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState<string>('all');
  
  // Dialog states
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isAddCameraOpen, setIsAddCameraOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingCamera, setEditingCamera] = useState<DeviceCamera | null>(null);
  const [selectedDeviceForCamera, setSelectedDeviceForCamera] = useState<string>('');
  const [thresholdFilter, setThresholdFilter] = useState<string>('all');
  const [savingThresholds, setSavingThresholds] = useState<Set<string>>(new Set());

  const [newDevice, setNewDevice] = useState({
    company_id: '',
    site_id: '',
    device_id: '',
    name: '',
    location: '',
    mqtt_topic: '',
  });

  const [newCamera, setNewCamera] = useState({
    name: '',
    stream_url: '',
    icon_type: 'camera',
  });

  const filteredSitesForNewDevice = useMemo(() => {
    if (!newDevice.company_id) return [];
    return sites.filter(s => s.company_id === newDevice.company_id);
  }, [sites, newDevice.company_id]);

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
    if (!newDevice.company_id || !newDevice.site_id || !newDevice.device_id || !newDevice.name) {
      toast.error('請填寫必要欄位');
      return;
    }

    try {
      const { error } = await supabase.from('devices').insert({
        company_id: newDevice.company_id,
        site_id: newDevice.site_id,
        device_id: newDevice.device_id,
        name: newDevice.name,
        lat: 0,
        lng: 0,
        location: newDevice.location || null,
        mqtt_topic: newDevice.mqtt_topic || null,
        status: 'offline',
      });

      if (error) throw error;

      toast.success('設備新增成功');
      setNewDevice({ company_id: '', site_id: '', device_id: '', name: '', location: '', mqtt_topic: '' });
      setIsAddDeviceOpen(false);
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
      setIsAddCameraOpen(false);
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

  const handleToggleThreshold = async (deviceId: string, metricType: string, enabled: boolean) => {
    const existingThreshold = thresholds.find(t => t.device_id === deviceId && t.metric_type === metricType);
    const key = `${deviceId}-${metricType}`;
    setSavingThresholds(prev => new Set(prev).add(key));

    try {
      if (existingThreshold) {
        const { error } = await supabase
          .from('device_alarm_thresholds')
          .update({ enabled })
          .eq('id', existingThreshold.id);

        if (error) throw error;
        setThresholds(prev => prev.map(t => t.id === existingThreshold.id ? { ...t, enabled } : t));
      } else {
        const metric = METRIC_TYPES.find(m => m.key === metricType);
        const { data, error } = await supabase
          .from('device_alarm_thresholds')
          .insert({
            device_id: deviceId,
            metric_type: metricType,
            threshold_value: metric?.defaultValue || 0,
            enabled,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setThresholds(prev => [...prev, data]);
      }
      toast.success(enabled ? '已啟用警報' : '已停用警報');
    } catch (error) {
      console.error('Error toggling threshold:', error);
      toast.error('更新失敗');
    } finally {
      setSavingThresholds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleUpdateThresholdValue = async (deviceId: string, metricType: string, value: number) => {
    const existingThreshold = thresholds.find(t => t.device_id === deviceId && t.metric_type === metricType);
    const key = `${deviceId}-${metricType}`;
    setSavingThresholds(prev => new Set(prev).add(key));

    try {
      if (existingThreshold) {
        const { error } = await supabase
          .from('device_alarm_thresholds')
          .update({ threshold_value: value })
          .eq('id', existingThreshold.id);

        if (error) throw error;
        setThresholds(prev => prev.map(t => t.id === existingThreshold.id ? { ...t, threshold_value: value } : t));
      } else {
        const { data, error } = await supabase
          .from('device_alarm_thresholds')
          .insert({
            device_id: deviceId,
            metric_type: metricType,
            threshold_value: value,
            enabled: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setThresholds(prev => [...prev, data]);
      }
      toast.success('閾值已更新');
    } catch (error) {
      console.error('Error updating threshold:', error);
      toast.error('更新失敗');
    } finally {
      setSavingThresholds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const getDeviceThresholds = (deviceId: string) => {
    return METRIC_TYPES.map(metric => {
      const threshold = thresholds.find(t => t.device_id === deviceId && t.metric_type === metric.key);
      return {
        ...metric,
        threshold: threshold,
        value: threshold?.threshold_value ?? metric.defaultValue,
        enabled: threshold?.enabled ?? false,
      };
    });
  };

  const getEnabledThresholdCount = (deviceId: string) => {
    return thresholds.filter(t => t.device_id === deviceId && t.enabled).length;
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.device_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSite = filterSite === 'all' || device.site_id === filterSite;
      return matchesSearch && matchesSite;
    });
  }, [devices, searchQuery, filterSite]);

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    cameras: cameras.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">設備管理</h1>
          <p className="text-sm text-muted-foreground">管理監控設備、攝影機和警報閾值</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Monitor className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">總設備數</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Wifi className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{stats.online}</p>
                <p className="text-xs text-muted-foreground">在線</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted-foreground/20">
                <Signal className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{stats.offline}</p>
                <p className="text-xs text-muted-foreground">離線</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Camera className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cameras}</p>
                <p className="text-xs text-muted-foreground">攝影機</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-secondary w-full sm:w-auto">
            <TabsTrigger value="devices" className="flex-1 sm:flex-initial gap-2">
              <Monitor className="w-4 h-4" />
              設備
            </TabsTrigger>
            <TabsTrigger value="cameras" className="flex-1 sm:flex-initial gap-2">
              <Camera className="w-4 h-4" />
              攝影機
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="flex-1 sm:flex-initial gap-2">
              <Bell className="w-4 h-4" />
              警報閾值
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜尋設備名稱或ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSite} onValueChange={setFilterSite}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="篩選工地" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部工地</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddDeviceOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              新增設備
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDevices.map(device => (
                <Card key={device.id} className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${device.status === 'online' ? 'bg-success/20' : 'bg-muted'}`}>
                          <Monitor className={`w-5 h-5 ${device.status === 'online' ? 'text-success' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold truncate max-w-[180px]">{device.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDevice(device)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            編輯
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteDevice(device.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            刪除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="truncate">{getCompanyName(device.company_id)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Factory className="w-3.5 h-3.5" />
                        <span className="truncate">{getSiteName(device.site_id)}</span>
                      </div>
                      {device.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Settings className="w-3.5 h-3.5" />
                          <span className="truncate">{device.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className={device.status === 'online' ? 'bg-success' : ''}>
                        {device.status === 'online' ? '在線' : '離線'}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Battery className="w-3.5 h-3.5" />
                        <span>{device.battery || 0}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Signal className="w-3.5 h-3.5" />
                        <span>{device.signal_strength || 0}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Cameras Tab */}
        <TabsContent value="cameras" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddCameraOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              新增攝影機
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cameras.map(camera => {
                const CamIcon = getCameraIcon(camera.icon_type);
                const device = devices.find(d => d.id === camera.device_id);
                return (
                  <Card key={camera.id} className="group hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${camera.is_active ? 'bg-success/20' : 'bg-muted'}`}>
                            <CamIcon className={`w-5 h-5 ${camera.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{camera.name}</h3>
                            <p className="text-xs text-muted-foreground">{device?.name || '未知設備'}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteCamera(camera.id)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground truncate bg-muted/50 p-2 rounded">
                        {camera.stream_url}
                      </div>
                      <Badge variant={camera.is_active ? 'default' : 'secondary'} className={`mt-3 ${camera.is_active ? 'bg-success' : ''}`}>
                        {camera.is_active ? '啟用' : '停用'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds" className="space-y-4 mt-4">
          {/* Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={thresholdFilter} onValueChange={setThresholdFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="篩選設備" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部設備</SelectItem>
                {devices.map(d => (
                  <SelectItem key={d.device_id} value={d.device_id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span>共 {thresholds.filter(t => t.enabled).length} 個啟用中的警報閾值</span>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-430px)]">
            <Accordion type="multiple" className="space-y-3">
              {devices
                .filter(d => thresholdFilter === 'all' || d.device_id === thresholdFilter)
                .map(device => {
                  const deviceThresholds = getDeviceThresholds(device.device_id);
                  const enabledCount = getEnabledThresholdCount(device.device_id);
                  
                  return (
                    <AccordionItem key={device.device_id} value={device.device_id} className="border rounded-lg bg-card px-4">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-2 rounded-lg ${device.status === 'online' ? 'bg-success/20' : 'bg-muted'}`}>
                            <Monitor className={`w-5 h-5 ${device.status === 'online' ? 'text-success' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold">{device.name}</h3>
                            <p className="text-xs text-muted-foreground">{device.device_id}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-2 mr-4">
                            {enabledCount > 0 ? (
                              <Badge variant="default" className="bg-warning text-warning-foreground">
                                {enabledCount} 個警報啟用
                              </Badge>
                            ) : (
                              <Badge variant="secondary">未設定警報</Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 pt-2">
                          {deviceThresholds.map(metric => {
                            const MetricIcon = metric.icon;
                            const isSaving = savingThresholds.has(`${device.device_id}-${metric.key}`);
                            
                            return (
                              <Card key={metric.key} className={`relative overflow-hidden transition-all ${metric.enabled ? 'border-warning/50 shadow-md' : 'border-border'}`}>
                                <CardContent className="p-4 space-y-3">
                                  {/* Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1.5 rounded-md ${metric.bgColor}`}>
                                        <MetricIcon className={`w-4 h-4 ${metric.color}`} />
                                      </div>
                                      <span className="font-medium text-sm">{metric.label}</span>
                                    </div>
                                    <Switch
                                      checked={metric.enabled}
                                      onCheckedChange={checked => handleToggleThreshold(device.device_id, metric.key, checked)}
                                      disabled={isSaving}
                                    />
                                  </div>

                                  {/* Value Input */}
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">閾值設定</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        value={metric.value}
                                        onChange={e => {
                                          const newValue = parseFloat(e.target.value);
                                          if (!isNaN(newValue)) {
                                            setThresholds(prev => {
                                              const existing = prev.find(t => t.device_id === device.device_id && t.metric_type === metric.key);
                                              if (existing) {
                                                return prev.map(t => t.id === existing.id ? { ...t, threshold_value: newValue } : t);
                                              }
                                              return prev;
                                            });
                                          }
                                        }}
                                        onBlur={e => {
                                          const newValue = parseFloat(e.target.value);
                                          if (!isNaN(newValue) && newValue !== metric.threshold?.threshold_value) {
                                            handleUpdateThresholdValue(device.device_id, metric.key, newValue);
                                          }
                                        }}
                                        className="h-9"
                                        disabled={isSaving}
                                      />
                                      <span className="text-sm text-muted-foreground whitespace-nowrap">{metric.unit}</span>
                                    </div>
                                  </div>

                                  {/* Status indicator */}
                                  {metric.enabled && (
                                    <div className="flex items-center gap-1.5 text-xs text-warning">
                                      <Bell className="w-3 h-3" />
                                      <span>警報已啟用</span>
                                    </div>
                                  )}

                                  {/* Loading overlay */}
                                  {isSaving && (
                                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Add Device Dialog */}
      <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              新增設備
            </DialogTitle>
            <DialogDescription>
              填寫設備資訊以新增監控設備
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm mb-4">
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${newDevice.company_id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Building2 className="w-3.5 h-3.5" />
                <span>公司</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${newDevice.site_id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Factory className="w-3.5 h-3.5" />
                <span>工地</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${newDevice.name ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Monitor className="w-3.5 h-3.5" />
                <span>設備</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>隸屬公司 *</Label>
              <Select value={newDevice.company_id} onValueChange={v => setNewDevice(prev => ({ ...prev, company_id: v, site_id: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇公司" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newDevice.company_id && (
              <div className="space-y-2">
                <Label>隸屬工地 *</Label>
                <Select value={newDevice.site_id} onValueChange={v => setNewDevice(prev => ({ ...prev, site_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇工地" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSitesForNewDevice.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newDevice.site_id && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label>MQTT Topic</Label>
                  <Input
                    placeholder="devices/dev-001"
                    value={newDevice.mqtt_topic}
                    onChange={e => setNewDevice(prev => ({ ...prev, mqtt_topic: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDeviceOpen(false)}>取消</Button>
            <Button onClick={handleAddDevice} disabled={!newDevice.company_id || !newDevice.site_id || !newDevice.device_id || !newDevice.name}>
              儲存設備
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={!!editingDevice} onOpenChange={() => setEditingDevice(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              編輯設備
            </DialogTitle>
          </DialogHeader>
          {editingDevice && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>設備名稱</Label>
                <Input
                  value={editingDevice.name}
                  onChange={e => setEditingDevice(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>安裝位置</Label>
                <Input
                  value={editingDevice.location || ''}
                  onChange={e => setEditingDevice(prev => prev ? { ...prev, location: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>MQTT Topic</Label>
                <Input
                  value={editingDevice.mqtt_topic || ''}
                  onChange={e => setEditingDevice(prev => prev ? { ...prev, mqtt_topic: e.target.value } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDevice(null)}>取消</Button>
            <Button onClick={handleUpdateDevice}>儲存變更</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Camera Dialog */}
      <Dialog open={isAddCameraOpen} onOpenChange={setIsAddCameraOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              新增攝影機
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>關聯設備 *</Label>
              <Select value={selectedDeviceForCamera} onValueChange={setSelectedDeviceForCamera}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇設備" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map(d => (
                    <SelectItem key={d.device_id} value={d.device_id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>攝影機名稱 *</Label>
              <Input
                placeholder="攝影機名稱"
                value={newCamera.name}
                onChange={e => setNewCamera(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>串流網址 *</Label>
              <Input
                placeholder="rtsp://..."
                value={newCamera.stream_url}
                onChange={e => setNewCamera(prev => ({ ...prev, stream_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>圖示類型</Label>
              <Select value={newCamera.icon_type} onValueChange={v => setNewCamera(prev => ({ ...prev, icon_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_ICON_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.Icon className="w-4 h-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCameraOpen(false)}>取消</Button>
            <Button onClick={handleAddCamera}>新增攝影機</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceManagementPage;
