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
  BarChart3
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

const toBengaliNumerals = (num: string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit)]);
};

const getStats = (currentTime: string) => [
  { label: "মোট সংগৃহীত ভোট", value: "১২,৪৫,৬৭৮", change: "+১২.৪%", icon: Vote },
  { label: "ভোটার উপস্থিতির হার", value: "৭৮.৫%", change: "+১.২%", icon: Users },
  { label: "নিবন্ধিত ভোটার", value: "১৫,৮৬,০০০", subtext: "যাচাইকৃত ডাটা", icon: BarChart3 },
  { label: "সর্বশেষ আপডেট", value: currentTime, subtext: "সরাসরি সচল", icon: Clock },
];

const candidates = [
  { name: "প্রার্থী ক (নীল দল)", votes: "৫,২০,০০০", percent: 42, color: "bg-primary" },
  { name: "প্রার্থী খ (সবুজ দল)", votes: "৩,৮০,০০০", percent: 31, color: "bg-success" },
  { name: "প্রার্থী গ (কমলা দল)", votes: "২,১৫,০০০", percent: 17, color: "bg-warning" },
  { name: "প্রার্থী ঘ (স্বতন্ত্র)", votes: "১,৩০,৬৭৮", percent: 10, color: "bg-muted-foreground" },
];

const transactions = [
  { id: "0x7f2e...9a1c", time: "১৪:৩১:২০", status: "verified", network: "১২৮ নোড কনফার্মড" },
  { id: "0x4c9a...11b2", time: "১৪:৩০:৫৮", status: "verified", network: "১১৫ নোড কনফার্মড" },
  { id: "0x1b4d...f088", time: "১৪:৩০:৪৫", status: "pending", network: "২৪ নোড কনফার্মড" },
  { id: "0x9e5a...dd32", time: "১৪:৩০:১০", status: "verified", network: "১৩০ নোড কনফার্মড" },
];

export default function Results() {
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return toBengaliNumerals(now.toLocaleTimeString('en-GB', { hour12: false }));
  });

  const handleRefresh = useCallback(async () => {
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    const now = new Date();
    setCurrentTime(toBengaliNumerals(now.toLocaleTimeString('en-GB', { hour12: false })));
  }, []);

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

  const stats = getStats(currentTime);

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
                রিয়েল-টাইম ব্লকচেইন ও AI ডাটা বিশ্লেষণ
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Download className="size-3.5 sm:size-4 mr-1.5 sm:mr-2" />
                <span className="hidden xs:inline">রিপোর্ট</span> ডাউনলোড
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                <RefreshCw className="size-3.5 sm:size-4 mr-1.5 sm:mr-2" />
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
                  {candidates.map((candidate, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1.5 sm:mb-2 gap-2">
                        <span className="font-medium text-sm sm:text-base truncate">{candidate.name}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                          {candidate.votes} ({candidate.percent}%)
                        </span>
                      </div>
                      <Progress value={candidate.percent} className={`h-2 sm:h-3 ${candidate.color}`} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Chart Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">ভোট গ্রহণের গতিপ্রকৃতি</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">প্রতি ঘন্টায় ভোটের ট্রেন্ড</p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                  <div className="h-48 sm:h-56 lg:h-64 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="size-8 sm:size-12 mx-auto mb-1.5 sm:mb-2 text-primary/50" />
                      <p className="text-sm sm:text-base">রিয়েল-টাইম চার্ট</p>
                      <p className="text-xs sm:text-sm">ডাটা লোড হচ্ছে...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Blockchain Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                  <Sparkles className="size-4 sm:size-5" />
                  ব্লকচেইন ট্রানজ্যাকশন
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile Card View */}
                <div className="block sm:hidden divide-y divide-border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <a href="#" className="text-primary font-mono text-xs flex items-center gap-1">
                          {tx.id}
                          <ExternalLink className="size-3" />
                        </a>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px]",
                            tx.status === 'verified' 
                              ? "bg-success/10 text-success border-0" 
                              : "bg-warning/10 text-warning border-0"
                          )}
                        >
                          {tx.status === 'verified' ? (
                            <><CheckCircle className="size-2.5 mr-1" />যাচাইকৃত</>
                          ) : (
                            <><Clock className="size-2.5 mr-1" />অপেক্ষমান</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{tx.time}</span>
                        <span>{tx.network}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border">
                      <tr className="text-left text-xs sm:text-sm text-muted-foreground">
                        <th className="px-4 sm:px-6 py-3 font-medium">ভোট আইডি</th>
                        <th className="px-4 sm:px-6 py-3 font-medium">সময়</th>
                        <th className="px-4 sm:px-6 py-3 font-medium">স্ট্যাটাস</th>
                        <th className="px-4 sm:px-6 py-3 font-medium">নেটওয়ার্ক</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/50">
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <a href="#" className="text-primary hover:underline font-mono text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                              {tx.id}
                              <ExternalLink className="size-3" />
                            </a>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">{tx.time}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                tx.status === 'verified' 
                                  ? "bg-success/10 text-success border-0" 
                                  : "bg-warning/10 text-warning border-0"
                              )}
                            >
                              {tx.status === 'verified' ? (
                                <><CheckCircle className="size-3 mr-1" />যাচাইকৃত</>
                              ) : (
                                <><Clock className="size-3 mr-1" />অপেক্ষমান</>
                              )}
                            </Badge>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">{tx.network}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 sm:p-4 text-center">
                  <Button variant="link" className="text-primary text-xs sm:text-sm">
                    আরো ট্রানজ্যাকশন দেখুন
                  </Button>
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
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1.5 sm:mb-2">ব্লকচেইন নিরাপত্তা নিশ্চিত</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  এই তথ্যগুলো সরাসরি ব্লকচেইন নেটওয়ার্ক থেকে আসছে। প্রতি মিনিটে ডাটা সিন্ক্রোনাইজ করা হয় যাতে ভোটারদের সঠিক ও অপরিবর্তনীয় তথ্য প্রদান করা যায়।
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
