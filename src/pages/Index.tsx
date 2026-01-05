import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Search, Bell, Menu, Settings, BarChart3, History, LayoutDashboard, MapPin } from 'lucide-react';
import DeviceCard from '@/components/DeviceCard';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAlarmMonitor } from '@/hooks/useAlarmMonitor';
import { supabase } from '@/integrations/supabase/client';
import cctvNeihu from '@/assets/cctv-neihu.jpg';
import cctvXinzhuang from '@/assets/cctv-xinzhuang.jpg';
import cctvBanqiao from '@/assets/cctv-banqiao.jpg';
import cctvXindian from '@/assets/cctv-xindian.jpg';
import cctvSongshan from '@/assets/cctv-songshan.jpg';

// Lazy load heavy components
const Map = lazy(() => import('@/components/Map'));
const DeviceDetails = lazy(() => import('@/components/DeviceDetails'));
const NotificationSettings = lazy(() => import('@/components/NotificationSettings'));
const DeviceManagement = lazy(() => import('@/components/DeviceManagement'));
const TrendChartsMenu = lazy(() => import('@/components/TrendChartsMenu'));

const cctvImages: Record<string, string> = {
  'DEV-001': cctvNeihu,
  'DEV-002': cctvXinzhuang,
  'DEV-003': cctvBanqiao,
  'DEV-004': cctvXindian,
  'DEV-005': cctvSongshan,
};

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  battery: number;
  signal: number;
  status: 'online' | 'offline';
  location: string;
  cctvImage: string;
}

// Loading fallback for components
const ComponentLoader = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="animate-pulse text-muted-foreground">載入中...</div>
  </div>
);

const Index = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showDeviceManagement, setShowDeviceManagement] = useState(false);
  const [showTrendCharts, setShowTrendCharts] = useState(false);
  const apiKey = 'AIzaSyCPvsAfPyv9yhjaJDwD5SnkYiuQY9WkIYk';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAlarms, setActiveAlarms] = useState<number>(0);

  const fetchDevices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedDevices: Device[] = (data || []).map(d => ({
        id: d.device_id,
        name: d.name,
        lat: Number(d.lat),
        lng: Number(d.lng),
        battery: d.battery || 0,
        signal: d.signal_strength || 0,
        status: d.status === 'online' ? 'online' : 'offline',
        location: d.location || '',
        cctvImage: cctvImages[d.device_id] || cctvNeihu,
      }));

      setDevices(mappedDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();

    const channel = supabase
      .channel('devices-index-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        fetchDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDevices]);

  const handleAlarmTriggered = useCallback((violations: { device_id: string }[]) => {
    setActiveAlarms(violations.length);
  }, []);

  const { checkAlarms } = useAlarmMonitor({
    enabled: true,
    checkInterval: 60000,
    onAlarmTriggered: handleAlarmTriggered,
  });

  const selectedDeviceData = devices.find(d => d.id === selectedDevice) || null;

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
  };

  const handleDeviceClick = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setSidebarOpen(false);
  };

  const handleDeviceDoubleClick = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setShowDetails(true);
  };

  const DeviceList = () => (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋設備..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">載入中...</div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? '找不到符合的設備' : '尚無設備，請至設備管理新增'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                {...device}
                isSelected={selectedDevice === device.id}
                onClick={() => handleDeviceClick(device.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-semibold">設備列表</h2>
                  </div>
                  <DeviceList />
                </SheetContent>
              </Sheet>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Monitor className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="hidden xs:block">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">監控儀表板</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">即時設備監控系統</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              <ThemeToggle />

              <Link to="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">儀表板</span>
                </Button>
              </Link>

              <Link to="/map-login">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">電子地圖</span>
                </Button>
              </Link>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrendCharts(true)}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">趨勢圖</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeviceManagement(true)}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">設備管理</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotificationSettings(true)}
                className="gap-1 sm:gap-2 px-2 sm:px-3 relative"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">通知設定</span>
                {activeAlarms > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse"
                  >
                    {activeAlarms}
                  </Badge>
                )}
              </Button>

              <Link to="/alarm-history">
                <Button
                  variant="outline"
                  size="sm"
                  title="警報歷史紀錄"
                  className="gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">警報歷史</span>
                </Button>
              </Link>


              <div className="text-right pl-2 border-l border-border">
                <div className="text-xs text-muted-foreground hidden sm:block">在線設備</div>
                <div className="text-lg sm:text-xl font-bold text-success">
                  {devices.filter(d => d.status === 'online').length}/{devices.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)] sm:h-[calc(100vh-81px)]">
        <aside className="hidden lg:block w-80 border-r border-border bg-card">
          <DeviceList />
        </aside>

        <main className="flex-1 relative">
          <div className="h-full p-2 sm:p-4">
            <Suspense fallback={<ComponentLoader />}>
              <Map
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
                onDeviceClick={handleDeviceClick}
                onDeviceDoubleClick={handleDeviceDoubleClick}
                apiKey={apiKey}
              />
            </Suspense>
          </div>

          {showDetails && (
            <Suspense fallback={<ComponentLoader />}>
              <DeviceDetails
                device={selectedDeviceData}
                onClose={() => setShowDetails(false)}
              />
            </Suspense>
          )}

          {showNotificationSettings && (
            <Suspense fallback={<ComponentLoader />}>
              <NotificationSettings
                onClose={() => setShowNotificationSettings(false)}
              />
            </Suspense>
          )}

          {showDeviceManagement && (
            <Suspense fallback={<ComponentLoader />}>
              <DeviceManagement
                onClose={() => setShowDeviceManagement(false)}
              />
            </Suspense>
          )}

          {showTrendCharts && (
            <Suspense fallback={<ComponentLoader />}>
              <TrendChartsMenu
                onClose={() => setShowTrendCharts(false)}
              />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
