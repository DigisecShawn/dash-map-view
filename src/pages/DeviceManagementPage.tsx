import { useState, useEffect, useMemo } from 'react';
import { Monitor, Bell, Trash2, Plus, Edit2, Camera, Video, Cctv, Webcam, ScanEye, Eye, LucideIcon, Building2, Factory, ChevronRight, Search, Filter, MoreVertical, Settings, Signal, Battery, Wifi, Thermometer, Droplets, Wind, Volume2, AlertTriangle, Image, Play, Link2, ExternalLink, ChevronDown, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getStatusBadgeClass, getStatusIconClass, getStatusLabel, STATUS_CONFIG, type DeviceStatus } from '@/lib/statusUtils';
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
const CAMERA_ICON_TYPES: {
  value: string;
  label: string;
  Icon: LucideIcon;
}[] = [{
  value: 'rtsp',
  label: 'RTSP 串流',
  Icon: Video
}, {
  value: 'http',
  label: 'HTTP 串流',
  Icon: Link2
}, {
  value: 'snapshot',
  label: '快照',
  Icon: Image
}, {
  value: 'cctv',
  label: 'CCTV',
  Icon: Cctv
}, {
  value: 'webcam',
  label: '網路攝影機',
  Icon: Webcam
}, {
  value: 'dome',
  label: '球型攝影機',
  Icon: ScanEye
}];
const getCameraIcon = (iconType: string): LucideIcon => {
  const found = CAMERA_ICON_TYPES.find(t => t.value === iconType);
  return found ? found.Icon : Camera;
};
const METRIC_TYPES = [{
  key: 'temperature',
  label: '溫度',
  unit: '°C',
  icon: Thermometer,
  color: 'text-orange-500',
  bgColor: 'bg-orange-500/20',
  borderColor: 'border-orange-500/30',
  defaultValue: 35
}, {
  key: 'humidity',
  label: '濕度',
  unit: '%',
  icon: Droplets,
  color: 'text-blue-500',
  bgColor: 'bg-blue-500/20',
  borderColor: 'border-blue-500/30',
  defaultValue: 80
}, {
  key: 'pm25',
  label: 'PM2.5',
  unit: 'µg/m³',
  icon: Wind,
  color: 'text-purple-500',
  bgColor: 'bg-purple-500/20',
  borderColor: 'border-purple-500/30',
  defaultValue: 75
}, {
  key: 'pm10',
  label: 'PM10',
  unit: 'µg/m³',
  icon: Wind,
  color: 'text-cyan-500',
  bgColor: 'bg-cyan-500/20',
  borderColor: 'border-cyan-500/30',
  defaultValue: 150
}, {
  key: 'noise',
  label: '噪音',
  unit: 'dB',
  icon: Volume2,
  color: 'text-yellow-500',
  bgColor: 'bg-yellow-500/20',
  borderColor: 'border-yellow-500/30',
  defaultValue: 85
}];
const DeviceManagementPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<DeviceCamera[]>([]);
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());

  // Dialog states
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isAddCameraOpen, setIsAddCameraOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [selectedDeviceForCamera, setSelectedDeviceForCamera] = useState<string>('');
  const [savingThresholds, setSavingThresholds] = useState<Set<string>>(new Set());
  const [newDevice, setNewDevice] = useState({
    company_id: '',
    site_id: '',
    device_id: '',
    name: '',
    location: '',
    mqtt_topic: ''
  });
  const [newCamera, setNewCamera] = useState({
    name: '',
    stream_url: '',
    icon_type: 'rtsp'
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
      const [companiesRes, sitesRes, devicesRes, camerasRes, thresholdsRes] = await Promise.all([supabase.from('companies').select('*').order('name'), supabase.from('sites').select('*').order('name'), supabase.from('devices').select('*').order('created_at', {
        ascending: false
      }), supabase.from('cameras').select('*').order('created_at', {
        ascending: false
      }), supabase.from('device_alarm_thresholds').select('*')]);
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
  const toggleDeviceExpanded = (deviceId: string) => {
    setExpandedDevices(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };
  const handleAddDevice = async () => {
    if (!newDevice.company_id || !newDevice.site_id || !newDevice.device_id || !newDevice.name) {
      toast.error('請填寫必要欄位');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('devices').insert({
        company_id: newDevice.company_id,
        site_id: newDevice.site_id,
        device_id: newDevice.device_id,
        name: newDevice.name,
        lat: 0,
        lng: 0,
        location: newDevice.location || null,
        mqtt_topic: newDevice.mqtt_topic || null,
        status: 'offline'
      });
      if (error) throw error;
      toast.success('設備新增成功');
      setNewDevice({
        company_id: '',
        site_id: '',
        device_id: '',
        name: '',
        location: '',
        mqtt_topic: ''
      });
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
      const {
        error
      } = await supabase.from('devices').update({
        name: editingDevice.name,
        location: editingDevice.location,
        mqtt_topic: editingDevice.mqtt_topic
      }).eq('id', editingDevice.id);
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
      const {
        error
      } = await supabase.from('devices').delete().eq('id', id);
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
      const device = devices.find(d => d.id === selectedDeviceForCamera);
      if (!device) return;
      const {
        error
      } = await supabase.from('cameras').insert({
        device_id: device.id,
        name: newCamera.name,
        stream_url: newCamera.stream_url,
        icon_type: newCamera.icon_type
      });
      if (error) throw error;
      toast.success('攝影機新增成功');
      setNewCamera({
        name: '',
        stream_url: '',
        icon_type: 'rtsp'
      });
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
      const {
        error
      } = await supabase.from('cameras').delete().eq('id', id);
      if (error) throw error;
      toast.success('攝影機已刪除');
      fetchData();
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('刪除攝影機失敗');
    }
  };
  const handleToggleCameraActive = async (id: string, is_active: boolean) => {
    try {
      const {
        error
      } = await supabase.from('cameras').update({
        is_active
      }).eq('id', id);
      if (error) throw error;
      setCameras(prev => prev.map(c => c.id === id ? {
        ...c,
        is_active
      } : c));
      toast.success(is_active ? '攝影機已啟用' : '攝影機已停用');
    } catch (error) {
      console.error('Error toggling camera:', error);
      toast.error('更新失敗');
    }
  };
  const handleToggleThreshold = async (deviceId: string, metricType: string, enabled: boolean) => {
    const existingThreshold = thresholds.find(t => t.device_id === deviceId && t.metric_type === metricType);
    const key = `${deviceId}-${metricType}`;
    setSavingThresholds(prev => new Set(prev).add(key));
    try {
      if (existingThreshold) {
        const {
          error
        } = await supabase.from('device_alarm_thresholds').update({
          enabled
        }).eq('id', existingThreshold.id);
        if (error) throw error;
        setThresholds(prev => prev.map(t => t.id === existingThreshold.id ? {
          ...t,
          enabled
        } : t));
      } else {
        const metric = METRIC_TYPES.find(m => m.key === metricType);
        const {
          data,
          error
        } = await supabase.from('device_alarm_thresholds').insert({
          device_id: deviceId,
          metric_type: metricType,
          threshold_value: metric?.defaultValue || 0,
          enabled
        }).select().single();
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
        const {
          error
        } = await supabase.from('device_alarm_thresholds').update({
          threshold_value: value
        }).eq('id', existingThreshold.id);
        if (error) throw error;
        setThresholds(prev => prev.map(t => t.id === existingThreshold.id ? {
          ...t,
          threshold_value: value
        } : t));
      } else {
        const {
          data,
          error
        } = await supabase.from('device_alarm_thresholds').insert({
          device_id: deviceId,
          metric_type: metricType,
          threshold_value: value,
          enabled: true
        }).select().single();
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
        enabled: threshold?.enabled ?? false
      };
    });
  };
  const getDeviceCameras = (deviceId: string) => {
    return cameras.filter(c => c.device_id === deviceId);
  };
  const getEnabledThresholdCount = (deviceId: string) => {
    return thresholds.filter(t => t.device_id === deviceId && t.enabled).length;
  };
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) || device.device_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSite = filterSite === 'all' || device.site_id === filterSite;
      return matchesSearch && matchesSite;
    });
  }, [devices, searchQuery, filterSite]);
  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    cameras: cameras.length,
    alarms: thresholds.filter(t => t.enabled).length
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>;
  }
  return <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">設備管理</h1>
          <p className="text-sm text-muted-foreground">整合監控設備、感測器、攝影機和警報設定</p>
        </div>
        <Button onClick={() => setIsAddDeviceOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新增設備
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Monitor className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">總設備</p>
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
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Camera className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cameras}</p>
                <p className="text-xs text-muted-foreground">攝影機</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-transparent border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Bell className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.alarms}</p>
                <p className="text-xs text-muted-foreground">警報啟用</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜尋設備名稱或ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSite} onValueChange={setFilterSite}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="篩選工地" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部工地</SelectItem>
            {sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Device List */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-4">
          {filteredDevices.map(device => {
          const isExpanded = expandedDevices.has(device.id);
          const deviceCameras = getDeviceCameras(device.id);
          const deviceThresholds = getDeviceThresholds(device.device_id);
          const enabledAlarms = getEnabledThresholdCount(device.device_id);
          return <Card key={device.id} className={`transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary/30' : 'hover:shadow-lg'}`}>
                {/* Device Header */}
                <div className="p-4 cursor-pointer" onClick={() => toggleDeviceExpanded(device.id)}>
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={`p-3 rounded-xl ${STATUS_CONFIG[device.status as DeviceStatus]?.bgClass || 'bg-muted'}`}>
                      <Monitor className={`w-6 h-6 ${getStatusIconClass(device.status as DeviceStatus)}`} />
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{device.name}</h3>
                        <Badge className={getStatusBadgeClass(device.status as DeviceStatus)}>
                          {getStatusLabel(device.status as DeviceStatus, true)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-mono">{device.device_id}</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {getCompanyName(device.company_id)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Factory className="w-3.5 h-3.5" />
                          {getSiteName(device.site_id)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="hidden md:flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Battery className="w-4 h-4 text-muted-foreground" />
                        <span>{device.battery || 0}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Signal className="w-4 h-4 text-muted-foreground" />
                        <span>{device.signal_strength || 0}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Video className="w-4 h-4 text-blue-500" />
                        <span>{deviceCameras.length}</span>
                      </div>
                      {enabledAlarms > 0 && <Badge variant="outline" className="border-warning text-warning">
                          <Bell className="w-3 h-3 mr-1" />
                          {enabledAlarms}
                        </Badge>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => setEditingDevice(device)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            編輯設備
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                        setSelectedDeviceForCamera(device.id);
                        setIsAddCameraOpen(true);
                      }}>
                            <Camera className="w-4 h-4 mr-2" />
                            新增攝影機
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteDevice(device.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            刪除設備
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && <div className="border-t border-border">
                    <Tabs defaultValue="sensors" className="w-full">
                      <div className="px-4 pt-3">
                        <TabsList className="bg-muted/50">
                          <TabsTrigger value="sensors" className="gap-1.5 text-sm">
                            <Thermometer className="w-4 h-4" />
                            感測器警報
                          </TabsTrigger>
                          <TabsTrigger value="cameras" className="gap-1.5 text-sm">
                            <Camera className="w-4 h-4" />
                            攝影機 ({deviceCameras.length})
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      {/* Sensors Tab */}
                      <TabsContent value="sensors" className="px-4 pb-4 mt-0">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-3">
                          {deviceThresholds.map(metric => {
                      const MetricIcon = metric.icon;
                      const isSaving = savingThresholds.has(`${device.device_id}-${metric.key}`);
                      return <Card key={metric.key} className={`relative overflow-hidden transition-all ${metric.enabled ? `${metric.borderColor} border-2 shadow-sm` : 'border-border'}`}>
                                <CardContent className="p-3 space-y-2">
                                  {/* Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1.5 rounded-md ${metric.bgColor}`}>
                                        <MetricIcon className={`w-4 h-4 ${metric.color}`} />
                                      </div>
                                      <span className="font-medium text-sm">{metric.label}</span>
                                    </div>
                                    <Switch checked={metric.enabled} onCheckedChange={checked => handleToggleThreshold(device.device_id, metric.key, checked)} disabled={isSaving} />
                                  </div>

                                  {/* Value Input */}
                                  <div className="flex items-center gap-2">
                                    <Input type="number" value={metric.value} onChange={e => {
                              const newValue = parseFloat(e.target.value);
                              if (!isNaN(newValue)) {
                                setThresholds(prev => {
                                  const existing = prev.find(t => t.device_id === device.device_id && t.metric_type === metric.key);
                                  if (existing) {
                                    return prev.map(t => t.id === existing.id ? {
                                      ...t,
                                      threshold_value: newValue
                                    } : t);
                                  }
                                  return prev;
                                });
                              }
                            }} onBlur={e => {
                              const newValue = parseFloat(e.target.value);
                              if (!isNaN(newValue) && newValue !== metric.threshold?.threshold_value) {
                                handleUpdateThresholdValue(device.device_id, metric.key, newValue);
                              }
                            }} className="h-8 text-center" disabled={isSaving} />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[40px]">{metric.unit}</span>
                                  </div>

                                  {/* Status */}
                                  {metric.enabled && <div className="flex items-center gap-1 text-xs text-warning">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>超過閾值將觸發警報</span>
                                    </div>}

                                  {/* Loading */}
                                  {isSaving && <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                    </div>}
                                </CardContent>
                              </Card>;
                    })}
                        </div>
                      </TabsContent>

                      {/* Cameras Tab */}
                      <TabsContent value="cameras" className="px-4 pb-4 mt-0">
                        <div className="pt-3">
                          {deviceCameras.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>尚未設定攝影機</p>
                              <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                        setSelectedDeviceForCamera(device.id);
                        setIsAddCameraOpen(true);
                      }}>
                                <Plus className="w-4 h-4 mr-1" />
                                新增攝影機
                              </Button>
                            </div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {deviceCameras.map(camera => {
                        const CamIcon = getCameraIcon(camera.icon_type);
                        const cameraType = CAMERA_ICON_TYPES.find(t => t.value === camera.icon_type);
                        return <Card key={camera.id} className={`transition-all ${camera.is_active ? 'border-success/30' : 'opacity-60'}`}>
                                    <CardContent className="p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className={`p-1.5 rounded-md ${camera.is_active ? 'bg-success/20' : 'bg-muted'}`}>
                                            <CamIcon className={`w-4 h-4 ${camera.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                                          </div>
                                          <div>
                                            <h4 className="font-medium text-sm">{camera.name}</h4>
                                            <p className="text-xs text-muted-foreground">{cameraType?.label || camera.icon_type}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Switch checked={camera.is_active} onCheckedChange={checked => handleToggleCameraActive(camera.id, checked)} />
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCamera(camera.id)}>
                                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs bg-muted/50 p-2 rounded">
                                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate font-mono">{camera.stream_url}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 ml-auto" asChild>
                                          <a href={camera.stream_url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>;
                      })}
                              {/* Add Camera Button */}
                              <Card className="border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all" onClick={() => {
                        setSelectedDeviceForCamera(device.id);
                        setIsAddCameraOpen(true);
                      }}>
                                <CardContent className="p-3 flex items-center justify-center h-full min-h-[100px]">
                                  <div className="text-center text-muted-foreground">
                                    <Plus className="w-6 h-6 mx-auto mb-1" />
                                    <span className="text-sm">新增攝影機</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>}
              </Card>;
        })}
        </div>
      </ScrollArea>

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
              <Select value={newDevice.company_id} onValueChange={v => setNewDevice(prev => ({
              ...prev,
              company_id: v,
              site_id: ''
            }))}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇公司" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {newDevice.company_id && <div className="space-y-2">
                <Label>隸屬工地 *</Label>
                <Select value={newDevice.site_id} onValueChange={v => setNewDevice(prev => ({
              ...prev,
              site_id: v
            }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇工地" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSitesForNewDevice.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            {newDevice.site_id && <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>設備 ID *</Label>
                    <Input placeholder="DEV-001" value={newDevice.device_id} onChange={e => setNewDevice(prev => ({
                  ...prev,
                  device_id: e.target.value
                }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>設備名稱 *</Label>
                    <Input placeholder="設備名稱" value={newDevice.name} onChange={e => setNewDevice(prev => ({
                  ...prev,
                  name: e.target.value
                }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>安裝位置</Label>
                  <Input placeholder="安裝位置描述" value={newDevice.location} onChange={e => setNewDevice(prev => ({
                ...prev,
                location: e.target.value
              }))} />
                </div>
                <div className="space-y-2">
                  <Label>MQTT Topic</Label>
                  <Input placeholder="devices/dev-001" value={newDevice.mqtt_topic} onChange={e => setNewDevice(prev => ({
                ...prev,
                mqtt_topic: e.target.value
              }))} />
                </div>
              </div>}
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
          {editingDevice && <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>設備名稱</Label>
                <Input value={editingDevice.name} onChange={e => setEditingDevice(prev => prev ? {
              ...prev,
              name: e.target.value
            } : null)} />
              </div>
              <div className="space-y-2">
                <Label>安裝位置</Label>
                <Input value={editingDevice.location || ''} onChange={e => setEditingDevice(prev => prev ? {
              ...prev,
              location: e.target.value
            } : null)} />
              </div>
              <div className="space-y-2">
                <Label>MQTT Topic</Label>
                <Input value={editingDevice.mqtt_topic || ''} onChange={e => setEditingDevice(prev => prev ? {
              ...prev,
              mqtt_topic: e.target.value
            } : null)} />
              </div>
            </div>}
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
            <DialogDescription>
              設定攝影機串流來源 (支援 RTSP、HTTP 串流或快照)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedDeviceForCamera && <div className="space-y-2">
                <Label>關聯設備 *</Label>
                <Select value={selectedDeviceForCamera} onValueChange={setSelectedDeviceForCamera}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇設備" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}
            <div className="space-y-2">
              <Label>攝影機名稱 *</Label>
              <Input placeholder="攝影機名稱" value={newCamera.name} onChange={e => setNewCamera(prev => ({
              ...prev,
              name: e.target.value
            }))} />
            </div>
            <div className="space-y-2">
              <Label>串流類型 *</Label>
              <Select value={newCamera.icon_type} onValueChange={v => setNewCamera(prev => ({
              ...prev,
              icon_type: v
            }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_ICON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.Icon className="w-4 h-4" />
                        {t.label}
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>串流網址 *</Label>
              <Input placeholder={newCamera.icon_type === 'rtsp' ? 'rtsp://...' : newCamera.icon_type === 'http' ? 'http://...' : 'https://...'} value={newCamera.stream_url} onChange={e => setNewCamera(prev => ({
              ...prev,
              stream_url: e.target.value
            }))} />
              <p className="text-xs text-muted-foreground">
                {newCamera.icon_type === 'rtsp' && '範例: rtsp://admin:password@192.168.1.100:554/stream'}
                {newCamera.icon_type === 'http' && '範例: http://192.168.1.100:8080/video'}
                {newCamera.icon_type === 'snapshot' && '範例: http://192.168.1.100/snapshot.jpg'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setIsAddCameraOpen(false);
            setSelectedDeviceForCamera('');
          }}>取消</Button>
            <Button onClick={handleAddCamera} disabled={!selectedDeviceForCamera || !newCamera.name || !newCamera.stream_url}>
              新增攝影機
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default DeviceManagementPage;