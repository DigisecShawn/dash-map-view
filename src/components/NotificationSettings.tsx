import { useState, useEffect } from 'react';
import { X, MessageSquare, Mail, Phone, Camera, Save, TestTube, Loader2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationConfig {
  line: {
    enabled: boolean;
    channelAccessToken: string;
    userId: string;
  };
  email: {
    enabled: boolean;
    recipients: string[];
    fromEmail: string;
  };
  sms: {
    enabled: boolean;
    phoneNumbers: string[];
    provider: string;
  };
}

interface NotificationSettingsProps {
  onClose: () => void;
}

const NotificationSettings = ({ onClose }: NotificationSettingsProps) => {
  const [config, setConfig] = useState<NotificationConfig>({
    line: { enabled: false, channelAccessToken: '', userId: '' },
    email: { enabled: false, recipients: [], fromEmail: '' },
    sms: { enabled: false, phoneNumbers: [], provider: 'twilio' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [newEmailRecipient, setNewEmailRecipient] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);

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
        const newConfig: NotificationConfig = {
          line: { enabled: false, channelAccessToken: '', userId: '' },
          email: { enabled: false, recipients: [], fromEmail: '' },
          sms: { enabled: false, phoneNumbers: [], provider: 'twilio' },
        };
        
        data.forEach((setting) => {
          const channel = setting.channel as keyof NotificationConfig;
          const settingConfig = setting.config as Record<string, unknown>;
          
          if (channel === 'line') {
            newConfig.line = {
              enabled: setting.enabled,
              channelAccessToken: (settingConfig.channelAccessToken as string) || '',
              userId: (settingConfig.userId as string) || '',
            };
          } else if (channel === 'email') {
            newConfig.email = {
              enabled: setting.enabled,
              recipients: (settingConfig.recipients as string[]) || [],
              fromEmail: (settingConfig.fromEmail as string) || '',
            };
          } else if (channel === 'sms') {
            newConfig.sms = {
              enabled: setting.enabled,
              phoneNumbers: (settingConfig.phoneNumbers as string[]) || [],
              provider: (settingConfig.provider as string) || 'twilio',
            };
          }
        });
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('無法載入通知設定');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          channel: 'line',
          enabled: config.line.enabled,
          config: {
            channelAccessToken: config.line.channelAccessToken,
            userId: config.line.userId,
          },
        },
        {
          channel: 'email',
          enabled: config.email.enabled,
          config: {
            recipients: config.email.recipients,
            fromEmail: config.email.fromEmail,
          },
        },
        {
          channel: 'sms',
          enabled: config.sms.enabled,
          config: {
            phoneNumbers: config.sms.phoneNumbers,
            provider: config.sms.provider,
          },
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('notification_settings')
          .update({ enabled: update.enabled, config: update.config })
          .eq('channel', update.channel);

        if (error) throw error;
      }

      toast.success('設定已儲存');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('儲存設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (channel: string) => {
    setTesting(channel);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          channel,
          message: '這是一則測試通知',
          deviceId: 'TEST-001',
          deviceName: '測試設備',
          includeScreenshot: false,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${channel.toUpperCase()} 測試通知發送成功`);
      } else {
        toast.error(data?.error || '測試通知發送失敗');
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      toast.error('測試通知發送失敗');
    } finally {
      setTesting(null);
    }
  };

  const addEmailRecipient = () => {
    if (newEmailRecipient && !config.email.recipients.includes(newEmailRecipient)) {
      setConfig({
        ...config,
        email: {
          ...config.email,
          recipients: [...config.email.recipients, newEmailRecipient],
        },
      });
      setNewEmailRecipient('');
    }
  };

  const removeEmailRecipient = (email: string) => {
    setConfig({
      ...config,
      email: {
        ...config.email,
        recipients: config.email.recipients.filter((r) => r !== email),
      },
    });
  };

  const addPhoneNumber = () => {
    if (newPhoneNumber && !config.sms.phoneNumbers.includes(newPhoneNumber)) {
      setConfig({
        ...config,
        sms: {
          ...config.sms,
          phoneNumbers: [...config.sms.phoneNumbers, newPhoneNumber],
        },
      });
      setNewPhoneNumber('');
    }
  };

  const removePhoneNumber = (phone: string) => {
    setConfig({
      ...config,
      sms: {
        ...config.sms,
        phoneNumbers: config.sms.phoneNumbers.filter((p) => p !== phone),
      },
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card shadow-glow">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-xl">通知平台設定</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          {/* Screenshot Settings */}
          <div className="mb-6 p-4 bg-secondary rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">包含 CCTV 截圖</p>
                  <p className="text-sm text-muted-foreground">異常通知時夾帶設備監控截圖</p>
                </div>
              </div>
              <Switch
                checked={includeScreenshot}
                onCheckedChange={setIncludeScreenshot}
              />
            </div>
          </div>

          <Tabs defaultValue="line" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
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

            {/* LINE Settings */}
            <TabsContent value="line" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div>
                  <p className="font-medium text-foreground">啟用 LINE 通知</p>
                  <p className="text-sm text-muted-foreground">透過 LINE Messaging API 發送通知</p>
                </div>
                <Switch
                  checked={config.line.enabled}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, line: { ...config.line, enabled: checked } })
                  }
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="channelAccessToken">Channel Access Token</Label>
                  <Input
                    id="channelAccessToken"
                    type="password"
                    placeholder="輸入 LINE Channel Access Token"
                    value={config.line.channelAccessToken}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        line: { ...config.line, channelAccessToken: e.target.value },
                      })
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    從 LINE Developers Console 取得
                  </p>
                </div>

                <div>
                  <Label htmlFor="lineUserId">User ID / Group ID</Label>
                  <Input
                    id="lineUserId"
                    placeholder="輸入接收通知的 User ID 或 Group ID"
                    value={config.line.userId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        line: { ...config.line, userId: e.target.value },
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => testNotification('line')}
                  disabled={!config.line.enabled || testing === 'line'}
                  className="w-full"
                >
                  {testing === 'line' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  發送測試通知
                </Button>
              </div>
            </TabsContent>

            {/* Email Settings */}
            <TabsContent value="email" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div>
                  <p className="font-medium text-foreground">啟用 Email 通知</p>
                  <p className="text-sm text-muted-foreground">透過電子郵件發送異常通知</p>
                </div>
                <Switch
                  checked={config.email.enabled}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, email: { ...config.email, enabled: checked } })
                  }
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="fromEmail">寄件者信箱</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="noreply@example.com"
                    value={config.email.fromEmail}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        email: { ...config.email, fromEmail: e.target.value },
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>收件者信箱</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="email"
                      placeholder="新增收件者信箱"
                      value={newEmailRecipient}
                      onChange={(e) => setNewEmailRecipient(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                    />
                    <Button onClick={addEmailRecipient} variant="secondary">
                      新增
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.email.recipients.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeEmailRecipient(email)}
                      >
                        {email} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => testNotification('email')}
                  disabled={!config.email.enabled || testing === 'email'}
                  className="w-full"
                >
                  {testing === 'email' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  發送測試通知
                </Button>
              </div>
            </TabsContent>

            {/* SMS Settings */}
            <TabsContent value="sms" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div>
                  <p className="font-medium text-foreground">啟用 SMS 通知</p>
                  <p className="text-sm text-muted-foreground">透過簡訊發送緊急異常通知</p>
                </div>
                <Switch
                  checked={config.sms.enabled}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, sms: { ...config.sms, enabled: checked } })
                  }
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label>接收電話號碼</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="tel"
                      placeholder="+886912345678"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addPhoneNumber()}
                    />
                    <Button onClick={addPhoneNumber} variant="secondary">
                      新增
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.sms.phoneNumbers.map((phone) => (
                      <Badge
                        key={phone}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removePhoneNumber(phone)}
                      >
                        {phone} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => testNotification('sms')}
                  disabled={!config.sms.enabled || testing === 'sms'}
                  className="w-full"
                >
                  {testing === 'sms' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  發送測試通知
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="mt-6 pt-6 border-t border-border">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              儲存設定
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
