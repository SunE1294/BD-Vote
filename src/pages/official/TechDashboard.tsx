import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HardHat, 
  Terminal, 
  Server, 
  Activity,
  LogOut,
  RefreshCw,
  Database,
  Link,
  ShieldCheck,
  Code
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { isBlockchainConfigured, BD_VOTE_CONTRACT_ADDRESS } from '@/lib/blockchain';

export default function TechDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<{userId: string, role: string} | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulated stats for effect
  const [cpuUsage, setCpuUsage] = useState(12);
  const [memUsage, setMemUsage] = useState(45);
  
  const blockchainStatus = isBlockchainConfigured();

  useEffect(() => {
    const rawSession = sessionStorage.getItem('bd-vote-official-tech');
    if (!rawSession) {
      navigate('/official/login?role=tech');
      return;
    }
    setSession(JSON.parse(rawSession));
    fetchLogs();

    // Fluctuating system load simulation
    const interval = setInterval(() => {
      setCpuUsage(prev => Math.min(100, Math.max(5, prev + (Math.random() * 10 - 5))));
      setMemUsage(prev => Math.min(100, Math.max(20, prev + (Math.random() * 4 - 2))));
    }, 3000);

    // Subscribe to audit logs realtime changes
    const channel = supabase
      .channel('public:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Fetch latest 50 logs

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({ title: 'ডাটা লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bd-vote-official-tech');
    toast({ title: 'লগআউট সফল' });
    navigate('/official/login?role=tech');
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center">
              <HardHat className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground">প্রযুক্তিগত নিয়ন্ত্রণ কক্ষ</h1>
              <p className="text-xs text-muted-foreground">ID: {session.userId}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">লগআউট</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">সিস্টেম মনিটরিং</h2>
            <p className="text-sm text-muted-foreground">ডাটাবেস ও ব্লকচেইন কানেক্টিভিটি</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`size-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            রিফ্রেশ লগস
          </Button>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="flex items-center gap-2"><Server className="size-4" /> সার্ভার লোড (CPU)</span>
                <span>{cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={cpuUsage} className={cpuUsage > 80 ? "bg-destructive/20 [&>div]:bg-destructive" : ""} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="flex items-center gap-2"><Database className="size-4" /> মেমরি (RAM)</span>
                <span>{memUsage.toFixed(1)}%</span>
              </div>
              <Progress value={memUsage} className={memUsage > 85 ? "bg-warning/20 [&>div]:bg-warning" : ""} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${blockchainStatus ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {blockchainStatus ? <Link className="size-6 text-success" /> : <Link className="size-6 text-destructive opacity-50" />}
              </div>
              <div>
                <p className="font-semibold">{blockchainStatus ? 'কানেক্টেড' : 'ডিসকানেক্টেড'}</p>
                <p className="text-xs text-muted-foreground">ব্লকচেইন নোড</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 flex items-center gap-4">
              <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">সক্রিয়</p>
                <p className="text-xs text-muted-foreground">Supabase ডাটাবেস</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configurations */}
        <Card className="bg-muted/30">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="size-4" /> সিস্টেম কনফিগারেশন
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">
            <p className="text-muted-foreground">VITE_SUPABASE_URL: <span className="text-foreground">{import.meta.env.VITE_SUPABASE_URL}</span></p>
            <p className="text-muted-foreground">VITE_SMART_CONTRACT: <span className="text-foreground">{BD_VOTE_CONTRACT_ADDRESS || 'Not configured'}</span></p>
            <p className="text-muted-foreground">NETWORK: <span className="text-foreground">Base Sepolia (L2)</span></p>
          </CardContent>
        </Card>

        {/* Audit Logs Terminal */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-4" />
                সিস্টেম অডিট লগস
              </div>
              <Badge variant="outline" className="bg-background">
                Live stream
                <span className="ml-2 size-2 bg-success rounded-full animate-pulse" />
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-[#0A0A0A] text-[#00FF00] font-mono text-xs sm:text-sm h-[400px] overflow-y-auto">
            {isLoading && logs.length === 0 ? (
              <div className="p-4 flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="size-4 animate-spin" /> Fetching logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-4 text-muted-foreground">No logs found in the system yet.</div>
            ) : (
              <div className="p-4 space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors break-all lg:break-normal">
                    <span className="text-muted-foreground shrink-0 w-24 sm:w-32">
                      {new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <div className="flex-1">
                      <span className="text-[#00BFFF] font-semibold">[{log.entity_type?.toUpperCase()}]</span>{' '}
                      <span className="text-[#FFD700]">{log.action}</span>{' '}
                      <span className="text-white/70 ml-2">
                        {log.details ? JSON.stringify(log.details) : ''}
                      </span>
                      {log.user_id && (
                        <span className="block mt-0.5 text-white/40 text-[10px]">actor_id: {log.user_id}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
