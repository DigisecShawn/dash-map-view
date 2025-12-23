-- Add new columns to device_sensor_history for environmental monitoring
ALTER TABLE public.device_sensor_history 
ADD COLUMN IF NOT EXISTS pm10 numeric NULL,
ADD COLUMN IF NOT EXISTS humidity numeric NULL,
ADD COLUMN IF NOT EXISTS noise numeric NULL;