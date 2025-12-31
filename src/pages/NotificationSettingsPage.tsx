import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Phone, Save, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const [lineConfig, setLineConfig] = useState({ channel_access_token: '', user_id: '' });
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
          const config = channel.config as Record<string, string>;
          switch (channel.channel) {
            case 'line':
              setLineConfig({
                channel_access_token: config.channel_access_token || '',
                user_id: config.user_id || '',
              });
              break;
            case 'email':
              setEmailConfig({
                api_key: config.api_key || '',
                from_email: config.from_email || '',
                to_email: config.to_email || '',
              });
              break;
            case 'sms':
              setSmsConfig({
                account_sid: config.account_sid || '',
                auth_token: config.auth_token || '',
                from_number: config.from_number || '',
                to_number: config.to_number || '',
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

  const handleSave = async (channelType: string, config: Record<string, string>) => {
    setSaving(true);
    try {
      const existing = channels.find(c => c.channel === channelType);
      
      if (existing) {
        const { error } = await supabase
          .from('notification_settings')
          .update({ config })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert({ channel: channelType, config, enabled: false });
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

  const handleTestNotification = async (channelType: string) => {
    toast.info(`正在發送 ${channelType} 測試通知...`);
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">通知設定</h1>
        <p className="text-muted-foreground">設定警報通知管道</p>
      </div>

      <Tabs defaultValue="line" className="space-y-4">
        <TabsList>
          <TabsTrigger value="line" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            LINE
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <Phone className="w-4 h-4" />
            SMS
          </TabsTrigger>
        </TabsList>

        {/* LINE Tab */}
        <TabsContent value="line">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">LINE 通知</CardTitle>
                  <CardDescription>透過 LINE 發送即時警報</CardDescription>
                </div>
                <Switch
                  checked={isChannelEnabled('line')}
                  onCheckedChange={checked => handleToggle('line', checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Channel Access Token</Label>
                <Input
                  type="password"
                  placeholder="輸入 LINE Channel Access Token"
                  value={lineConfig.channel_access_token}
                  onChange={e => setLineConfig(prev => ({ ...prev, channel_access_token: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  placeholder="輸入 LINE User ID"
                  value={lineConfig.user_id}
                  onChange={e => setLineConfig(prev => ({ ...prev, user_id: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleSave('line', lineConfig)} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  儲存
                </Button>
                <Button variant="outline" onClick={() => handleTestNotification('line')}>
                  <TestTube className="w-4 h-4 mr-2" />
                  測試
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Email 通知</CardTitle>
                  <CardDescription>透過 Email 發送警報</CardDescription>
                </div>
                <Switch
                  checked={isChannelEnabled('email')}
                  onCheckedChange={checked => handleToggle('email', checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key (Resend)</Label>
                <Input
                  type="password"
                  placeholder="輸入 Resend API Key"
                  value={emailConfig.api_key}
                  onChange={e => setEmailConfig(prev => ({ ...prev, api_key: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>寄件人 Email</Label>
                  <Input
                    type="email"
                    placeholder="noreply@example.com"
                    value={emailConfig.from_email}
                    onChange={e => setEmailConfig(prev => ({ ...prev, from_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>收件人 Email</Label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={emailConfig.to_email}
                    onChange={e => setEmailConfig(prev => ({ ...prev, to_email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleSave('email', emailConfig)} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  儲存
                </Button>
                <Button variant="outline" onClick={() => handleTestNotification('email')}>
                  <TestTube className="w-4 h-4 mr-2" />
                  測試
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">SMS 通知</CardTitle>
                  <CardDescription>透過簡訊發送警報 (Twilio)</CardDescription>
                </div>
                <Switch
                  checked={isChannelEnabled('sms')}
                  onCheckedChange={checked => handleToggle('sms', checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account SID</Label>
                  <Input
                    type="password"
                    placeholder="Twilio Account SID"
                    value={smsConfig.account_sid}
                    onChange={e => setSmsConfig(prev => ({ ...prev, account_sid: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Auth Token</Label>
                  <Input
                    type="password"
                    placeholder="Twilio Auth Token"
                    value={smsConfig.auth_token}
                    onChange={e => setSmsConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>發送號碼</Label>
                  <Input
                    placeholder="+1234567890"
                    value={smsConfig.from_number}
                    onChange={e => setSmsConfig(prev => ({ ...prev, from_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>接收號碼</Label>
                  <Input
                    placeholder="+0987654321"
                    value={smsConfig.to_number}
                    onChange={e => setSmsConfig(prev => ({ ...prev, to_number: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleSave('sms', smsConfig)} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  儲存
                </Button>
                <Button variant="outline" onClick={() => handleTestNotification('sms')}>
                  <TestTube className="w-4 h-4 mr-2" />
                  測試
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationSettingsPage;
