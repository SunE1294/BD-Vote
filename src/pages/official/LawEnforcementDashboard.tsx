import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  MapPin, 
  Clock, 
  AlertTriangle,
  LogOut,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Gavel
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function LawEnforcementDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<{userId: string, role: string} | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('bd-vote-official-law');
    if (!rawSession) {
      navigate('/official/login?role=law');
      return;
    }
    setSession(JSON.parse(rawSession));
    fetchIncidents();

    // Subscribe to incidents realtime changes
    const channel = supabase
      .channel('public:incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast({ title: 'ডাটা লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bd-vote-official-law');
    toast({ title: 'লগআউট সফল' });
    navigate('/official/login?role=law');
  };

  const updateIncidentStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'অবস্থা হালনাগাদ করা হয়েছে' });
      fetchIncidents();
    } catch (e) {
      toast({ title: 'ত্রুটি', variant: 'destructive' });
    }
  };

  if (!session) return null;

  const pendingIncidents = incidents.filter(i => i.status !== 'resolved');
  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Gavel className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground">আইন-শৃঙ্খলা নিয়ন্ত্রণ কক্ষ</h1>
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
            <h2 className="text-xl sm:text-2xl font-bold">নিরাপত্তা ড্যাশবোর্ড</h2>
            <p className="text-sm text-muted-foreground">সরাসরি ঘটনা এবং অভিযোগ নজরদারি</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={isLoading}>
            <RefreshCw className={`size-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 sm:p-6 text-center">
              <AlertTriangle className="size-6 text-destructive mx-auto mb-2" />
              <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">জরুরি অবস্থা</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <ShieldAlert className="size-6 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-warning">{pendingIncidents.length}</p>
              <p className="text-xs text-muted-foreground">অপেক্ষমান অভিযোগ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <CheckCircle className="size-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">{incidents.filter(i => i.status === 'resolved').length}</p>
              <p className="text-xs text-muted-foreground">সমাধানকৃত</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <Eye className="size-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{incidents.length}</p>
              <p className="text-xs text-muted-foreground">সর্বমোট রিপোর্ট</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="size-5" />
              সম্প্রতি জমাকৃত ঘটনা
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {incidents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">কোনো ঘটনার রিপোর্ট নেই</p>
            ) : (
              <div className="divide-y divide-border">
                {incidents.map((incident) => (
                  <div key={incident.id} className="p-4 sm:p-6 hover:bg-muted/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={
                          incident.severity === 'critical' ? 'bg-destructive/10 text-destructive' :
                          incident.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
                          incident.severity === 'medium' ? 'bg-warning/10 text-warning' :
                          'bg-primary/10 text-primary'
                        }>
                          {incident.severity.toUpperCase()}
                        </Badge>
                        <h3 className="font-semibold text-base">{incident.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{incident.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> {new Date(incident.created_at).toLocaleString('bn-BD')}</span>
                        {incident.constituency_id && <span className="flex items-center gap-1"><MapPin className="size-3" /> Area: {incident.constituency_id.slice(0, 8)}</span>}
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                      {incident.status !== 'resolved' ? (
                        <>
                          <Button size="sm" variant={incident.status === 'investigating' ? 'default' : 'outline'} className="w-full"
                            onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                            disabled={incident.status === 'investigating'}
                          >
                            তদন্তাধীন
                          </Button>
                          <Button size="sm" variant="outline" className="w-full text-success border-success/30 hover:bg-success/10"
                            onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                          >
                            <CheckCircle className="size-3 mr-1" /> সমাধান করুন
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-0 px-3 py-1.5 w-full justify-center">
                          <CheckCircle className="size-3 mr-1" />
                          সমাধানকৃত
                        </Badge>
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
