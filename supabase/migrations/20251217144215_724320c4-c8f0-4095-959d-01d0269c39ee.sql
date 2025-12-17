-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('line', 'email', 'sms')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for channel
CREATE UNIQUE INDEX notification_settings_channel_key ON public.notification_settings(channel);

-- Create notification_logs table for history
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL,
  device_id TEXT,
  device_name TEXT,
  message TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (no auth)
CREATE POLICY "Allow all access to notification_settings" 
ON public.notification_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to notification_logs" 
ON public.notification_logs FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.notification_settings (channel, enabled, config) VALUES
  ('line', false, '{"channelAccessToken": "", "userId": ""}'),
  ('email', false, '{"recipients": [], "fromEmail": ""}'),
  ('sms', false, '{"phoneNumbers": [], "provider": "twilio"}');