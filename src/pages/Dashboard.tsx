import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getVoterSession } from "@/lib/voter-session";
import { checkVoted, isBlockchainConfigured } from "@/lib/blockchain";
import { 
  CreditCard, 
  Wallet, 
  Vote, 
  Clock, 
  History, 
  LogIn, 
  CheckCircle, 
  RefreshCw, 
  Mail, 
  ArrowRight, 
  BarChart3,
  Copy,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn, toBengaliNumerals } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";

const pad2 = (n: number) => toBengaliNumerals(String(n).padStart(2, '0'));

// Voting deadline - set to 5 hours from now for demo
const VOTING_DEADLINE = new Date(Date.now() + 5 * 60 * 60 * 1000 + 12 * 60 * 1000);

// Fallback values shown before session data is loaded
const DEFAULT_USER = {
  name:   "আহমেদ শরীফ",
  id:     "৫৬৭৮-৯০১২-৩৪৫৬",
  wallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  voted:  false,
  center: "ঢাকা সিটি কলেজ কেন্দ্র, ধানমন্ডি",
};

type ColorVariant = 'green' | 'blue' | 'orange' | 'red';

const colorStyles: Record<ColorVariant, { bg: string; text: string; border: string; icon: string }> = {
  green: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', icon: 'bg-success/10 text-success' },
  blue: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', icon: 'bg-primary/10 text-primary' },
  orange: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', icon: 'bg-warning/10 text-warning' },
  red: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20', icon: 'bg-destructive/10 text-destructive' },
};

interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  tag: string;
  color: ColorVariant;
  copyable?: boolean;
}

