import { useState } from 'react';
import { Monitor, Search } from 'lucide-react';
import Map from '@/components/Map';
import DeviceCard from '@/components/DeviceCard';
import DeviceDetails from '@/components/DeviceDetails';
import { Input } from '@/components/ui/input';

// Mock data for devices
const mockDevices = [
  {
    id: 'CAM-001',
    name: '監視器 A',
    lat: 35,
    lng: 45,
    battery: 85,
    signal: 92,
    status: 'online' as const,
    location: '台北市信義區',
  },
  {
    id: 'CAM-002',
    name: '監視器 B',
    lat: 55,
    lng: 65,
    battery: 45,
    signal: 78,
    status: 'online' as const,
    location: '新北市板橋區',
  },
  {
    id: 'CAM-003',
    name: '監視器 C',
    lat: 65,
    lng: 30,
    battery: 92,
    signal: 65,
    status: 'online' as const,
    location: '桃園市中壢區',
  },
  {
    id: 'CAM-004',
    name: '監視器 D',
    lat: 40,
    lng: 70,
    battery: 28,
    signal: 45,
    status: 'offline' as const,
    location: '台中市西屯區',
  },
  {
    id: 'CAM-005',
    name: '監視器 E',
    lat: 50,
    lng: 40,
    battery: 67,
    signal: 88,
    status: 'online' as const,
    location: '高雄市前鎮區',
  },
];

const Index = () => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const selectedDeviceData = mockDevices.find(d => d.id === selectedDevice) || null;

  const filteredDevices = mockDevices.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
  };

  const handleDeviceClick = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setShowDetails(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">監控儀表板</h1>
                <p className="text-sm text-muted-foreground">即時設備監控系統</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">在線設備</div>
                <div className="text-xl font-bold text-success">
                  {mockDevices.filter(d => d.status === 'online').length}/{mockDevices.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-89px)]">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border bg-card overflow-y-auto">
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
          </div>
        </aside>

        {/* Main Content - Map */}
        <main className="flex-1 relative">
          <div className="h-full p-4">
            <Map
              devices={mockDevices}
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
            />
          </div>

          {/* Device Details Modal */}
          {showDetails && (
            <DeviceDetails
              device={selectedDeviceData}
              onClose={() => setShowDetails(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
