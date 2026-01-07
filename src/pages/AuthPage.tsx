import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoIcon from '@/assets/logo-icon.png';
const AuthPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('請填寫帳號和密碼');
      return;
    }
    setLoading(true);
    try {
      // Query accounts table to verify credentials
      const {
        data: account,
        error
      } = await supabase.from('accounts').select('*').eq('username', username.trim()).eq('password_hash', password).eq('is_active', true).single();
      if (error || !account) {
        toast.error('帳號或密碼錯誤');
        setLoading(false);
        return;
      }

      // Store session in localStorage
      const sessionData = {
        id: account.id,
        username: account.username,
        display_name: account.display_name,
        role: account.role,
        logged_in_at: new Date().toISOString()
      };
      localStorage.setItem('auth_session', JSON.stringify(sessionData));
      toast.success(`歡迎回來，${account.display_name || account.username}！`);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('登入時發生錯誤');
    } finally {
      setLoading(false);
    }
  };
  return <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center shadow-xl mb-4 overflow-hidden">
            <img src={logoIcon} alt="DIGISEC" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-primary">DGS-MAP GPS</h1>
          <p className="text-sm text-muted-foreground mt-1">工地智慧監控平台</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <h2 className="text-2xl font-semibold leading-none tracking-tight">系統登入</h2>
            <CardDescription>請輸入您的帳號密碼</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">帳號</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="username" type="text" placeholder="請輸入帳號" value={username} onChange={e => setUsername(e.target.value)} className="pl-10" disabled={loading} autoComplete="username" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="請輸入密碼" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" disabled={loading} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground w-6 h-6 flex items-center justify-center" aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登入中...' : '登入'}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground text-center">
                預設管理員帳號：<span className="font-mono text-foreground">admin</span> / <span className="font-mono text-foreground">admin123</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} DIGISEC 得暘資訊. All rights reserved.
        </p>
      </div>
    </main>;
};
export default AuthPage;