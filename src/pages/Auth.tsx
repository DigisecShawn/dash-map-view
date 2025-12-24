import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Lock, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const usernameSchema = z.string()
  .min(3, '帳號至少需要 3 個字元')
  .max(20, '帳號最多 20 個字元')
  .regex(/^[a-zA-Z0-9_]+$/, '帳號只能包含英文字母、數字和底線');

const passwordSchema = z.string().min(6, '密碼至少需要 6 個字元');

const usernameToEmail = (username: string) => `${username.toLowerCase()}@iot-monitor.local`;

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      usernameSchema.parse(username);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return;
    }

    setLoading(true);
    try {
      const email = usernameToEmail(username);
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('帳號或密碼錯誤');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('登入時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">IoT 監控系統</h1>
          <p className="text-sm text-muted-foreground mt-1">請登入以繼續</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">帳號</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="請輸入帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <p className="text-xs text-muted-foreground">英文字母、數字和底線，3-20 個字元</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密碼</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                登入中...
              </>
            ) : (
              '登入'
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          如需建立帳號，請聯繫系統管理員
        </p>
      </Card>
    </div>
  );
};

export default Auth;
