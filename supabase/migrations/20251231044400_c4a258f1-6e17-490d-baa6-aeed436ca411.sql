-- Create table for WebSocket forwarded alerts (e.g., helmet detection, safety violations)
CREATE TABLE public.websocket_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  device_id TEXT,
  device_name TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.websocket_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to websocket_alerts" 
ON public.websocket_alerts 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to websocket_alerts" 
ON public.websocket_alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to websocket_alerts" 
ON public.websocket_alerts 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete from websocket_alerts" 
ON public.websocket_alerts 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_websocket_alerts_created_at ON public.websocket_alerts(created_at DESC);
CREATE INDEX idx_websocket_alerts_acknowledged ON public.websocket_alerts(acknowledged);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.websocket_alerts;