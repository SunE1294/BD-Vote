import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Plus, Vote, Shield, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { BallotSkeleton } from "@/components/ui/skeleton-loader";
import { FaceVerificationModal } from "@/components/ballot/FaceVerificationModal";
import { toast } from "sonner";
import { castVoteOnChain, isBlockchainConfigured } from "@/lib/blockchain";
import { getVoterSession } from "@/lib/voter-session";

interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  symbolBg: string;
  image: string;
}

const candidates: Candidate[] = [
  {
    id: "1",
    name: "আব্দুর রহমান",
    party: "বাংলাদেশ আওয়ামী লীগ",
    symbol: "নৌকা",
    symbolBg: "bg-primary/10",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=abdur&backgroundColor=b6e3f4"
  },
  {
    id: "2",
    name: "মোসাম্মাৎ ফাতেমা বেগম",
    party: "বাংলাদেশ জাতীয়তাবাদী দল",
    symbol: "ধানের শীষ",
    symbolBg: "bg-success/10",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=fatema&backgroundColor=ffd5dc"
  },
  {
    id: "3",
    name: "নজরুল ইসলাম",
    party: "জাতীয় পার্টি",
    symbol: "লাঙল",
    symbolBg: "bg-warning/10",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=nazrul&backgroundColor=c0aede"
  },
  {
    id: "4",
    name: "সৈয়দা সুলতানা",
    party: "ইসলামী আন্দোলন বাংলাদেশ",
    symbol: "হাতপাখা",
    symbolBg: "bg-accent",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=sultana&backgroundColor=ffdfbf"
  },
  {
    id: "5",
    name: "মোঃ আমিনুল হক",
    party: "স্বতন্ত্র",
    symbol: "ঘড়া",
    symbolBg: "bg-muted",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=aminul&backgroundColor=d1d4f9"
  },
  {
    id: "6",
    name: "বিপ্লব কুমার রায়",
    party: "স্বতন্ত্র",
    symbol: "মোমবাতি",
    symbolBg: "bg-warning/10",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=biplob&backgroundColor=baffc9"
  },
];

export default function Ballot() {
  const navigate = useNavigate();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, addToQueue } = useOfflineQueue();

  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleConfirmVote = () => {
    setShowFaceVerification(true);
  };

  const handleVerificationComplete = async () => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    setShowFaceVerification(false);

    if (!isOnline) {
      addToQueue('vote', { candidateId: selectedCandidate.id, candidateName: selectedCandidate.name });
      toast.info('অফলাইন মোড', {
        description: 'আপনার ভোট সংরক্ষিত হয়েছে। ইন্টারনেট ফিরলে স্বয়ংক্রিয়ভাবে জমা হবে।',
      });
      setIsSubmitting(false);
      navigate('/dashboard');
      return;
    }

    try {
      if (isBlockchainConfigured()) {
        const session = getVoterSession();
        if (!session) throw new Error('Voter session not found. Please verify your identity again.');

        const txHash = await castVoteOnChain(parseInt(selectedCandidate.id), session.privateKey);
        toast.success('ভোট সফলভাবে জমা হয়েছে', {
          description: `TX: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`,
        });
      } else {
        // Demo mode — no contract configured yet
        await new Promise((resolve) => setTimeout(resolve, 1200));
        toast.success('ভোট সফলভাবে জমা হয়েছে', {
          description: 'আপনার ভোট ব্লকচেইনে নিরাপদে সংরক্ষিত হয়েছে।',
        });
      }
      navigate('/results');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'অজানা ত্রুটি';
      toast.error('ভোট জমা ব্যর্থ হয়েছে', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar variant="app" />
        <BallotSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar variant="app" />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
          {/* Progress */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Vote className="size-5 text-primary" />
                  <span className="font-medium">ভোটদান প্রক্রিয়া</span>
                </div>
                <span className="text-sm text-muted-foreground">ধাপ ২ / ৩</span>
              </div>
              <Progress value={66} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                আপনার পছন্দের প্রার্থীর কার্ডে 'বাছাই করুন' ক্লিক করুন
              </p>
            </CardContent>
          </Card>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">পছন্দের প্রার্থী নির্বাচন করুন</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                জাতীয় সংসদ নির্বাচন {new Date().getFullYear()} | ঢাকা-১০ আসন
              </p>
            </div>
            <Badge className={cn(
              "border-0 self-start whitespace-nowrap",
              isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            )}>
              {isOnline ? (
                <>
                  <CheckCircle className="size-3 sm:size-4 mr-1" />
                  ব্লকচেইন সুরক্ষিত
                </>
              ) : (
                <>
                  <WifiOff className="size-3 sm:size-4 mr-1" />
                  অফলাইন মোড
                </>
              )}
            </Badge>
          </div>

          {/* Candidates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {candidates.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer",
                    selectedCandidate?.id === candidate.id && "ring-2 ring-primary shadow-lg"
                  )}
                  onClick={() => handleSelect(candidate)}
                >
                  {selectedCandidate?.id === candidate.id && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="size-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle className="size-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  <CardContent className="p-0">
                    <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <img 
                        src={candidate.image} 
                        alt={candidate.name}
                        className="w-full h-full object-contain p-4"
                      />
                      <div className={cn("absolute top-4 right-4", selectedCandidate?.id === candidate.id && "hidden")}>
                        <div className={cn("size-10 rounded-lg flex items-center justify-center", candidate.symbolBg)}>
                          <Vote className="size-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{candidate.name}</h3>
                      <p className="text-sm text-primary mb-1">প্রতীক: {candidate.symbol}</p>
                      <p className="text-sm text-muted-foreground mb-4">{candidate.party}</p>

                      <Button 
                        variant={selectedCandidate?.id === candidate.id ? "default" : "outline"}
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(candidate);
                        }}
                      >
                        {selectedCandidate?.id === candidate.id ? (
                          <>
                            <CheckCircle className="size-4 mr-2" />
                            বাছাই করা হয়েছে
                          </>
                        ) : (
                          <>
                            <Plus className="size-4 mr-2" />
                            বাছাই করুন
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Bottom Bar */}
          {selectedCandidate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-primary/20 bg-card">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="size-10 sm:size-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Shield className="size-5 sm:size-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-primary text-sm sm:text-base">ভোট এনক্রিপশন সক্রিয়</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        নিশ্চিত করার আগে আপনার বাছাই পুনরায় যাচাই করুন।
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setSelectedCandidate(null)}>
                      বাতিল করুন
                    </Button>
                    <Button size="sm" className="flex-1 sm:flex-none" onClick={handleConfirmVote}>
                      <CheckCircle className="size-4 mr-2" />
                      ভোট নিশ্চিত করুন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground mt-8 sm:mt-12">
            <div className="flex items-center gap-2">
              <Shield className="size-4" />
              <span>SHA-256 SECURED</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <span>DISTRIBUTED LEDGER</span>
            </div>
            <span>© {new Date().getFullYear()} BD Vote BANGLADESH</span>
          </div>
        </div>
      </main>

      {/* Face Verification Modal */}
      <FaceVerificationModal
        open={showFaceVerification}
        onOpenChange={setShowFaceVerification}
        onVerificationComplete={handleVerificationComplete}
        candidateName={selectedCandidate?.name || ''}
      />
    </div>
  );
}
