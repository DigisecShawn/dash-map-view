import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Wind, Volume2, Sun, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface TrendDataPoint {
  time: string;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
  noise: number | null;
  solar: number | null;
}

interface EnvStats {
  temperature: { avg: number; min: number; max: number } | null;
  humidity: { avg: number; min: number; max: number } | null;
  pm25: { avg: number; min: number; max: number } | null;
  pm10: { avg: number; min: number; max: number } | null;
  noise: { avg: number; min: number; max: number } | null;
  dataCount: number;
}

interface EnvironmentalTrendsProps {
  trendData: TrendDataPoint[];
  envStats: EnvStats | null;
  isUsingMockData: boolean;
}

const EnvironmentalTrends = ({
  trendData,
  envStats,
  isUsingMockData,
}: EnvironmentalTrendsProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        環境趨勢分析
        {isUsingMockData && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-dashed ml-2">
            模擬數據
          </Badge>
        )}
      </h2>

      {/* Environment Statistics Summary */}
      {envStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {envStats.temperature && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                溫度
              </div>
              <div className="text-2xl font-bold">{envStats.temperature.avg}°C</div>
              <div className="text-xs text-muted-foreground">
                {envStats.temperature.min}°C ~ {envStats.temperature.max}°C
              </div>
            </Card>
          )}
          {envStats.humidity && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Droplets className="w-4 h-4 text-sky-500" />
                濕度
              </div>
              <div className="text-2xl font-bold">{envStats.humidity.avg}%</div>
              <div className="text-xs text-muted-foreground">
                {envStats.humidity.min}% ~ {envStats.humidity.max}%
              </div>
            </Card>
          )}
          {envStats.pm25 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Wind className="w-4 h-4 text-violet-500" />
                PM2.5
              </div>
              <div className="text-2xl font-bold">{envStats.pm25.avg}</div>
              <div className="text-xs text-muted-foreground">
                {envStats.pm25.min} ~ {envStats.pm25.max} µg/m³
              </div>
            </Card>
          )}
          {envStats.pm10 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Wind className="w-4 h-4 text-amber-600" />
                PM10
              </div>
              <div className="text-2xl font-bold">{envStats.pm10.avg}</div>
              <div className="text-xs text-muted-foreground">
                {envStats.pm10.min} ~ {envStats.pm10.max} µg/m³
              </div>
            </Card>
          )}
          {envStats.noise && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Volume2 className="w-4 h-4 text-slate-500" />
                噪音
              </div>
              <div className="text-2xl font-bold">{envStats.noise.avg} dB</div>
              <div className="text-xs text-muted-foreground">
                {envStats.noise.min} ~ {envStats.noise.max} dB
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Main Charts Grid - 2x2 Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Temperature & Humidity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              溫溼度趨勢
              <div className="ml-auto flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-red-500 rounded" />
                  <span className="text-muted-foreground">溫度</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-sky-500 rounded" />
                  <span className="text-muted-foreground">濕度</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="temp" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="°C" orientation="left" />
                  <YAxis yAxisId="humid" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" orientation="right" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number, name: string) => {
                      if (name === 'temperature') return [`${value}°C`, '溫度'];
                      if (name === 'humidity') return [`${value}%`, '濕度'];
                      return [value, name];
                    }} 
                  />
                  <Area yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ef4444" fill="url(#tempGradient)" strokeWidth={2} name="temperature" />
                  <Area yAxisId="humid" type="monotone" dataKey="humidity" stroke="#0ea5e9" fill="url(#humidGradient)" strokeWidth={2} name="humidity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Air Quality Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wind className="w-4 h-4 text-violet-500" />
              空氣品質趨勢
              <div className="ml-auto flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-violet-500 rounded" />
                  <span className="text-muted-foreground">PM2.5</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-amber-600 rounded" />
                  <span className="text-muted-foreground">PM10</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pm10Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="μg/m³" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        pm25: 'PM2.5',
                        pm10: 'PM10',
                      };
                      return [`${value} μg/m³`, labels[name] || name];
                    }} 
                  />
                  <Area type="monotone" dataKey="pm25" stroke="#8b5cf6" fill="url(#pm25Gradient)" strokeWidth={2} name="pm25" />
                  <Area type="monotone" dataKey="pm10" stroke="#d97706" fill="url(#pm10Gradient)" strokeWidth={2} name="pm10" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Noise Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-500" />
              噪音趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="noiseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="dB" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number) => [`${value} dB`, '噪音']} 
                  />
                  <Area type="monotone" dataKey="noise" stroke="#64748b" fill="url(#noiseGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Solar Power Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              太陽能發電趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="W" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                    formatter={(value: number) => [`${value} W`, '太陽能功率']} 
                  />
                  <Area type="monotone" dataKey="solar" stroke="#f59e0b" fill="url(#solarGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnvironmentalTrends;
