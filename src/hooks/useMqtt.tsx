import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { toast } from 'sonner';

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
  timestamp: string;
  alertType?: 'battery_low' | 'signal_weak' | 'offline' | 'motion_detected' | 'error';
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
          setMessages((prev) => [message, ...prev].slice(0, 100)); // Keep last 100 messages

          // Check for alerts
          if (message.alertType) {
            setAlerts((prev) => [message, ...prev].slice(0, 50));
            
            // Show toast for alerts
            const alertMessages: Record<string, string> = {
              battery_low: `⚠️ ${message.deviceId} 電量過低`,
              signal_weak: `📶 ${message.deviceId} 訊號不佳`,
              offline: `🔴 ${message.deviceId} 已離線`,
              motion_detected: `🚨 ${message.deviceId} 偵測到移動`,
              error: `❌ ${message.deviceId} 發生錯誤`,
            };
            
            toast.warning(alertMessages[message.alertType] || message.alertMessage || '收到警報');
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
