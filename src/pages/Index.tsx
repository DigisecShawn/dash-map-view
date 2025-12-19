import { useState } from 'react';
import { Monitor, Search, Key, Bell, Menu, Settings, BarChart3 } from 'lucide-react';
import Map from '@/components/Map';
import DeviceCard from '@/components/DeviceCard';
import DeviceDetails from '@/components/DeviceDetails';
import NotificationSettings from '@/components/NotificationSettings';
import DeviceManagement from '@/components/DeviceManagement';
import TrendChartsMenu from '@/components/TrendChartsMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import cctvNeihu from '@/assets/cctv-neihu.jpg';
import cctvXinzhuang from '@/assets/cctv-xinzhuang.jpg';
import cctvBanqiao from '@/assets/cctv-banqiao.jpg';
import cctvXindian from '@/assets/cctv-xindian.jpg';
import cctvSongshan from '@/assets/cctv-songshan.jpg';

// Mock data for devices - 使用台灣真實座標
const mockDevices = [
  {
    id: 'CAM-001',
    name: '內湖汙水廠工地',
    lat: 25.0330,
    lng: 121.5654,
    battery: 85,
    signal: 92,
    status: 'online' as const,
    location: '台北市內湖區',
    cctvImage: cctvNeihu,
  },
  {
    id: 'CAM-002',
    name: '新莊土地重劃工地',
    lat: 25.0478,
    lng: 121.5318,
    battery: 45,
    signal: 78,
    status: 'online' as const,
    location: '新北市新莊區',
    cctvImage: cctvXinzhuang,
  },
  {
    id: 'CAM-003',
    name: '板橋車站雙子星工地',
    lat: 25.0175,
    lng: 121.4627,
    battery: 92,
    signal: 65,
    status: 'online' as const,
    location: '新北市板橋區',
    cctvImage: cctvBanqiao,
  },
  {
    id: 'CAM-004',
    name: '新店道路拓寬工地',
    lat: 24.9917,
    lng: 121.5417,
    battery: 28,
    signal: 45,
    status: 'offline' as const,
    location: '新北市新店區',
    cctvImage: cctvXindian,
  },
  {
    id: 'CAM-005',
    name: '松山捷運站新建工地',
    lat: 25.0853,
    lng: 121.5606,
    battery: 67,
    signal: 88,
    status: 'online' as const,
    location: '台北市松山區',
    cctvImage: cctvSongshan,
  },
];

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

const Index = () => {
  const [devices, setDevices] = useState<Device[]>(mockDevices.map(d => ({ ...d })));
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showDeviceManagement, setShowDeviceManagement] = useState(false);
  const [showTrendCharts, setShowTrendCharts] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);


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
    setShowDetails(true);
    setSidebarOpen(false);
  };

  const handleApiKeySubmit = () => {
    setApiKey(tempApiKey);
    setShowApiKeyInput(false);
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
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Menu Button */}
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

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              <ThemeToggle />
              
              {/* Trend Charts Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrendCharts(true)}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">趨勢圖</span>
              </Button>

              {/* Device Management Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeviceManagement(true)}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">設備管理</span>
              </Button>

              {/* Notification Button - Icon only on mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotificationSettings(true)}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">通知設定</span>
              </Button>

              {/* API Key Button - Hidden on mobile */}
              {apiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeyInput(true)}
                  className="gap-2 hidden md:flex"
                >
                  <Key className="w-4 h-4" />
                  <span className="hidden lg:inline">更改 API Key</span>
                </Button>
              )}

              {/* Online Status */}
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

      {/* API Key Input Modal */}
      {showApiKeyInput && !apiKey && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-4 sm:p-6 bg-card shadow-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Google Maps API Key</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">需要 API Key 來顯示地圖</p>
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

      <div className="flex h-[calc(100vh-65px)] sm:h-[calc(100vh-81px)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-80 border-r border-border bg-card">
          <DeviceList />
        </aside>

        {/* Main Content - Map */}
        <main className="flex-1 relative">
          <div className="h-full p-2 sm:p-4">
            <Map
              devices={devices}
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
              onDeviceClick={handleDeviceClick}
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

          {/* Notification Settings Modal */}
          {showNotificationSettings && (
            <NotificationSettings
              onClose={() => setShowNotificationSettings(false)}
            />
          )}

          {/* Device Management Modal */}
          {showDeviceManagement && (
            <DeviceManagement
              onClose={() => setShowDeviceManagement(false)}
            />
          )}

          {/* Trend Charts Modal */}
          {showTrendCharts && (
            <TrendChartsMenu
              onClose={() => setShowTrendCharts(false)}
            />
          )}

        </main>
      </div>
    </div>
  );
};

export default Index;
