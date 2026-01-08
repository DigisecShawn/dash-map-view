import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const MapLoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Demo credentials for direct map access
  const DEMO_CREDENTIALS = {
    username: 'map',
    password: 'map123',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('請輸入帳號和密碼');
      return;
    }

    setLoading(true);

    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
      toast.success('登入成功');
      navigate('/map');
    } else {
      toast.error('帳號或密碼錯誤');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg mb-4">
            <MapPin className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold">電子地圖系統</h1>
          <p className="text-sm text-muted-foreground">請登入以查看即時設備監控地圖</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-xl text-center font-semibold leading-none tracking-tight">登入</h2>
            <CardDescription className="text-center">
              輸入您的帳號密碼以存取電子地圖
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">帳號</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="輸入帳號"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="pl-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="輸入密碼"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors w-6 h-6 flex items-center justify-center"
                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                登入
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground mb-2">
                測試帳號
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm font-mono">
                  帳號: <span className="text-primary">map</span>
                </p>
                <p className="text-sm font-mono">
                  密碼: <span className="text-primary">map123</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 監控系統. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default MapLoginPage;
