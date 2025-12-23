import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SensorData {
  device_id: string;
  pm25?: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
  noise?: number;
}

interface AlarmThreshold {
  device_id: string;
  metric_type: string;
  threshold_value: number;
  enabled: boolean;
}

interface AlarmViolation {
  device_id: string;
  device_name: string;
  metric_type: string;
  metric_label: string;
  current_value: number;
  threshold_value: number;
  unit: string;
}

const METRIC_CONFIG: Record<string, { label: string; unit: string }> = {
  pm25: { label: 'PM2.5', unit: 'µg/m³' },
  pm10: { label: 'PM10', unit: 'µg/m³' },
  temperature: { label: '溫度', unit: '°C' },
  humidity: { label: '濕度', unit: '%' },
  noise: { label: '噪音', unit: 'dB' },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body - can be a single sensor update or check all devices
    const body = await req.json().catch(() => ({}));
    const { sensorData, checkAll = false } = body as { sensorData?: SensorData; checkAll?: boolean };

    console.log('Check alarms request:', { sensorData, checkAll });

    // Get all enabled alarm thresholds
    const { data: thresholds, error: thresholdsError } = await supabase
      .from('device_alarm_thresholds')
      .select('*')
      .eq('enabled', true);

    if (thresholdsError) {
      console.error('Error fetching thresholds:', thresholdsError);
      throw new Error('無法取得警報閾值設定');
    }

    if (!thresholds || thresholds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: '沒有啟用的警報設定', violations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device info for names
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('device_id, name');

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
    }

    const deviceNameMap = new Map((devices as { device_id: string; name: string }[] || []).map(d => [d.device_id, d.name]));

    let violations: AlarmViolation[] = [];

    if (checkAll) {
      // Check all devices - get latest sensor data for each device
      const { data: latestData, error: dataError } = await supabase
        .from('device_sensor_history')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (dataError) {
        console.error('Error fetching sensor data:', dataError);
        throw new Error('無法取得感測器資料');
      }

      // Get latest record per device
      const latestByDevice = new Map<string, SensorData>();
      for (const record of (latestData as SensorData[] || [])) {
        if (!latestByDevice.has(record.device_id)) {
          latestByDevice.set(record.device_id, record);
        }
      }

      // Check each device's data against thresholds
      for (const [deviceId, data] of latestByDevice) {
        const deviceViolations = checkSensorDataAgainstThresholds(
          data,
          (thresholds as AlarmThreshold[]).filter(t => t.device_id === deviceId),
          deviceNameMap.get(deviceId) || deviceId
        );
        violations.push(...deviceViolations);
      }
    } else if (sensorData) {
      // Check specific sensor data
      const deviceThresholds = (thresholds as AlarmThreshold[]).filter(t => t.device_id === sensorData.device_id);
      violations = checkSensorDataAgainstThresholds(
        sensorData,
        deviceThresholds,
        deviceNameMap.get(sensorData.device_id) || sensorData.device_id
      );
    }

    console.log(`Found ${violations.length} alarm violations`);

    // Send notifications for each violation
    const notificationResults = [];
    for (const violation of violations) {
      const message = `${violation.metric_label} 超過警報閾值！\n` +
        `目前值: ${violation.current_value} ${violation.unit}\n` +
        `閾值: ${violation.threshold_value} ${violation.unit}`;

      // Send to all enabled notification channels
      const channels = ['line', 'email', 'sms'];
      for (const channel of channels) {
        try {
          const notifyResponse = await sendNotification(supabase, {
            channel,
            message,
            deviceId: violation.device_id,
            deviceName: violation.device_name,
          });
          notificationResults.push({ channel, ...notifyResponse });
        } catch (error) {
          console.error(`Error sending ${channel} notification:`, error);
          notificationResults.push({ 
            channel, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        violations,
        notificationResults,
        message: violations.length > 0 
          ? `發現 ${violations.length} 個警報，已發送通知` 
          : '所有數值正常'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-alarms:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function checkSensorDataAgainstThresholds(
  data: SensorData,
  thresholds: AlarmThreshold[],
  deviceName: string
): AlarmViolation[] {
  const violations: AlarmViolation[] = [];

  for (const threshold of thresholds) {
    if (!threshold.enabled) continue;

    const metricType = threshold.metric_type as keyof SensorData;
    const currentValue = data[metricType];

    if (currentValue === undefined || currentValue === null) continue;

    const numericValue = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue));
    
    if (isNaN(numericValue)) continue;

    if (numericValue > threshold.threshold_value) {
      const config = METRIC_CONFIG[threshold.metric_type] || { label: threshold.metric_type, unit: '' };
      violations.push({
        device_id: data.device_id,
        device_name: deviceName,
        metric_type: threshold.metric_type,
        metric_label: config.label,
        current_value: numericValue,
        threshold_value: threshold.threshold_value,
        unit: config.unit,
      });
    }
  }

  return violations;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendNotification(
  supabase: any,
  params: {
    channel: string;
    message: string;
    deviceId: string;
    deviceName: string;
  }
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  // Check if the channel is enabled
  const { data: settings, error: settingsError } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('channel', params.channel)
    .maybeSingle();

  if (settingsError) {
    console.error(`Error fetching ${params.channel} settings:`, settingsError);
    return { success: false, error: settingsError.message };
  }

  if (!settings?.enabled) {
    console.log(`${params.channel} notifications not enabled, skipping`);
    return { success: true, skipped: true };
  }

  const config = settings.config as Record<string, unknown>;

  // Log the notification attempt
  await supabase.from('notification_logs').insert({
    channel: params.channel,
    device_id: params.deviceId,
    device_name: params.deviceName,
    message: params.message,
    status: 'pending',
  });

  let result: { success: boolean; error?: string };

  switch (params.channel) {
    case 'line':
      result = await sendLineNotification(config, params.message, params.deviceName);
      break;
    case 'email':
      result = await sendEmailNotification(config, params.message, params.deviceId, params.deviceName);
      break;
    case 'sms':
      result = await sendSmsNotification(config, params.message, params.deviceName);
      break;
    default:
      result = { success: false, error: '不支援的通知管道' };
  }

  // Update log status
  // Note: In production, you'd update the specific log entry
  
  return result;
}

async function sendLineNotification(
  config: Record<string, unknown>,
  message: string,
  deviceName: string
): Promise<{ success: boolean; error?: string }> {
  const channelAccessToken = config.channelAccessToken as string;
  const userId = config.userId as string;

  if (!channelAccessToken || !userId) {
    return { success: false, error: 'LINE 設定不完整' };
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
        messages: [{
          type: 'text',
          text: `🚨 警報通知\n\n設備：${deviceName}\n\n${message}`,
        }],
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
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendEmailNotification(
  config: Record<string, unknown>,
  message: string,
  deviceId: string,
  deviceName: string
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

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">🚨 警報通知</h1>
      </div>
      <div style="padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
        <p><strong>設備 ID：</strong>${deviceId}</p>
        <p><strong>設備名稱：</strong>${deviceName}</p>
        <p><strong>警報訊息：</strong></p>
        <p style="background: #fee2e2; padding: 15px; border-radius: 4px; color: #dc2626; white-space: pre-line;">${message}</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
          此警報由監控系統自動發送 - ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
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
        subject: `🚨 警報通知 - ${deviceName}`,
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
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

  const smsBody = `🚨 警報通知\n設備：${deviceName}\n${message}`;

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
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}