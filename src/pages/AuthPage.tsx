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
import logoDigisecEng from '@/assets/logo-digisec-eng.png';
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
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
            <img 
              alt="DIGISEC" 
              className="h-12 w-auto object-contain" 
              src={logoDigisecEng} 
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            DGS-MAP GPS
          </h1>
          <p className="text-muted-foreground mt-2 tracking-wide">工地智慧監控平台</p>
        </div>

        {/* Login Card */}
        <Card className="border-border/40 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4 pt-8">
            <h2 className="text-xl font-semibold tracking-tight">歡迎回來</h2>
            <CardDescription className="mt-1">請輸入您的帳號密碼登入系統</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">帳號</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="username" 
                    type="text" 
                    placeholder="請輸入帳號" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="pl-10 h-11 bg-background/50 border-border/60 focus:border-primary transition-colors" 
                    disabled={loading} 
                    autoComplete="username" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="請輸入密碼" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="pl-10 pr-10 h-11 bg-background/50 border-border/60 focus:border-primary transition-colors" 
                    disabled={loading} 
                    autoComplete="current-password" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50" 
                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all mt-2" 
                disabled={loading}
              >
                {loading ? '登入中...' : '登入系統'}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                預設管理員帳號
                <br />
                <span className="font-mono text-foreground font-medium">admin</span>
                <span className="mx-2 text-border">/</span>
                <span className="font-mono text-foreground font-medium">admin123</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} DIGISEC 得暘資訊. All rights reserved.
        </p>
      </div>
    </main>
  );
};

export default AuthPage;