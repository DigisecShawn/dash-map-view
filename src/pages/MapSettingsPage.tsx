import { useState, useEffect } from 'react';
import { MapPin, Settings, Save, ExternalLink, Check, AlertCircle, ZoomIn, Move } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface MapProvider {
  id: string;
  name: string;
  description: string;
  docUrl: string;
  tileUrl: string;
}

const mapProviders: MapProvider[] = [
  {
    id: 'leaflet-osm',
    name: 'Leaflet + OpenStreetMap',
    description: '開源地圖函式庫搭配 OpenStreetMap 圖資，免費且高度客製化',
    docUrl: 'https://leafletjs.com/reference.html',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap (OSM)',
    description: '純開源社群維護的免費地圖服務，無需 API 金鑰',
    docUrl: 'https://wiki.openstreetmap.org/wiki/API',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
];

interface MapConfig {
  provider: string;
  defaultZoom: number;
  centerLat: number;
  centerLng: number;
  updatedAt?: string;
}

const defaultConfig: MapConfig = {
  provider: 'leaflet-osm',
  defaultZoom: 12,
  centerLat: 25.033,
  centerLng: 121.5654,
};

const MapSettingsPage = () => {
  const [config, setConfig] = useState<MapConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState<MapConfig | null>(null);

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('map_config');
    if (saved) {
      const parsedConfig = JSON.parse(saved);
      setConfig({
        provider: parsedConfig.provider || defaultConfig.provider,
        defaultZoom: parsedConfig.defaultZoom || defaultConfig.defaultZoom,
        centerLat: parsedConfig.centerLat ?? defaultConfig.centerLat,
        centerLng: parsedConfig.centerLng ?? defaultConfig.centerLng,
      });
      setSavedConfig(parsedConfig);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const configToSave = {
        ...config,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('map_config', JSON.stringify(configToSave));
      setSavedConfig(configToSave);
      toast.success('地圖設定已儲存');
    } catch (error) {
      toast.error('儲存設定時發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  const currentProvider = mapProviders.find(p => p.id === config.provider);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            電子地圖設定
          </h1>
          <p className="text-muted-foreground mt-1">
            設定地圖服務提供商與預設檢視參數
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </div>

      {/* Current Status */}
      {savedConfig && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">
                目前使用：{mapProviders.find(p => p.id === savedConfig.provider)?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                預設縮放：{savedConfig.defaultZoom} | 中心座標：{savedConfig.centerLat?.toFixed(4)}, {savedConfig.centerLng?.toFixed(4)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              選擇地圖平台
            </CardTitle>
            <CardDescription>
              選擇您要使用的地圖服務提供商
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={config.provider}
              onValueChange={(value) => setConfig({ ...config, provider: value })}
              className="space-y-3"
            >
              {mapProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    config.provider === provider.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setConfig({ ...config, provider: provider.id })}
                >
                  <RadioGroupItem value={provider.id} id={provider.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={provider.id} className="font-medium cursor-pointer">
                      {provider.name}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {provider.description}
                    </p>
                    <a
                      href={provider.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      查看文件
                    </a>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  使用 OpenStreetMap 圖資無需 API 金鑰，完全免費開源
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Settings */}
        <div className="space-y-6">
          {/* Zoom Level */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ZoomIn className="w-5 h-5" />
                預設縮放層級
              </CardTitle>
              <CardDescription>
                設定地圖開啟時的預設縮放比例 (1-20)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.defaultZoom]}
                  onValueChange={(value) => setConfig({ ...config, defaultZoom: value[0] })}
                  min={1}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <div className="w-16 text-center">
                  <Badge variant="secondary" className="text-lg font-mono">
                    {config.defaultZoom}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 (世界)</span>
                <span>10 (城市)</span>
                <span>15 (街道)</span>
                <span>20 (建築)</span>
              </div>
            </CardContent>
          </Card>

          {/* Center Coordinates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Move className="w-5 h-5" />
                固定監看視窗
              </CardTitle>
              <CardDescription>
                設定地圖中心點座標 (預設檢視位置)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="centerLat">緯度 (Latitude)</Label>
                  <Input
                    id="centerLat"
                    type="number"
                    step="0.0001"
                    placeholder="25.033"
                    value={config.centerLat}
                    onChange={(e) => setConfig({ ...config, centerLat: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="centerLng">經度 (Longitude)</Label>
                  <Input
                    id="centerLng"
                    type="number"
                    step="0.0001"
                    placeholder="121.5654"
                    value={config.centerLng}
                    onChange={(e) => setConfig({ ...config, centerLng: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">快速設定</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: '台北', lat: 25.033, lng: 121.5654 },
                    { name: '新北', lat: 25.0169, lng: 121.4628 },
                    { name: '台中', lat: 24.1477, lng: 120.6736 },
                    { name: '高雄', lat: 22.6273, lng: 120.3014 },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => setConfig({ ...config, centerLat: preset.lat, centerLng: preset.lng })}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>提示：</strong>您可以在 Google Maps 上右鍵點擊任意位置，複製座標後貼上
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MapSettingsPage;