function InfoCard({ icon: Icon, title, value, tag, color, copyable }: InfoCardProps) {
  const c = colorStyles[color];

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success("কপি করা হয়েছে!");
  };

  return (
    <div className="bg-card p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group flex flex-col gap-2 sm:gap-3 relative overflow-hidden">
      <div className="flex justify-between items-start z-10">
        <div className={cn("size-8 sm:size-10 rounded-lg flex items-center justify-center", c.icon)}>
          <Icon className="size-4 sm:size-5" />
        </div>
        <span className={cn("px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border", c.bg, c.text, c.border)}>
          {tag}
        </span>
      </div>
      
      <div className="z-10">
        <h4 className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wide mb-1">{title}</h4>
        <div className="flex items-center gap-2">
          <p className="text-foreground font-mono font-bold text-sm sm:text-base md:text-lg truncate">{value}</p>
          {copyable && (
            <button 
              onClick={handleCopy}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              title="Copy"
            >
              <Copy className="size-3 sm:size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface LogItemProps {
  icon: React.ElementType;
  text: string;
  time: string;
  colorClass: string;
}

function LogItem({ icon: Icon, text, time, colorClass }: LogItemProps) {
  return (
    <div className="py-2 sm:py-3 flex items-center justify-between group cursor-default">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-1 sm:p-1.5 rounded-md bg-muted group-hover:bg-card transition-colors shrink-0">
          <Icon className={cn("size-4 sm:size-5", colorClass)} />
        </div>
        <span className="text-xs sm:text-sm font-medium text-foreground truncate">{text}</span>
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium shrink-0 ml-2">{time}</span>
    </div>
  );
}

function DashboardContent() {
  const [user, setUser] = useState(DEFAULT_USER);
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const diff = VOTING_DEADLINE.getTime() - Date.now();
    return Math.max(0, diff);
  });

  // Hydrate from session and check on-chain voted status
  useEffect(() => {
    const session = getVoterSession();
    if (!session) return;

    setUser(prev => ({
      ...prev,
      name:   session.name   || prev.name,
      id:     session.voterId || prev.id,
      wallet: session.walletAddress || prev.wallet,
    }));

    if (isBlockchainConfigured()) {
      checkVoted(session.walletAddress)
        .then(voted => setUser(prev => ({ ...prev, voted })))
        .catch(console.warn);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("ডাটা রিফ্রেশ হয়েছে!");
  }, []);

  const {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    shouldRefresh,
  } = usePullToRefresh({ onRefresh: handleRefresh });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = VOTING_DEADLINE.getTime() - Date.now();
      setTimeRemaining(Math.max(0, diff));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate hours, minutes, seconds
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  
  const countdownDisplay = `${pad2(hours)} ঘণ্টা ${pad2(minutes)} মিনিট ${pad2(seconds)} সেকেন্ড`;
  const isExpired = timeRemaining === 0;

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-primary font-medium">হোম</span>
          <span>/</span>
          <span>ড্যাশবোর্ড</span>
        </div>
      </header>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          progress={progress}
          shouldRefresh={shouldRefresh}
        />
        
        <div className="p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">
          
            {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1 sm:gap-2">
              <p className="text-muted-foreground font-medium text-sm sm:text-base">শুভ অপরাহ্ন,</p>
              <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">{user.name}</h2>
            </div>
            <div className="flex items-center gap-2 bg-card px-3 sm:px-4 py-2 rounded-full border border-border shadow-sm self-start md:self-auto">
              <div className="size-2 rounded-full bg-success animate-pulse"></div>
              <span className="text-xs sm:text-sm font-bold text-foreground">নেটওয়ার্ক সচল (Polygon)</span>
            </div>
          </div>

          {/* Status Banner */}
          <div className={cn(
            "relative overflow-hidden rounded-xl sm:rounded-2xl border shadow-sm p-4 sm:p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 transition-all",
            user.voted 
              ? "bg-gradient-to-br from-success/10 to-card border-success/20" 
              : "bg-gradient-to-br from-primary/10 to-card border-primary/20"
          )}>
            
            <div className="flex gap-4 sm:gap-6 items-center z-10">
              <div className={cn(
                "size-12 sm:size-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0",
                user.voted 
                  ? "bg-success text-success-foreground" 
                  : "bg-card text-primary border border-primary/20"
              )}>
                {user.voted ? <UserCheck className="size-6 sm:size-8" /> : <Vote className="size-6 sm:size-8" />}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className={cn("text-lg sm:text-xl md:text-2xl font-black", user.voted ? "text-success" : "text-foreground")}>
                  {user.voted ? "ভোট প্রদান সম্পন্ন হয়েছে" : "আপনার ভোট এখনো বাকি"}
                </h3>
                <p className="text-muted-foreground max-w-lg text-sm sm:text-base md:text-lg">
                  {user.voted 
                    ? "ধন্যবাদ! আপনার ভোটটি ব্লকচেইনে সফলভাবে রেকর্ড করা হয়েছে।"
                    : "গণতন্ত্রের চর্চায় অংশ নিন। এখনই আপনার ভোটাধিকার প্রয়োগ করুন।"
                  }
                </p>
              </div>
            </div>
            
            <div className="z-10 w-full md:w-auto">
              {!user.voted ? (
                <Link to="/ballot">
                  <button className="w-full md:w-auto min-w-[180px] sm:min-w-[200px] flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 sm:py-4 px-6 sm:px-8 rounded-xl font-bold text-base sm:text-lg hover:bg-primary/90 hover:shadow-lg hover:-translate-y-1 transition-all">
                    ভোট দিন
                    <ArrowRight className="size-4 sm:size-5" />
                  </button>
                </Link>
              ) : (
                <Link to="/results">
                  <button className="w-full md:w-auto min-w-[180px] sm:min-w-[200px] flex items-center justify-center gap-2 bg-card text-success border border-success/20 py-3 sm:py-4 px-6 sm:px-8 rounded-xl font-bold text-base sm:text-lg hover:bg-success/5 transition-all shadow-sm">
                    ফলাফল দেখুন
                    <BarChart3 className="size-4 sm:size-5" />
                  </button>
                </Link>
              )}
            </div>

            {/* Background Decoration */}
            <div className={cn(
              "absolute -right-10 -bottom-10 size-32 sm:size-64 rounded-full opacity-10 pointer-events-none",
              user.voted ? "bg-success" : "bg-primary"
            )}></div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Left Column: Personal Info */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <InfoCard 
                icon={CreditCard} 
                title="জাতীয় পরিচয়পত্র" 
                value={user.id} 
                tag="ভেরিফাইড" 
                color="green" 
              />
              <InfoCard 
                icon={Wallet} 
                title="ওয়ালেট অ্যাড্রেস" 
                value={user.wallet} 
                tag="Testnet" 
                color="blue" 
                copyable
              />
              <InfoCard 
                icon={Vote} 
                title="ভোট কেন্দ্র" 
                value={user.center} 
                tag="নির্ধারিত" 
                color="orange" 
              />
              <InfoCard 
                icon={Clock} 
                title="ভোটের সময় বাকি" 
                value={isExpired ? "সময় শেষ" : countdownDisplay} 
                tag={isExpired ? "শেষ" : "চলমান"} 
                color="red" 
              />
            </div>

            {/* Right Column: Recent Activity */}
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-sm p-4 sm:p-6 flex flex-col h-full">
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                <History className="size-4 sm:size-5 text-muted-foreground" />
                অ্যাক্টিভিটি লগ
              </h3>
              <div className="flex flex-col gap-0 divide-y divide-border">
                <LogItem icon={LogIn} text="লগইন সফল হয়েছে" time="২ মিনিট আগে" colorClass="text-success" />
                <LogItem icon={CheckCircle} text="বায়োমেট্রিক যাচাই সম্পন্ন" time="১ ঘণ্টা আগে" colorClass="text-primary" />
                <LogItem icon={RefreshCw} text="ভোটার তালিকা হালনাগাদ" time="গতকাল" colorClass="text-muted-foreground" />
                <LogItem icon={Mail} text="নোটিফিকেশন পাঠানো হয়েছে" time="গতকাল" colorClass="text-muted-foreground" />
              </div>
              <button className="mt-auto pt-4 text-primary text-xs sm:text-sm font-bold hover:underline text-center w-full">
                সব দেখুন
              </button>
            </div>

          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar />
        <DashboardContent />
      </div>
    </SidebarProvider>
  );
}