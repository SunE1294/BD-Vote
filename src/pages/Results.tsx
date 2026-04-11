import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, 
  Download, 
  RefreshCw, 
  Shield, 
  Sparkles,
  ExternalLink,
  CheckCircle,
  Clock,
  Users,
  Vote,
  BarChart3,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatTxHash, getExplorerUrl, getOnChainCandidateVotes, getAllOnChainVotes, BD_VOTE_CONTRACT_ADDRESS } from "@/lib/blockchain";

const toBengaliNumerals = (num: string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit)]);
};

const formatBengaliNumber = (num: number): string => {
  return toBengaliNumerals(num.toLocaleString('en-IN'));
};

const PARTY_COLORS: Record<string, string> = {
  'নীল দল': 'bg-primary',
  'সবুজ দল': 'bg-success',
  'কমলা দল': 'bg-warning',
  'স্বতন্ত্র': 'bg-muted-foreground',
};

const getPartyColor = (party: string | null, index: number): string => {
  if (party && PARTY_COLORS[party]) return PARTY_COLORS[party];
  const fallback = ['bg-primary', 'bg-success', 'bg-warning', 'bg-muted-foreground'];
  return fallback[index % fallback.length];
};

async function fetchCandidateResults() {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, full_name, party, vote_count, photo_url')
    .eq('is_active', true)
    .order('vote_count', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchRecentVotes(limit = 10) {
  const { data, error } = await supabase
    .from('votes')
    .select('id, tx_hash, voter_id_hash, status, created_at, network, candidate_id, candidates(full_name, party)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function fetchVoterStats() {
  const { count: totalVoters } = await supabase
    .from('voters_master')
    .select('*', { count: 'exact', head: true });

  const { count: votedCount } = await supabase
    .from('voters_master')
    .select('*', { count: 'exact', head: true })
    .eq('has_voted', true);

  return {
    totalVoters: totalVoters || 0,
    votedCount: votedCount || 0,
    turnout: totalVoters ? ((votedCount || 0) / totalVoters * 100).toFixed(1) : '0',
  };
}

export default function Results() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return toBengaliNumerals(now.toLocaleTimeString('en-GB', { hour12: false }));
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['results-candidates'],
    queryFn: fetchCandidateResults,
    refetchInterval: 30000,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['results-transactions'],
    queryFn: () => fetchRecentVotes(10),
    refetchInterval: 15000,
  });

  const { data: voterStats, isLoading: statsLoading } = useQuery({
    queryKey: ['results-voter-stats'],
    queryFn: fetchVoterStats,
    refetchInterval: 30000,
  });

  // On-chain data — fetched directly from smart contract
  const { data: onChainVotes = [], isLoading: onChainLoading, refetch: refetchOnChain } = useQuery({
    queryKey: ['results-onchain-votes'],
    queryFn: () => getOnChainCandidateVotes(candidates.map(c => ({ id: c.id, full_name: c.full_name }))),
    enabled: candidates.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: onChainHistory = [], isLoading: onChainHistoryLoading, refetch: refetchOnChainHistory } = useQuery({
    queryKey: ['results-onchain-history'],
    queryFn: getAllOnChainVotes,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const totalOnChainVotes = onChainVotes.reduce((sum, c) => sum + c.onChainVotes, 0);
  const totalVotes = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('results-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        queryClient.invalidateQueries({ queryKey: ['results-candidates'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['results-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['results-voter-stats'] });
        queryClient.invalidateQueries({ queryKey: ['results-candidates'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['results-candidates'] }),
      queryClient.invalidateQueries({ queryKey: ['results-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['results-voter-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['results-onchain-votes'] }),
      queryClient.invalidateQueries({ queryKey: ['results-onchain-history'] }),
    ]);
    const now = new Date();
    setCurrentTime(toBengaliNumerals(now.toLocaleTimeString('en-GB', { hour12: false })));
  }, [queryClient]);

  const {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    shouldRefresh,
  } = usePullToRefresh({ onRefresh: handleRefresh });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(toBengaliNumerals(now.toLocaleTimeString('en-GB', { hour12: false })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const turnoutPercent = voterStats?.turnout || '০';

  const stats = [
    { label: "মোট সংগৃহীত ভোট", value: formatBengaliNumber(totalVotes), change: totalVotes > 0 ? "সরাসরি" : undefined, icon: Vote },
    { label: "ভোটার উপস্থিতির হার", value: toBengaliNumerals(`${turnoutPercent}%`), subtext: `${formatBengaliNumber(voterStats?.votedCount || 0)} জন ভোট দিয়েছেন`, icon: Users },
    { label: "নিবন্ধিত ভোটার", value: formatBengaliNumber(voterStats?.totalVoters || 0), subtext: "যাচাইকৃত ডাটা", icon: BarChart3 },
    { label: "সর্বশেষ আপডেট", value: currentTime, subtext: "সরাসরি সচল", icon: Clock },
  ];

  const isLoading = candidatesLoading || txLoading || statsLoading;

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-background overflow-auto">
      <Navbar variant="app" />

      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={progress}
        shouldRefresh={shouldRefresh}
      />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div>
              <Badge className="bg-destructive/10 text-destructive border-0 mb-2 sm:mb-3">
                <span className="size-1.5 sm:size-2 bg-destructive rounded-full mr-1.5 sm:mr-2 animate-pulse" />
                সরাসরি আপডেট
              </Badge>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">লাইভ নির্বাচনের ফলাফল</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                রিয়েল-টাইম ব্লকচেইন ও ডাটাবেস থেকে সরাসরি তথ্য
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Download className="size-3.5 sm:size-4 mr-1.5 sm:mr-2" />
                <span className="hidden xs:inline">রিপোর্ট</span> ডাউনলোড
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={cn("size-3.5 sm:size-4 mr-1.5 sm:mr-2", isLoading && "animate-spin")} />
                রিফ্রেশ
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4 mb-6 sm:mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-[10px] sm:text-xs mb-1">
                      <stat.icon className="size-3 sm:size-4 shrink-0" />
                      <span className="truncate leading-tight">{stat.label}</span>
                    </div>
                    <p className="text-base sm:text-xl lg:text-2xl font-bold truncate">{stat.value}</p>
                    {stat.change ? (
                      <p className="text-[10px] sm:text-xs text-success flex items-center gap-0.5 sm:gap-1">
                        <TrendingUp className="size-2.5 sm:size-3 shrink-0" />
                        {stat.change}
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-primary truncate">{stat.subtext}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8 mb-6 sm:mb-8">
            {/* Vote Results */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                        <BarChart3 className="size-4 sm:size-5" />
                        ভোটের পরিসংখ্যান
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">প্রার্থী ভিত্তিক ফলাফল</p>
                    </div>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-0 text-[10px] sm:text-xs shrink-0">
                      LIVE
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-4 sm:space-y-5">
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : candidates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">কোনো প্রার্থী পাওয়া যায়নি</p>
                  ) : (
                    candidates.map((candidate, index) => {
                      const percent = totalVotes > 0 ? Math.round((candidate.vote_count / totalVotes) * 100) : 0;
                      return (
                        <div key={candidate.id}>
                          <div className="flex justify-between mb-1.5 sm:mb-2 gap-2">
                            <span className="font-medium text-sm sm:text-base truncate">
                              {candidate.full_name}
                              {candidate.party && (
                                <span className="text-muted-foreground text-xs ml-1">({candidate.party})</span>
                              )}
                            </span>
                            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                              {formatBengaliNumber(candidate.vote_count)} ({toBengaliNumerals(`${percent}`)}%)
                            </span>
                          </div>
                          <Progress value={percent} className={`h-2 sm:h-3 ${getPartyColor(candidate.party, index)}`} />
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">ভোট গ্রহণের সারাংশ</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">রিয়েল-টাইম ডাটাবেস থেকে</p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {candidates.slice(0, 3).map((c, i) => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className={cn(
                            "size-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground",
                            i === 0 ? "bg-primary" : i === 1 ? "bg-success" : "bg-warning"
                          )}>
                            {toBengaliNumerals(`${i + 1}`)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground">{c.party || 'স্বতন্ত্র'}</p>
                          </div>
                          <p className="font-bold text-sm">{formatBengaliNumber(c.vote_count)}</p>
                        </div>
                      ))}
                      {totalVotes === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-4">এখনো কোনো ভোট জমা হয়নি</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>



          {/* Blockchain Live Vote Counts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-6 sm:mt-8"
          >
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Shield className="size-4 sm:size-5 text-primary" />
                      ব্লকচেইন থেকে সরাসরি ভোট গণনা
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      স্মার্ট কন্ট্রাক্ট: <a href={`https://sepolia.basescan.org/address/${BD_VOTE_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">{BD_VOTE_CONTRACT_ADDRESS.slice(0,6)}...{BD_VOTE_CONTRACT_ADDRESS.slice(-4)}</a> · Base Sepolia
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { refetchOnChain(); refetchOnChainHistory(); }} disabled={onChainLoading}>
                    <RefreshCw className={cn("size-3.5 mr-1.5", onChainLoading && "animate-spin")} />
                    রিফ্রেশ
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                {/* Per-candidate on-chain counts */}
                {onChainLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">ব্লকচেইন থেকে ডেটা আনা হচ্ছে...</span>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
                      <span>প্রার্থী</span>
                      <span className="text-center">ব্লকচেইন ভোট</span>
                      <span className="text-center">DB ভোট</span>
                    </div>
                    {onChainVotes.map((c) => {
                      const dbCandidate = candidates.find(d => d.id === c.id);
                      const dbVotes = dbCandidate?.vote_count || 0;
                      const inSync = c.onChainVotes === dbVotes;
                      return (
                        <div key={c.id} className="grid grid-cols-3 items-center py-2 border-b border-border/50 last:border-0">
                          <span className="text-sm font-medium truncate pr-2">{c.full_name}</span>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-lg font-bold text-primary">{formatBengaliNumber(c.onChainVotes)}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-lg font-bold">{formatBengaliNumber(dbVotes)}</span>
                            {inSync ? (
                              <CheckCircle className="size-3.5 text-success shrink-0" />
                            ) : (
                              <span className="text-[10px] text-warning bg-warning/10 px-1 rounded">sync</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {onChainVotes.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-4">এখনো কোনো ভোট ব্লকচেইনে নেই</p>
                    )}
                    <div className="grid grid-cols-3 items-center pt-2 font-bold text-sm">
                      <span>মোট</span>
                      <span className="text-center text-primary">{formatBengaliNumber(totalOnChainVotes)}</span>
                      <span className="text-center">{formatBengaliNumber(totalVotes)}</span>
                    </div>
                  </div>
                )}

                {/* On-chain vote history */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    ব্লকচেইন ভোটের ইতিহাস
                  </h4>
                  {onChainHistoryLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : onChainHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">ব্লকচেইনে কোনো ভোট নেই</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground border-b border-border">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">প্রার্থী</th>
                            <th className="pb-2 font-medium">সময়</th>
                            <th className="pb-2 font-medium">ভোটার হ্যাশ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {onChainHistory.map((v) => (
                            <tr key={v.index} className="hover:bg-muted/40">
                              <td className="py-2 text-muted-foreground">#{toBengaliNumerals(String(v.index + 1))}</td>
                              <td className="py-2 font-medium">{v.candidateName || '—'}</td>
                              <td className="py-2 text-muted-foreground text-xs">
                                {v.timestamp ? new Date(v.timestamp * 1000).toLocaleString('bn-BD') : '—'}
                              </td>
                              <td className="py-2">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {v.voterIdHash ? `${v.voterIdHash.slice(0, 8)}...${v.voterIdHash.slice(-4)}` : '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 sm:mt-8 lg:mt-12"
          >
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                <div className="size-12 sm:size-14 lg:size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Shield className="size-6 sm:size-7 lg:size-8 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1.5 sm:mb-2">ব্লকচেইন-ফার্স্ট নিরাপত্তা</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  প্রতিটি ভোট সরাসরি ব্লকচেইনে রেকর্ড হয়। ডাটাবেস শুধুমাত্র ক্যাশ হিসেবে কাজ করে — ব্লকচেইনই একমাত্র কর্তৃত্ব। কেউ এই রেকর্ড পরিবর্তন করতে পারে না।
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
