import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AlarmViolation {
  device_id: string;
  device_name: string;
  metric_type: string;
  metric_label: string;
  current_value: number;
  threshold_value: number;
  unit: string;
}

interface UseAlarmMonitorOptions {
  enabled?: boolean;
  checkInterval?: number; // in milliseconds
  onAlarmTriggered?: (violations: AlarmViolation[]) => void;
}

export const useAlarmMonitor = (options: UseAlarmMonitorOptions = {}) => {
  const { 
    enabled = true, 
    checkInterval = 60000, // Check every minute by default
    onAlarmTriggered 
  } = options;

  const lastCheckRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAlarms = useCallback(async () => {
    try {
      console.log('Checking alarms...');
      
      const { data, error } = await supabase.functions.invoke('check-alarms', {
        body: { checkAll: true }
      });

      if (error) {
        console.error('Error checking alarms:', error);
        return;
      }

      lastCheckRef.current = new Date();

      if (data?.violations && data.violations.length > 0) {
        console.log('Alarm violations found:', data.violations);
        
        // Show toast for each violation
        data.violations.forEach((violation: AlarmViolation) => {
          toast.error(`警報: ${violation.device_name}`, {
            description: `${violation.metric_label} 超過閾值 (${violation.current_value} ${violation.unit} > ${violation.threshold_value} ${violation.unit})`,
            duration: 10000,
          });
        });

        onAlarmTriggered?.(data.violations);
      }

      return data;
    } catch (error) {
      console.error('Error in checkAlarms:', error);
    }
  }, [onAlarmTriggered]);

  const checkSingleDevice = useCallback(async (sensorData: {
    device_id: string;
    pm25?: number;
    pm10?: number;
    temperature?: number;
    humidity?: number;
    noise?: number;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-alarms', {
        body: { sensorData }
      });

      if (error) {
        console.error('Error checking device alarms:', error);
        return;
      }

      if (data?.violations && data.violations.length > 0) {
        data.violations.forEach((violation: AlarmViolation) => {
          toast.error(`警報: ${violation.device_name}`, {
            description: `${violation.metric_label} 超過閾值 (${violation.current_value} ${violation.unit} > ${violation.threshold_value} ${violation.unit})`,
            duration: 10000,
          });
        });

        onAlarmTriggered?.(data.violations);
      }

      return data;
    } catch (error) {
      console.error('Error in checkSingleDevice:', error);
    }
  }, [onAlarmTriggered]);

  // Set up periodic check
  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkAlarms();

    // Set up interval
    intervalRef.current = setInterval(checkAlarms, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkInterval, checkAlarms]);

  // Subscribe to realtime sensor data changes
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('sensor-alarm-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_sensor_history'
        },
        (payload) => {
          console.log('New sensor data received:', payload.new);
          // Check this specific sensor data against thresholds
          checkSingleDevice(payload.new as {
            device_id: string;
            pm25?: number;
            pm10?: number;
            temperature?: number;
            humidity?: number;
            noise?: number;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, checkSingleDevice]);

  return {
    checkAlarms,
    checkSingleDevice,
    lastCheck: lastCheckRef.current,
  };
};