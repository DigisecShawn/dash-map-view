import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Phone, Save, TestTube, CheckCircle, XCircle, Settings, Shield, Zap, Camera, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NotificationChannel {
  id: string;
  channel: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

const NotificationSettingsPage = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const [lineConfig, setLineConfig] = useState({ 
    channel_access_token: '', 
    user_id: '',
    custom_message: '⚠️ 警報通知\n設備：{device_name}\n訊息：{message}\n時間：{timestamp}',
    include_screenshot: false,
  });
  const [emailConfig, setEmailConfig] = useState({ api_key: '', from_email: '', to_email: '' });
  const [smsConfig, setSmsConfig] = useState({ account_sid: '', auth_token: '', from_number: '', to_number: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*');

      if (error) throw error;

      if (data) {
        const mappedChannels = data.map(d => ({
          id: d.id,
          channel: d.channel,
          enabled: d.enabled,
          config: (d.config || {}) as Record<string, unknown>,
        }));
        setChannels(mappedChannels);
        
        mappedChannels.forEach(channel => {
          const config = channel.config as Record<string, unknown>;
          switch (channel.channel) {
            case 'line':
              setLineConfig({
                channel_access_token: (config.channel_access_token as string) || '',
                user_id: (config.user_id as string) || '',
                custom_message: (config.custom_message as string) || '⚠️ 警報通知\n設備：{device_name}\n訊息：{message}\n時間：{timestamp}',
                include_screenshot: (config.include_screenshot as boolean) || false,
              });
              break;
            case 'email':
              setEmailConfig({
                api_key: (config.api_key as string) || '',
                from_email: (config.from_email as string) || '',
                to_email: (config.to_email as string) || '',
              });
              break;
            case 'sms':
              setSmsConfig({
                account_sid: (config.account_sid as string) || '',
                auth_token: (config.auth_token as string) || '',
                from_number: (config.from_number as string) || '',
                to_number: (config.to_number as string) || '',
              });
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('載入設定失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (channelType: string, config: Record<string, string | boolean>) => {
    setSaving(true);
    try {
      const existing = channels.find(c => c.channel === channelType);
      
      if (existing) {
        const { error } = await supabase
          .from('notification_settings')
          .update({ config: JSON.parse(JSON.stringify(config)) })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert([{ channel: channelType, config: JSON.parse(JSON.stringify(config)), enabled: false }]);
        if (error) throw error;
      }

      toast.success('設定已儲存');
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('儲存設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (channelType: string, enabled: boolean) => {
    try {
      const existing = channels.find(c => c.channel === channelType);
      if (!existing) {
        toast.error('請先設定並儲存');
        return;
      }

      const { error } = await supabase
        .from('notification_settings')
        .update({ enabled })
        .eq('id', existing.id);

      if (error) throw error;

      setChannels(prev => prev.map(c => c.channel === channelType ? { ...c, enabled } : c));
      toast.success(enabled ? '已啟用通知' : '已停用通知');
    } catch (error) {
      console.error('Error toggling channel:', error);
      toast.error('更新失敗');
    }
  };

  const isChannelEnabled = (channelType: string) => {
    return channels.find(c => c.channel === channelType)?.enabled || false;
  };

  const isChannelConfigured = (channelType: string) => {
    return channels.find(c => c.channel === channelType) !== undefined;
  };

  const handleTestNotification = async (channelType: string) => {
    setTesting(channelType);
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          channel: channelType,
          message: '這是一則測試通知',
          device_name: '測試設備',
        },
      });

      if (error) throw error;
      toast.success('測試通知已發送');
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('發送測試通知失敗');
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const channelStats = {
    configured: [lineConfig.channel_access_token, emailConfig.api_key, smsConfig.account_sid].filter(Boolean).length,
    enabled: channels.filter(c => c.enabled).length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">通知設定</h1>
          <p className="text-sm text-muted-foreground">設定警報通知管道與接收人</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{channelStats.configured}</p>
                <p className="text-xs text-muted-foreground">已設定管道</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Zap className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{channelStats.enabled}</p>
                <p className="text-xs text-muted-foreground">已啟用</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground">可用管道</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LINE */}
        <Card className={`relative overflow-hidden transition-all ${isChannelEnabled('line') ? 'ring-2 ring-success/50' : ''}`}>
          <div className={`absolute top-0 left-0 right-0 h-1 ${isChannelEnabled('line') ? 'bg-success' : 'bg-muted'}`} />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/20">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">LINE 通知</CardTitle>
                  <CardDescription className="text-xs">即時推播通知</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isChannelConfigured('line') ? (
                  <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已設定
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="w-3 h-3 mr-1" />
                    未設定
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">啟用通知</span>
              <Switch
                checked={isChannelEnabled('line')}
                onCheckedChange={checked => handleToggle('line', checked)}
              />
            </div>
            
            <Separator />

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Channel Access Token</Label>
                <Input
                  type="password"
                  placeholder="輸入 Token"
                  value={lineConfig.channel_access_token}
                  onChange={e => setLineConfig(prev => ({ ...prev, channel_access_token: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">User ID</Label>
                <Input
                  placeholder="輸入 User ID"
                  value={lineConfig.user_id}
                  onChange={e => setLineConfig(prev => ({ ...prev, user_id: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              
              <Separator className="my-2" />
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label className="text-xs">自定義警報訊息</Label>
                </div>
                <Textarea
                  placeholder="輸入警報訊息範本"
                  value={lineConfig.custom_message}
                  onChange={e => setLineConfig(prev => ({ ...prev, custom_message: e.target.value }))}
                  className="text-sm min-h-[80px] resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  可用變數：{'{device_name}'} 設備名稱、{'{message}'} 警報訊息、{'{timestamp}'} 時間
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">附加攝影機截圖</span>
                    <p className="text-[10px] text-muted-foreground">警報時自動附加設備攝影機快照</p>
                  </div>
                </div>
                <Switch
                  checked={lineConfig.include_screenshot}
                  onCheckedChange={checked => setLineConfig(prev => ({ ...prev, include_screenshot: checked }))}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => handleSave('line', lineConfig)} disabled={saving} className="flex-1">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                儲存
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTestNotification('line')} disabled={testing === 'line'}>
                <TestTube className="w-3.5 h-3.5 mr-1.5" />
                測試
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card className={`relative overflow-hidden transition-all ${isChannelEnabled('email') ? 'ring-2 ring-success/50' : ''}`}>
          <div className={`absolute top-0 left-0 right-0 h-1 ${isChannelEnabled('email') ? 'bg-success' : 'bg-muted'}`} />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email 通知</CardTitle>
                  <CardDescription className="text-xs">電子郵件通知</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isChannelConfigured('email') ? (
                  <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已設定
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="w-3 h-3 mr-1" />
                    未設定
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">啟用通知</span>
              <Switch
                checked={isChannelEnabled('email')}
                onCheckedChange={checked => handleToggle('email', checked)}
              />
            </div>
            
            <Separator />

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">API Key (Resend)</Label>
                <Input
                  type="password"
                  placeholder="輸入 API Key"
                  value={emailConfig.api_key}
                  onChange={e => setEmailConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">寄件人 Email</Label>
                <Input
                  type="email"
                  placeholder="noreply@example.com"
                  value={emailConfig.from_email}
                  onChange={e => setEmailConfig(prev => ({ ...prev, from_email: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">收件人 Email</Label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={emailConfig.to_email}
                  onChange={e => setEmailConfig(prev => ({ ...prev, to_email: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => handleSave('email', emailConfig)} disabled={saving} className="flex-1">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                儲存
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTestNotification('email')} disabled={testing === 'email'}>
                <TestTube className="w-3.5 h-3.5 mr-1.5" />
                測試
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SMS */}
        <Card className={`relative overflow-hidden transition-all ${isChannelEnabled('sms') ? 'ring-2 ring-success/50' : ''}`}>
          <div className={`absolute top-0 left-0 right-0 h-1 ${isChannelEnabled('sms') ? 'bg-success' : 'bg-muted'}`} />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20">
                  <Phone className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">SMS 通知</CardTitle>
                  <CardDescription className="text-xs">簡訊通知 (Twilio)</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isChannelConfigured('sms') ? (
                  <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已設定
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="w-3 h-3 mr-1" />
                    未設定
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">啟用通知</span>
              <Switch
                checked={isChannelEnabled('sms')}
                onCheckedChange={checked => handleToggle('sms', checked)}
              />
            </div>
            
            <Separator />

            <div className="space-y-3">
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Account SID</Label>
                  <Input
                    type="password"
                    placeholder="SID"
                    value={smsConfig.account_sid}
                    onChange={e => setSmsConfig(prev => ({ ...prev, account_sid: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Auth Token</Label>
                  <Input
                    type="password"
                    placeholder="Token"
                    value={smsConfig.auth_token}
                    onChange={e => setSmsConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">發送號碼</Label>
                  <Input
                    placeholder="+1..."
                    value={smsConfig.from_number}
                    onChange={e => setSmsConfig(prev => ({ ...prev, from_number: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">接收號碼</Label>
                  <Input
                    placeholder="+886..."
                    value={smsConfig.to_number}
                    onChange={e => setSmsConfig(prev => ({ ...prev, to_number: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => handleSave('sms', smsConfig)} disabled={saving} className="flex-1">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                儲存
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTestNotification('sms')} disabled={testing === 'sms'}>
                <TestTube className="w-3.5 h-3.5 mr-1.5" />
                測試
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
