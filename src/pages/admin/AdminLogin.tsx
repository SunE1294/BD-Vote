import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Eye, EyeOff, ShieldCheck, LogIn } from 'lucide-react';
import bdVoteLogo from '@/assets/bd-vote-logo.png';
import { preloadFaceModels } from '@/lib/face-verification';

const loginSchema = z.object({
  email: z.string().email('সঠিক ইমেইল দিন'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    preloadFaceModels();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const demoSession = sessionStorage.getItem('bd-vote-admin-demo-session');
      if (demoSession) {
        navigate('/admin', { replace: true });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (role) {
          navigate('/admin', { replace: true });
        }
      }
    };
    checkSession();
  }, [navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onLogin = async (data: LoginFormValues) => {
    // Demo login
    if (data.email === 'admin@bdvote.com' && data.password === 'admin123') {
      sessionStorage.setItem('bd-vote-admin-demo-session', 'true');
      toast({ title: 'লগইন সফল', description: 'অ্যাডমিন প্যানেলে স্বাগতম (ডেমো মোড)!' });
      navigate('/admin');
      return;
    }

    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('লগইন ব্যর্থ হয়েছে');

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        await supabase.auth.signOut();
        throw new Error('রোল চেক করতে সমস্যা হয়েছে');
      }

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: 'অ্যাক্সেস অস্বীকার',
          description: 'আপনার অ্যাডমিন অ্যাক্সেস নেই।',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'লগইন সফল', description: 'অ্যাডমিন প্যানেলে স্বাগতম!' });
      navigate('/admin');
    } catch (error: any) {
      toast({
        title: 'লগইন ব্যর্থ',
        description: error.message || 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <img src={bdVoteLogo} alt="BD Vote" className="h-16 w-auto mx-auto" />
          <div>
            <CardTitle className="text-2xl font-bold">অ্যাডমিন প্যানেল</CardTitle>
            <CardDescription className="mt-2">
              অ্যাডমিন প্যানেলে প্রবেশ করতে লগইন করুন
            </CardDescription>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-success/10 rounded-lg py-2 px-3">
            <ShieldCheck className="size-4 text-success" />
            <span>ডেমো: admin@bdvote.com / admin123</span>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ইমেইল</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@bdvote.com" autoComplete="email" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>পাসওয়ার্ড</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />যাচাই হচ্ছে...</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" />লগইন করুন</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
