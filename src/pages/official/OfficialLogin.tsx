import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Gavel, HardHat, Loader2, Shield } from 'lucide-react';
import bdVoteLogo from '@/assets/bd-vote-logo.png';

const loginSchema = z.object({
  userId: z.string().min(3, 'ইউজার আইডি কমপক্ষে ৩ অক্ষরের হতে হবে'),
  accessCode: z.string().length(6, 'অ্যাক্সেস কোড ৬ সংখ্যার হতে হবে').regex(/^\d{6}$/, 'শুধুমাত্র সংখ্যা ব্যবহার করুন'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function OfficialLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const role = searchParams.get('role') || 'law';
  const isLaw = role === 'law';

  const roleLabel = isLaw ? 'আইন-শৃঙ্খলা কর্মকর্তা' : 'প্রযুক্তিগত কর্মকর্তা';
  const RoleIcon = isLaw ? Gavel : HardHat;
  const dashboardPath = isLaw ? '/official/law-dashboard' : '/official/tech-dashboard';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: '', accessCode: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Demo: any 6-digit code works
      await new Promise(r => setTimeout(r, 800));

      sessionStorage.setItem(`bd-vote-official-${role}`, JSON.stringify({
        userId: data.userId,
        role,
        loginTime: new Date().toISOString(),
      }));

      toast({
        title: 'লগইন সফল',
        description: `${roleLabel} প্যানেলে স্বাগতম!`,
      });

      navigate(dashboardPath);
    } catch {
      toast({
        title: 'লগইন ব্যর্থ',
        description: 'অ্যাক্সেস কোড যাচাই করতে সমস্যা হয়েছে',
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
          <div className="flex justify-center">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <RoleIcon className="size-7 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{roleLabel} লগইন</CardTitle>
            <CardDescription className="mt-2">
              আপনার ইউজার আইডি ও ৬-সংখ্যার অ্যাক্সেস কোড দিয়ে প্রবেশ করুন
            </CardDescription>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg py-2 px-3">
            <Shield className="size-4" />
            <span>ডেমো: যেকোনো ৬-সংখ্যার কোড (যেমন: 123456)</span>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ইউজার আইডি</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isLaw ? 'LAW-001' : 'TECH-001'}
                        autoComplete="username"
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
                name="accessCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>৬-সংখ্যার অ্যাক্সেস কোড</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••"
                        maxLength={6}
                        autoComplete="one-time-code"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />যাচাই হচ্ছে...</>
                ) : (
                  <><RoleIcon className="mr-2 h-4 w-4" />প্রবেশ করুন</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
