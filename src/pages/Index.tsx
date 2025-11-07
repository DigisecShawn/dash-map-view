import { useState } from 'react';
import { Monitor, Search, Key } from 'lucide-react';
import Map from '@/components/Map';
import DeviceCard from '@/components/DeviceCard';
import DeviceDetails from '@/components/DeviceDetails';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Mock data for devices - 使用台灣真實座標
const mockDevices = [
  {
    id: 'CAM-001',
    name: '監視器 A',
    lat: 25.0330,
    lng: 121.5654,
    battery: 85,
    signal: 92,
    status: 'online' as const,
    location: '台北市信義區',
  },
  {
    id: 'CAM-002',
    name: '監視器 B',
    lat: 25.0478,
    lng: 121.5318,
    battery: 45,
    signal: 78,
    status: 'online' as const,
    location: '台北市中正區',
  },
  {
    id: 'CAM-003',
    name: '監視器 C',
    lat: 25.0175,
    lng: 121.4627,
    battery: 92,
    signal: 65,
    status: 'online' as const,
    location: '新北市板橋區',
  },
  {
    id: 'CAM-004',
    name: '監視器 D',
    lat: 24.9917,
    lng: 121.5417,
    battery: 28,
    signal: 45,
    status: 'offline' as const,
    location: '台北市文山區',
  },
  {
    id: 'CAM-005',
    name: '監視器 E',
    lat: 25.0853,
    lng: 121.5606,
    battery: 67,
    signal: 88,
    status: 'online' as const,
    location: '台北市士林區',
  },
];

const Index = () => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);

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

  const handleApiKeySubmit = () => {
    setApiKey(tempApiKey);
    setShowApiKeyInput(false);
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
              <ThemeToggle />
              {apiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeyInput(true)}
                  className="gap-2"
                >
                  <Key className="w-4 h-4" />
                  更改 API Key
                </Button>
              )}
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

      {/* API Key Input Modal */}
      {showApiKeyInput && !apiKey && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card shadow-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Google Maps API Key</h2>
                <p className="text-sm text-muted-foreground">需要 API Key 來顯示地圖</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  請輸入您的 Google Maps API Key
                </label>
                <Input
                  type="text"
                  placeholder="AIzaSy..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="bg-secondary p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>如何取得 API Key：</strong>
                </p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>前往 <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                  <li>建立專案並啟用 Maps JavaScript API</li>
                  <li>在「憑證」頁面建立 API 金鑰</li>
                  <li>複製 API 金鑰並貼上於此</li>
                </ol>
              </div>

              <Button
                onClick={handleApiKeySubmit}
                disabled={!tempApiKey.trim()}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                確認
              </Button>
            </div>
          </Card>
        </div>
      )}

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
              apiKey={apiKey}
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
