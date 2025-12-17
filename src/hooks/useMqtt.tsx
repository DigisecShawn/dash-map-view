import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface MqttConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  topics: string[];
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: 'online' | 'offline';
  battery?: number;
  signal?: number;
  temperature?: number;
  pm25?: number;
  timestamp: string;
  alertType?: 'battery_low' | 'signal_weak' | 'offline' | 'motion_detected' | 'error' | 'high_pm25' | 'high_temperature';
  alertMessage?: string;
}

interface UseMqttReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: DeviceStatusUpdate | null;
  messages: DeviceStatusUpdate[];
  alerts: DeviceStatusUpdate[];
  connect: (config: MqttConfig) => void;
  disconnect: () => void;
  clearAlerts: () => void;
}

export const useMqtt = (): UseMqttReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<DeviceStatusUpdate | null>(null);
  const [messages, setMessages] = useState<DeviceStatusUpdate[]>([]);
  const [alerts, setAlerts] = useState<DeviceStatusUpdate[]>([]);
  const clientRef = useRef<MqttClient | null>(null);

  const connect = useCallback((config: MqttConfig) => {
    if (clientRef.current) {
      clientRef.current.end();
    }

    setIsConnecting(true);

    const options: IClientOptions = {
      clientId: `lovable_dashboard_${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
    };

    if (config.username) {
      options.username = config.username;
    }
    if (config.password) {
      options.password = config.password;
    }

    try {
      const client = mqtt.connect(config.brokerUrl, options);
      clientRef.current = client;

      client.on('connect', () => {
        console.log('MQTT Connected');
        setIsConnected(true);
        setIsConnecting(false);
        toast.success('MQTT 連線成功');

        // Subscribe to topics
        config.topics.forEach((topic) => {
          client.subscribe(topic, (err) => {
            if (err) {
              console.error(`Failed to subscribe to ${topic}:`, err);
              toast.error(`訂閱 ${topic} 失敗`);
            } else {
              console.log(`Subscribed to ${topic}`);
            }
          });
        });
      });

      client.on('message', (topic, payload) => {
        try {
          const message = JSON.parse(payload.toString()) as DeviceStatusUpdate;
          message.timestamp = message.timestamp || new Date().toISOString();
          
          setLastMessage(message);
          setMessages((prev) => [message, ...prev].slice(0, 100));

          // Save sensor data to database if temperature or PM2.5 is present
          if (message.temperature !== undefined || message.pm25 !== undefined) {
            supabase.from('device_sensor_history').insert({
              device_id: message.deviceId,
              temperature: message.temperature,
              pm25: message.pm25,
              battery: message.battery,
              signal_strength: message.signal,
              recorded_at: message.timestamp,
            }).then(({ error }) => {
              if (error) console.error('Failed to save sensor data:', error);
            });
          }

          // Check for alerts
          if (message.alertType) {
            setAlerts((prev) => [message, ...prev].slice(0, 50));
            
            const alertMessages: Record<string, string> = {
              battery_low: `⚠️ ${message.deviceId} 電量過低`,
              signal_weak: `📶 ${message.deviceId} 訊號不佳`,
              offline: `🔴 ${message.deviceId} 已離線`,
              motion_detected: `🚨 ${message.deviceId} 偵測到移動`,
              error: `❌ ${message.deviceId} 發生錯誤`,
              high_pm25: `🌫️ ${message.deviceId} PM2.5 過高`,
              high_temperature: `🌡️ ${message.deviceId} 溫度過高`,
            };
            
            toast.warning(alertMessages[message.alertType] || message.alertMessage || '收到警報');
          }

          // Auto-generate alerts for high values
          if (message.pm25 && message.pm25 > 100 && !message.alertType) {
            const alert = { ...message, alertType: 'high_pm25' as const, alertMessage: `PM2.5 濃度達 ${message.pm25} μg/m³` };
            setAlerts((prev) => [alert, ...prev].slice(0, 50));
            toast.warning(`🌫️ ${message.deviceId} PM2.5 過高: ${message.pm25} μg/m³`);
          }

          if (message.temperature && message.temperature > 40 && !message.alertType) {
            const alert = { ...message, alertType: 'high_temperature' as const, alertMessage: `溫度達 ${message.temperature}°C` };
            setAlerts((prev) => [alert, ...prev].slice(0, 50));
            toast.warning(`🌡️ ${message.deviceId} 溫度過高: ${message.temperature}°C`);
          }
        } catch (e) {
          console.error('Failed to parse MQTT message:', e);
        }
      });

      client.on('error', (err) => {
        console.error('MQTT Error:', err);
        setIsConnecting(false);
        toast.error('MQTT 連線錯誤');
      });

      client.on('close', () => {
        console.log('MQTT Disconnected');
        setIsConnected(false);
      });

      client.on('reconnect', () => {
        console.log('MQTT Reconnecting...');
        setIsConnecting(true);
      });

    } catch (error) {
      console.error('Failed to connect to MQTT:', error);
      setIsConnecting(false);
      toast.error('MQTT 連線失敗');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
      setIsConnected(false);
      toast.info('MQTT 已斷線');
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    messages,
    alerts,
    connect,
    disconnect,
    clearAlerts,
  };
};
