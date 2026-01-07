import { useState, useCallback, useEffect } from 'react';
import { Search, Menu } from 'lucide-react';
import LeafletMap from '@/components/LeafletMap';
import DeviceCard from '@/components/DeviceCard';
import DeviceDetails from '@/components/DeviceDetails';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAlarmMonitor } from '@/hooks/useAlarmMonitor';
import { supabase } from '@/integrations/supabase/client';
import cctvNeihu from '@/assets/cctv-neihu.jpg';
import cctvXinzhuang from '@/assets/cctv-xinzhuang.jpg';
import cctvBanqiao from '@/assets/cctv-banqiao.jpg';
import cctvXindian from '@/assets/cctv-xindian.jpg';
import cctvSongshan from '@/assets/cctv-songshan.jpg';

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

const MapPage = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      .channel('devices-map-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        fetchDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDevices]);

  useAlarmMonitor({
    enabled: true,
    checkInterval: 60000,
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
            {searchQuery ? '找不到符合的設備' : '尚無設備'}
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
    <div className="h-screen flex" style={{ height: '100vh' }}>
      {/* Mobile sidebar trigger */}
      <div className="lg:hidden absolute top-4 left-4 z-10">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="shadow-lg">
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
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-80 border-r border-border bg-card shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">設備列表</h2>
        </div>
        <DeviceList />
      </aside>

      {/* Map area */}
      <main className="flex-1 relative h-full overflow-hidden">
        <LeafletMap
          devices={devices}
          selectedDevice={selectedDevice}
          onDeviceSelect={handleDeviceSelect}
          onDeviceClick={handleDeviceClick}
          onDeviceDoubleClick={handleDeviceDoubleClick}
        />

        {showDetails && (
          <DeviceDetails
            device={selectedDeviceData}
            onClose={() => setShowDetails(false)}
          />
        )}
      </main>

      {/* Status bar */}
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">在線設備:</span>
          <span className="font-bold text-success">
            {devices.filter(d => d.status === 'online').length}/{devices.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
