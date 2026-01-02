import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Phone, Save, TestTube, CheckCircle, XCircle, Camera, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [openChannels, setOpenChannels] = useState<string[]>(['line']);

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

  const toggleChannel = (channelId: string) => {
    setOpenChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const channelStats = {
    configured: [lineConfig.channel_access_token, emailConfig.api_key, smsConfig.account_sid].filter(Boolean).length,
    enabled: channels.filter(c => c.enabled).length,
  };

  const channelConfigs = [
    {
      id: 'line',
      name: 'LINE',
      description: '即時推播通知',
      icon: MessageSquare,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
      accentColor: 'border-l-green-500',
    },
    {
      id: 'email',
      name: 'Email',
      description: '電子郵件通知',
      icon: Mail,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      accentColor: 'border-l-blue-500',
    },
    {
      id: 'sms',
      name: 'SMS',
      description: '簡訊通知 (Twilio)',
      icon: Phone,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      accentColor: 'border-l-purple-500',
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            通知設定
          </h1>
          <p className="text-sm text-muted-foreground mt-1">管理警報通知管道與接收設定</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">{channelStats.configured}/3 已設定</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{channelStats.enabled} 已啟用</span>
          </div>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="space-y-3">
        {channelConfigs.map((channel) => {
          const Icon = channel.icon;
          const isOpen = openChannels.includes(channel.id);
          const isEnabled = isChannelEnabled(channel.id);
          const isConfigured = isChannelConfigured(channel.id);

          return (
            <Collapsible key={channel.id} open={isOpen} onOpenChange={() => toggleChannel(channel.id)}>
              <Card className={`border-l-4 ${channel.accentColor} ${isEnabled ? 'bg-card' : 'bg-muted/20'}`}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg ${channel.iconBg}`}>
                        <Icon className={`w-5 h-5 ${channel.iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{channel.name}</h3>
                          {isConfigured ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-0">
                              <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                              已設定
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-0">
                              <XCircle className="w-2.5 h-2.5 mr-0.5" />
                              未設定
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{channel.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={checked => handleToggle(channel.id, checked)}
                        />
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4 border-t border-border/50">
                    <div className="pt-4 space-y-4">
                      {/* LINE Config */}
                      {channel.id === 'line' && (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Channel Access Token</Label>
                              <Input
                                type="password"
                                placeholder="輸入 Token"
                                value={lineConfig.channel_access_token}
                                onChange={e => setLineConfig(prev => ({ ...prev, channel_access_token: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">User ID</Label>
                              <Input
                                placeholder="輸入 User ID"
                                value={lineConfig.user_id}
                                onChange={e => setLineConfig(prev => ({ ...prev, user_id: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              自定義警報訊息
                            </Label>
                            <Textarea
                              placeholder="輸入警報訊息範本"
                              value={lineConfig.custom_message}
                              onChange={e => setLineConfig(prev => ({ ...prev, custom_message: e.target.value }))}
                              className="min-h-[80px] resize-none text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              可用變數：{'{device_name}'} 設備名稱、{'{message}'} 警報訊息、{'{timestamp}'} 時間
                            </p>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                            <div className="flex items-center gap-2.5">
                              <Camera className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">附加攝影機截圖</p>
                                <p className="text-[10px] text-muted-foreground">警報時自動附加設備攝影機快照</p>
                              </div>
                            </div>
                            <Switch
                              checked={lineConfig.include_screenshot}
                              onCheckedChange={checked => setLineConfig(prev => ({ ...prev, include_screenshot: checked }))}
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={() => handleSave('line', lineConfig)} disabled={saving} className="flex-1">
                              <Save className="w-3.5 h-3.5 mr-1.5" />
                              儲存設定
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleTestNotification('line')} disabled={testing === 'line'}>
                              {testing === 'line' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5 mr-1.5" />}
                              測試
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Email Config */}
                      {channel.id === 'email' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">API Key (Resend)</Label>
                            <Input
                              type="password"
                              placeholder="輸入 API Key"
                              value={emailConfig.api_key}
                              onChange={e => setEmailConfig(prev => ({ ...prev, api_key: e.target.value }))}
                              className="h-9"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">寄件人 Email</Label>
                              <Input
                                type="email"
                                placeholder="noreply@example.com"
                                value={emailConfig.from_email}
                                onChange={e => setEmailConfig(prev => ({ ...prev, from_email: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">收件人 Email</Label>
                              <Input
                                type="email"
                                placeholder="admin@example.com"
                                value={emailConfig.to_email}
                                onChange={e => setEmailConfig(prev => ({ ...prev, to_email: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={() => handleSave('email', emailConfig)} disabled={saving} className="flex-1">
                              <Save className="w-3.5 h-3.5 mr-1.5" />
                              儲存設定
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleTestNotification('email')} disabled={testing === 'email'}>
                              {testing === 'email' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5 mr-1.5" />}
                              測試
                            </Button>
                          </div>
                        </>
                      )}

                      {/* SMS Config */}
                      {channel.id === 'sms' && (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Account SID</Label>
                              <Input
                                type="password"
                                placeholder="輸入 Account SID"
                                value={smsConfig.account_sid}
                                onChange={e => setSmsConfig(prev => ({ ...prev, account_sid: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Auth Token</Label>
                              <Input
                                type="password"
                                placeholder="輸入 Auth Token"
                                value={smsConfig.auth_token}
                                onChange={e => setSmsConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">發送號碼</Label>
                              <Input
                                placeholder="+1..."
                                value={smsConfig.from_number}
                                onChange={e => setSmsConfig(prev => ({ ...prev, from_number: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">接收號碼</Label>
                              <Input
                                placeholder="+886..."
                                value={smsConfig.to_number}
                                onChange={e => setSmsConfig(prev => ({ ...prev, to_number: e.target.value }))}
                                className="h-9"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={() => handleSave('sms', smsConfig)} disabled={saving} className="flex-1">
                              <Save className="w-3.5 h-3.5 mr-1.5" />
                              儲存設定
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleTestNotification('sms')} disabled={testing === 'sms'}>
                              {testing === 'sms' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5 mr-1.5" />}
                              測試
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        啟用通知管道前，請先完成設定並儲存
      </p>
    </div>
  );
};

export default NotificationSettingsPage;
