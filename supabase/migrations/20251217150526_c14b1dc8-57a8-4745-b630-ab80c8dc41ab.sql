-- Create table for device sensor history
CREATE TABLE public.device_sensor_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  temperature NUMERIC(5,2),
  pm25 NUMERIC(6,2),
  battery INTEGER,
  signal_strength INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_device_sensor_history_device_id ON public.device_sensor_history(device_id);
CREATE INDEX idx_device_sensor_history_recorded_at ON public.device_sensor_history(recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE public.device_sensor_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (sensor data is typically non-sensitive)
CREATE POLICY "Allow public read access to sensor history"
ON public.device_sensor_history
FOR SELECT
USING (true);

-- Create policy for insert (for edge functions and MQTT handlers)
CREATE POLICY "Allow insert to sensor history"
ON public.device_sensor_history
FOR INSERT
WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_sensor_history;