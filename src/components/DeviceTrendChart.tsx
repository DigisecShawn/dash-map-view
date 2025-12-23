import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Thermometer, Wind, TrendingUp, Loader2, Droplets, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SensorData {
  id: string;
  device_id: string;
  temperature: number | null;
  pm25: number | null;
  pm10: number | null;
  humidity: number | null;
  noise: number | null;
  battery: number | null;
  signal_strength: number | null;
  recorded_at: string;
}

interface DeviceTrendChartProps {
  deviceId: string;
  deviceName: string;
}

const DeviceTrendChart = ({ deviceId, deviceName }: DeviceTrendChartProps) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [latestData, setLatestData] = useState<SensorData | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('sensor-history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_sensor_history',
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          const newData = payload.new as SensorData;
          setData(prev => [newData, ...prev].slice(0, 100));
          setLatestData(newData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let hoursAgo = 24;
      if (timeRange === '6h') hoursAgo = 6;
      else if (timeRange === '12h') hoursAgo = 12;
      else if (timeRange === '7d') hoursAgo = 168;

      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursAgo);

      const { data: sensorData, error } = await supabase
        .from('device_sensor_history')
        .select('*')
        .eq('device_id', deviceId)
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      setData(sensorData || []);
      if (sensorData && sensorData.length > 0) {
        setLatestData(sensorData[sensorData.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeRange === '7d') {
      return date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    }
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  const chartData = data.map(d => ({
    time: formatTime(d.recorded_at),
    temperature: d.temperature,
    pm25: d.pm25,
    pm10: d.pm10,
    humidity: d.humidity,
    noise: d.noise,
    fullTime: d.recorded_at,
  }));

  const getPM25Status = (value: number | null) => {
    if (value === null) return { label: '無數據', color: 'bg-muted' };
    if (value <= 15) return { label: '良好', color: 'bg-success' };
    if (value <= 35) return { label: '普通', color: 'bg-warning' };
    if (value <= 54) return { label: '敏感', color: 'bg-orange-500' };
    if (value <= 150) return { label: '不健康', color: 'bg-destructive' };
    return { label: '危險', color: 'bg-purple-600' };
  };

  const getPM10Status = (value: number | null) => {
    if (value === null) return { label: '無數據', color: 'bg-muted' };
    if (value <= 50) return { label: '良好', color: 'bg-success' };
    if (value <= 100) return { label: '普通', color: 'bg-warning' };
    if (value <= 250) return { label: '敏感', color: 'bg-orange-500' };
    if (value <= 350) return { label: '不健康', color: 'bg-destructive' };
    return { label: '危險', color: 'bg-purple-600' };
  };

  const getTemperatureStatus = (value: number | null) => {
    if (value === null) return { label: '無數據', color: 'bg-muted' };
    if (value < 10) return { label: '寒冷', color: 'bg-blue-500' };
    if (value < 20) return { label: '涼爽', color: 'bg-cyan-500' };
    if (value < 30) return { label: '舒適', color: 'bg-success' };
    if (value < 35) return { label: '炎熱', color: 'bg-warning' };
    return { label: '極熱', color: 'bg-destructive' };
  };

  const getHumidityStatus = (value: number | null) => {
    if (value === null) return { label: '無數據', color: 'bg-muted' };
    if (value < 30) return { label: '乾燥', color: 'bg-orange-500' };
    if (value < 60) return { label: '舒適', color: 'bg-success' };
    if (value < 80) return { label: '潮濕', color: 'bg-warning' };
    return { label: '很潮濕', color: 'bg-destructive' };
  };

  const getNoiseStatus = (value: number | null) => {
    if (value === null) return { label: '無數據', color: 'bg-muted' };
    if (value < 40) return { label: '安靜', color: 'bg-success' };
    if (value < 60) return { label: '正常', color: 'bg-cyan-500' };
    if (value < 80) return { label: '吵雜', color: 'bg-warning' };
    if (value < 100) return { label: '很吵', color: 'bg-orange-500' };
    return { label: '危險', color: 'bg-destructive' };
  };

  const pm25Status = getPM25Status(latestData?.pm25 ?? null);
  const pm10Status = getPM10Status(latestData?.pm10 ?? null);
  const tempStatus = getTemperatureStatus(latestData?.temperature ?? null);
  const humidityStatus = getHumidityStatus(latestData?.humidity ?? null);
  const noiseStatus = getNoiseStatus(latestData?.noise ?? null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Current Values - Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Thermometer className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">溫度</span>
              </div>
              <Badge className={`${tempStatus.color} text-[8px] sm:text-[10px] px-1 sm:px-1.5`}>{tempStatus.label}</Badge>
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                {latestData?.temperature !== null ? `${latestData?.temperature}°C` : '--'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">濕度</span>
              </div>
              <Badge className={`${humidityStatus.color} text-[8px] sm:text-[10px] px-1 sm:px-1.5`}>{humidityStatus.label}</Badge>
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                {latestData?.humidity !== null ? `${latestData?.humidity}%` : '--'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">噪音</span>
              </div>
              <Badge className={`${noiseStatus.color} text-[8px] sm:text-[10px] px-1 sm:px-1.5`}>{noiseStatus.label}</Badge>
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                {latestData?.noise !== null ? latestData?.noise : '--'}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">dB</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Values - Row 2: PM2.5 & PM10 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">PM2.5</span>
              </div>
              <Badge className={`${pm25Status.color} text-[8px] sm:text-[10px] px-1 sm:px-1.5`}>{pm25Status.label}</Badge>
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                {latestData?.pm25 !== null ? `${latestData?.pm25}` : '--'}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">μg/m³</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/20">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">PM10</span>
              </div>
              <Badge className={`${pm10Status.color} text-[8px] sm:text-[10px] px-1 sm:px-1.5`}>{pm10Status.label}</Badge>
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                {latestData?.pm10 !== null ? `${latestData?.pm10}` : '--'}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">μg/m³</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1 sm:gap-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              歷史趨勢
            </CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-20 sm:w-24 h-7 sm:h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6h">6 小時</SelectItem>
                <SelectItem value="12h">12 小時</SelectItem>
                <SelectItem value="24h">24 小時</SelectItem>
                <SelectItem value="7d">7 天</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
          <Tabs defaultValue="temperature" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-8">
              <TabsTrigger value="temperature" className="text-[10px] sm:text-xs gap-0.5 px-1">
                <Thermometer className="w-3 h-3 hidden sm:block" />
                溫度
              </TabsTrigger>
              <TabsTrigger value="humidity" className="text-[10px] sm:text-xs gap-0.5 px-1">
                <Droplets className="w-3 h-3 hidden sm:block" />
                濕度
              </TabsTrigger>
              <TabsTrigger value="pm25" className="text-[10px] sm:text-xs gap-0.5 px-1">
                PM2.5
              </TabsTrigger>
              <TabsTrigger value="pm10" className="text-[10px] sm:text-xs gap-0.5 px-1">
                PM10
              </TabsTrigger>
              <TabsTrigger value="noise" className="text-[10px] sm:text-xs gap-0.5 px-1">
                <Volume2 className="w-3 h-3 hidden sm:block" />
                噪音
              </TabsTrigger>
            </TabsList>

            <TabsContent value="temperature" className="mt-3 sm:mt-4">
              {chartData.length > 0 ? (
                <div className="h-[150px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9 }} 
                        className="text-muted-foreground"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }} 
                        domain={['auto', 'auto']}
                        unit="°C"
                        className="text-muted-foreground"
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value}°C`, '溫度']}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground">
                  <p className="text-sm">暫無數據</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="humidity" className="mt-3 sm:mt-4">
              {chartData.length > 0 ? (
                <div className="h-[150px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9 }}
                        className="text-muted-foreground"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }} 
                        domain={[0, 100]}
                        unit="%"
                        className="text-muted-foreground"
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value}%`, '濕度']}
                      />
                      <Line
                        type="monotone"
                        dataKey="humidity"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground">
                  <p className="text-sm">暫無數據</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pm25" className="mt-3 sm:mt-4">
              {chartData.length > 0 ? (
                <div className="h-[150px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9 }}
                        className="text-muted-foreground"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }} 
                        domain={[0, 'auto']}
                        className="text-muted-foreground"
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value} μg/m³`, 'PM2.5']}
                      />
                      <Line
                        type="monotone"
                        dataKey="pm25"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground">
                  <p className="text-sm">暫無數據</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pm10" className="mt-3 sm:mt-4">
              {chartData.length > 0 ? (
                <div className="h-[150px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9 }}
                        className="text-muted-foreground"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }} 
                        domain={[0, 'auto']}
                        className="text-muted-foreground"
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value} μg/m³`, 'PM10']}
                      />
                      <Line
                        type="monotone"
                        dataKey="pm10"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground">
                  <p className="text-sm">暫無數據</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="noise" className="mt-3 sm:mt-4">
              {chartData.length > 0 ? (
                <div className="h-[150px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9 }}
                        className="text-muted-foreground"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }} 
                        domain={[0, 'auto']}
                        unit="dB"
                        className="text-muted-foreground"
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value} dB`, '噪音']}
                      />
                      <Line
                        type="monotone"
                        dataKey="noise"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[150px] sm:h-[200px] text-muted-foreground">
                  <p className="text-sm">暫無數據</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceTrendChart;