-- Add solar power column to device_sensor_history
ALTER TABLE public.device_sensor_history 
ADD COLUMN solar_power numeric NULL;

-- Add current solar power to devices table for real-time display
ALTER TABLE public.devices 
ADD COLUMN current_solar_power numeric NULL DEFAULT 0;

COMMENT ON COLUMN public.device_sensor_history.solar_power IS 'Solar power generation in kW';
COMMENT ON COLUMN public.devices.current_solar_power IS 'Current solar power generation in kW';