// client/src/pages/login.tsx
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/auth';
import { Loader2, Chrome } from 'lucide-react';
import LogoPng from '@/img/logo.png'; // ✅ CORREÇÃO: Alterado de .png para .gif
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export default function Login() {
  const [, navigate] = useLocation();
  const { login, register, loginWithGoogle, isLoading: authLoading, error: authError, clearError } = useAuthStore(); 
  const { toast } = useToast();

  const [loginForm, setLoginForm] = useState({ email: 'admin@usbmkt.com', password: 'admin123' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); clearError(); const success = await login(loginForm.email, loginForm.password); if (success) { toast({ title: "Login bem-sucedido!", description: "Bem-vindo de volta.", }); navigate('/dashboard'); } else { toast({ title: "Erro de Login", description: useAuthStore.getState().error || "Verifique seu e-mail e senha.", variant: "destructive", }); } };
  const handleRegister = async (e: React.FormEvent) => { e.preventDefault(); clearError(); if(registerForm.password.length < 6) { toast({ title: "Erro de Registro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" }); return; } const success = await register(registerForm.username, registerForm.email, registerForm.password); if (success) { toast({ title: "Registro bem-sucedido!", description: "Sua conta foi criada.", }); navigate('/dashboard'); } else { toast({ title: "Erro de Registro", description: useAuthStore.getState().error || "Não foi possível criar a conta.", variant: "destructive", }); }};

  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      const success = await loginWithGoogle(credentialResponse.credential);
      if (success) {
        toast({
          title: 'Login com Google bem-sucedido!',
          description: 'Bem-vindo ao USB MKT PRO V2',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Erro no login com Google',
          description: authError || 'Não foi possível autenticar com o Google.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Erro no login com Google',
        description: 'Não foi recebido um token de credencial do Google.',
        variant: 'destructive',
      });
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4 space-y-8">
      <div className="mx-auto w-32 h-32 md:w-40 md:h-40"> 
        <img src={LogoPng} alt="USB MKT PRO V2 Logo" className="w-full h-full object-contain" style={{ filter: 'drop-shadow(0 0 10px hsl(var(--primary)/0.7)) drop-shadow(0 0 20px hsl(var(--primary)/0.5))' }} />
      </div>
      
      <Card className="w-full max-w-md neu-card">
        <CardHeader className="text-center pt-6 pb-4">
            <CardTitle className="text-xl">Acesse sua conta</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 neu-card-inset p-1">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                 {/* ... (inputs de login existentes) ... */}
                <Button type="submit" className="w-full neu-button-primary" disabled={authLoading}>
                  {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                 {/* ... (inputs de registro existentes) ... */}
                <Button type="submit" className="w-full neu-button-primary" disabled={authLoading}>
                  {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar conta
                </Button>
              </form>
            </TabsContent>

             <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  OU CONTINUE COM
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center">
                <GoogleLogin
                    onSuccess={handleGoogleLoginSuccess}
                    onError={() => {
                        toast({ title: "Erro de Login", description: "Falha ao iniciar o processo de login com o Google.", variant: "destructive" });
                    }}
                    theme="filled_black"
                    text="continue_with"
                    shape="pill"
                />
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
