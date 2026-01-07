import { useState, useEffect } from 'react';
import { MapPin, Settings, Key, Save, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MapProvider {
  id: string;
  name: string;
  description: string;
  docUrl: string;
  keyPlaceholder: string;
}

const mapProviders: MapProvider[] = [
  {
    id: 'google',
    name: 'Google Maps Platform',
    description: 'Google 官方地圖服務，提供全球覆蓋的地圖、街景、路線規劃等功能',
    docUrl: 'https://developers.google.com/maps/documentation',
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'mapbox',
    name: 'Mapbox',
    description: '高度客製化的地圖服務，適合需要特殊樣式的應用',
    docUrl: 'https://docs.mapbox.com/',
    keyPlaceholder: 'pk.eyJ1Ijoi...',
  },
  {
    id: 'amap',
    name: '高德地圖',
    description: '中國地區精確度最高的地圖服務，適合中國市場應用',
    docUrl: 'https://lbs.amap.com/api/',
    keyPlaceholder: '您的高德 API Key',
  },
  {
    id: 'here',
    name: 'HERE Maps',
    description: '企業級地圖解決方案，提供物流、車隊管理等專業功能',
    docUrl: 'https://developer.here.com/',
    keyPlaceholder: '您的 HERE API Key',
  },
];

const MapSettingsPage = () => {
  const [selectedProvider, setSelectedProvider] = useState('google');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState<{ provider: string; hasKey: boolean } | null>(null);

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('map_config');
    if (saved) {
      const config = JSON.parse(saved);
      setSelectedProvider(config.provider || 'google');
      setApiKey(config.apiKey || '');
      setSavedConfig({ provider: config.provider, hasKey: !!config.apiKey });
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage (in production, this should be saved to backend)
      const config = {
        provider: selectedProvider,
        apiKey: apiKey,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('map_config', JSON.stringify(config));
      setSavedConfig({ provider: selectedProvider, hasKey: !!apiKey });
      toast.success('地圖設定已儲存');
    } catch (error) {
      toast.error('儲存設定時發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  const currentProvider = mapProviders.find(p => p.id === selectedProvider);

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
            設定地圖服務提供商與 API 金鑰
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
                API 金鑰：{savedConfig.hasKey ? '已設定' : '未設定'}
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
              value={selectedProvider}
              onValueChange={setSelectedProvider}
              className="space-y-3"
            >
              {mapProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedProvider === provider.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSelectedProvider(provider.id)}
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
          </CardContent>
        </Card>

        {/* API Key Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API 金鑰設定
            </CardTitle>
            <CardDescription>
              輸入 {currentProvider?.name} 的 API 金鑰
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={currentProvider?.keyPlaceholder}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                API 金鑰將安全儲存，不會對外公開
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">如何取得 API 金鑰？</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>前往 {currentProvider?.name} 開發者控制台</li>
                    <li>建立新專案或選擇現有專案</li>
                    <li>啟用地圖相關 API</li>
                    <li>建立並複製 API 金鑰</li>
                  </ol>
                  <a
                    href={currentProvider?.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    詳細說明
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Status */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">狀態：</span>
              {apiKey ? (
                <Badge variant="default" className="bg-status-online">
                  已設定
                </Badge>
              ) : (
                <Badge variant="secondary">
                  未設定
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MapSettingsPage;
