import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  channel: 'line' | 'email' | 'sms';
  message: string;
  deviceId: string;
  deviceName: string;
  screenshotUrl?: string;
  includeScreenshot?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { channel, message, deviceId, deviceName, screenshotUrl, includeScreenshot } = await req.json() as NotificationRequest;

    console.log(`Processing ${channel} notification for device ${deviceId}`);

    // Get channel settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('channel', channel)
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error(`無法取得 ${channel} 設定`);
    }

    if (!settings?.enabled) {
      return new Response(
        JSON.stringify({ success: false, error: `${channel} 通知未啟用` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = settings.config as Record<string, unknown>;
    let result: { success: boolean; error?: string };

    switch (channel) {
      case 'line':
        result = await sendLineNotification(config, message, deviceName, screenshotUrl, includeScreenshot);
        break;
      case 'email':
        result = await sendEmailNotification(config, message, deviceId, deviceName, screenshotUrl, includeScreenshot);
        break;
      case 'sms':
        result = await sendSmsNotification(config, message, deviceName);
        break;
      default:
        throw new Error('不支援的通知管道');
    }

    // Log the notification
    await supabase.from('notification_logs').insert({
      channel,
      device_id: deviceId,
      device_name: deviceName,
      message,
      screenshot_url: screenshotUrl,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendLineNotification(
  config: Record<string, unknown>,
  message: string,
  deviceName: string,
  screenshotUrl?: string,
  includeScreenshot?: boolean
): Promise<{ success: boolean; error?: string }> {
  const channelAccessToken = config.channelAccessToken as string;
  const userId = config.userId as string;

  if (!channelAccessToken || !userId) {
    return { success: false, error: 'LINE 設定不完整' };
  }

  const messages: Array<{ type: string; text?: string; originalContentUrl?: string; previewImageUrl?: string }> = [
    {
      type: 'text',
      text: `⚠️ 設備異常通知\n\n設備：${deviceName}\n\n${message}`,
    },
  ];

  if (includeScreenshot && screenshotUrl) {
    messages.push({
      type: 'image',
      originalContentUrl: screenshotUrl,
      previewImageUrl: screenshotUrl,
    });
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API error:', errorText);
      return { success: false, error: `LINE API 錯誤: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('LINE notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

async function sendEmailNotification(
  config: Record<string, unknown>,
  message: string,
  deviceId: string,
  deviceName: string,
  screenshotUrl?: string,
  includeScreenshot?: boolean
): Promise<{ success: boolean; error?: string }> {
  const recipients = config.recipients as string[];
  const fromEmail = config.fromEmail as string;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!recipients || recipients.length === 0) {
    return { success: false, error: '沒有設定收件者' };
  }

  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, simulating email send');
    return { success: true };
  }

  const screenshotHtml = includeScreenshot && screenshotUrl 
    ? `<p><img src="${screenshotUrl}" alt="CCTV Screenshot" style="max-width: 100%; height: auto;" /></p>`
    : '';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f97316, #fb923c); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">⚠️ 設備異常通知</h1>
      </div>
      <div style="padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
        <p><strong>設備 ID：</strong>${deviceId}</p>
        <p><strong>設備名稱：</strong>${deviceName}</p>
        <p><strong>異常訊息：</strong></p>
        <p style="background: #fee2e2; padding: 10px; border-radius: 4px; color: #dc2626;">${message}</p>
        ${screenshotHtml}
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
          此通知由監控系統自動發送
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail || 'onboarding@resend.dev',
        to: recipients,
        subject: `⚠️ 設備異常通知 - ${deviceName}`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', errorText);
      return { success: false, error: `Email 發送錯誤: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Email notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

async function sendSmsNotification(
  config: Record<string, unknown>,
  message: string,
  deviceName: string
): Promise<{ success: boolean; error?: string }> {
  const phoneNumbers = config.phoneNumbers as string[];
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!phoneNumbers || phoneNumbers.length === 0) {
    return { success: false, error: '沒有設定電話號碼' };
  }

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log('Twilio not configured, simulating SMS send');
    return { success: true };
  }

  const smsBody = `⚠️ 設備異常通知\n設備：${deviceName}\n${message}`;

  try {
    for (const phone of phoneNumbers) {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioPhoneNumber,
            Body: smsBody,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Twilio API error:', errorText);
        return { success: false, error: `SMS 發送錯誤: ${response.status}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('SMS notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
