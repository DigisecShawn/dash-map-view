-- Create device alarm thresholds table
CREATE TABLE public.device_alarm_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- pm25, pm10, temperature, humidity, noise
  threshold_value NUMERIC NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(device_id, metric_type)
);

-- Enable Row Level Security
ALTER TABLE public.device_alarm_thresholds ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to device_alarm_thresholds" 
ON public.device_alarm_thresholds 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to device_alarm_thresholds" 
ON public.device_alarm_thresholds 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to device_alarm_thresholds" 
ON public.device_alarm_thresholds 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete from device_alarm_thresholds" 
ON public.device_alarm_thresholds 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_device_alarm_thresholds_updated_at
BEFORE UPDATE ON public.device_alarm_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();