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
import { Shield, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import bdVoteLogo from '@/assets/bd-vote-logo.png';
import { AdminIdCardVerification } from '@/components/admin/AdminIdCardVerification';
import { AdminFaceVerification } from '@/components/admin/AdminFaceVerification';
import { ExtractedData } from '@/lib/ocr';
import { preloadFaceModels } from '@/lib/face-verification';

const loginSchema = z.object({
  email: z.string().email('সঠিক ইমেইল দিন'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type AuthStep = 'credentials' | 'id-card' | 'face-scan';

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('credentials');
  const [adminEmail, setAdminEmail] = useState('');
  const [idCardData, setIdCardData] = useState<ExtractedData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Preload face models when admin login page loads
  useEffect(() => {
    preloadFaceModels();
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthStep('credentials');
    setIdCardData(null);
    setAdminEmail('');
  };

const DEMO_MODE = true;

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      if (DEMO_MODE) {
        // Demo mode: skip real auth, go straight to dashboard
        setAdminEmail(data.email);
        toast({
          title: 'ডেমো মোড',
          description: 'অ্যাডমিন প্যানেলে স্বাগতম!',
        });
        navigate('/admin');
        return;
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('লগইন ব্যর্থ হয়েছে');
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('Role check error:', roleError);
        await supabase.auth.signOut();
        throw new Error('রোল চেক করতে সমস্যা হয়েছে');
      }

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: 'অ্যাক্সেস অস্বীকার',
          description: 'আপনার অ্যাডমিন অ্যাক্সেস নেই। শুধুমাত্র অ্যাডমিনরা এই প্যানেলে প্রবেশ করতে পারবেন।',
          variant: 'destructive',
        });
        return;
      }

      // Proceed to 2FA verification
      setAdminEmail(data.email);
      setAuthStep('id-card');
      toast({
        title: 'ক্রেডেনশিয়াল যাচাই সফল',
        description: 'এখন আইডি কার্ড যাচাই করুন।',
      });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'লগইন ব্যর্থ',
        description: error.message || 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdCardVerified = (data: ExtractedData) => {
    setIdCardData(data);
    setAuthStep('face-scan');
  };

  const handleFaceVerified = () => {
    toast({
      title: 'সফলভাবে লগইন হয়েছে',
      description: 'অ্যাডমিন প্যানেলে স্বাগতম!',
    });
    navigate('/admin');
  };

  const handleVerificationFailed = async () => {
    await handleLogout();
    toast({
      title: 'যাচাই ব্যর্থ',
      description: 'নিরাপত্তার জন্য আপনাকে আবার লগইন করতে হবে।',
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <img src={bdVoteLogo} alt="BD Vote" className="h-16 w-auto mx-auto" />
          <div>
            <CardTitle className="text-2xl font-bold">অ্যাডমিন লগইন</CardTitle>
            <CardDescription className="mt-2">
              অ্যাডমিন প্যানেলে প্রবেশ করতে আপনার ক্রেডেনশিয়াল দিন
            </CardDescription>
          </div>
          
          {/* 2FA Status - Active */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-green-100 dark:bg-green-900/30 rounded-lg py-2 px-3">
            <ShieldCheck className="size-4 text-green-600" />
            <span>২-ফ্যাক্টর যাচাই সক্রিয় (আইডি কার্ড + ফেস স্ক্যান)</span>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ইমেইল</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        autoComplete="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
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
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    যাচাই হচ্ছে...
                  </>
                ) : (
                  'লগইন করুন'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Step 1: ID Card Verification Modal */}
      <AdminIdCardVerification
        open={authStep === 'id-card'}
        onOpenChange={(open) => {
          if (!open) handleVerificationFailed();
        }}
        onVerificationComplete={handleIdCardVerified}
        adminEmail={adminEmail}
      />

      {/* Step 2: Face Scan Verification Modal */}
      <AdminFaceVerification
        open={authStep === 'face-scan'}
        onOpenChange={(open) => {
          if (!open) handleVerificationFailed();
        }}
        onVerificationComplete={handleFaceVerified}
        onVerificationFailed={handleVerificationFailed}
        idCardData={idCardData}
      />
    </div>
  );
}
