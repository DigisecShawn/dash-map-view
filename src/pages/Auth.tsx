import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Lock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const usernameSchema = z.string()
  .min(3, '帳號至少需要 3 個字元')
  .max(20, '帳號最多 20 個字元')
  .regex(/^[a-zA-Z0-9_]+$/, '帳號只能包含英文字母、數字和底線');
const passwordSchema = z.string().min(6, '密碼至少需要 6 個字元');

// Convert username to pseudo-email for Supabase Auth
const usernameToEmail = (username: string) => `${username.toLowerCase()}@iot-monitor.local`;

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      usernameSchema.parse(username);
      passwordSchema.parse(password);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const email = usernameToEmail(username);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError('帳號或密碼錯誤');
      } else {
        setError(signInError.message);
      }
      return;
    }

    toast({
      title: '登入成功',
      description: '歡迎回來！',
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-card shadow-glow">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">監控儀表板</h1>
            <p className="text-sm text-muted-foreground">即時設備監控系統</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-center mb-6">帳號登入</h2>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-username">帳號</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="login-username"
                type="text"
                placeholder="請輸入帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">密碼</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isSubmitting}
          >
            {isSubmitting ? '登入中...' : '登入'}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          如需帳號請聯繫系統管理員
        </p>
      </Card>
    </div>
  );
};

export default Auth;
