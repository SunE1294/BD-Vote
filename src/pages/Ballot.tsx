import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Plus, Vote, Shield, Sparkles, WifiOff, Loader2, AlertCircle, Copy, ExternalLink, Receipt, Zap } from "lucide-react";
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
import { useVotes } from "@/hooks/use-votes";
import { useCandidates } from "@/hooks/use-candidates";
import { useActiveElection } from "@/hooks/use-election-config";
import { formatTxHash, getExplorerUrl } from "@/lib/blockchain";

export default function Ballot() {
  const navigate = useNavigate();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState<{ txHash: string; receiptHash: string } | null>(null);
  const { isOnline, addToQueue } = useOfflineQueue();
  const { castVote, isSubmitting } = useVotes();

  // Fetch real candidates from database
  const { data: candidates, isLoading: candidatesLoading, error: candidatesError } = useCandidates();
  const { data: election } = useActiveElection();

  const voterData = JSON.parse(sessionStorage.getItem('verified_voter') || 'null');

  // Get verified voter ID from sessionStorage (set during verification)
  const verifiedVoterId = sessionStorage.getItem('verified_voter_id');

  // Filter only active candidates
  const activeCandidates = (candidates || []).filter(c => c.is_active);
  const selectedCandidate = activeCandidates.find(c => c.id === selectedCandidateId) || null;

  const handleSelect = (candidateId: string) => {
    if (!voteReceipt) {
      setSelectedCandidateId(candidateId);
    }
  };

  const handleConfirmVote = () => {
    if (!verifiedVoterId) {
      toast.error('আগে পরিচয় যাচাই করুন', {
        description: 'ভোট দেওয়ার আগে আইডি ও ফেস ভেরিফিকেশন সম্পন্ন করতে হবে।',
      });
      navigate('/verification');
      return;
    }
    setShowFaceVerification(true);
  };

  const handleVerificationComplete = async () => {
    setShowFaceVerification(false);
    
    if (!isOnline) {
      addToQueue('vote', { candidateId: selectedCandidateId, candidateName: selectedCandidate?.full_name });
      toast.info('অফলাইন মোড', {
        description: 'আপনার ভোট সংরক্ষিত হয়েছে। ইন্টারনেট ফিরলে স্বয়ংক্রিয়ভাবে জমা হবে।',
      });
      setTimeout(() => navigate('/dashboard'), 1000);
      return;
    }

    if (!selectedCandidateId || !verifiedVoterId) return;

    // Cast vote via edge function — blockchain-first
    const result = await castVote(verifiedVoterId, selectedCandidateId);

    if (result.success) {
      // Clear verified voter from session
      sessionStorage.removeItem('verified_voter_id');
      sessionStorage.removeItem('verified_voter_name');
      
      // Show receipt
      setVoteReceipt({
        txHash: result.tx_hash || '',
        receiptHash: result.receipt_hash || '',
      });

      toast.success('ভোট সফলভাবে ব্লকচেইনে জমা হয়েছে! ✅', {
        description: 'আপনার রিসিট সংরক্ষণ করুন।',
      });
    } else {
      toast.error('ভোট দিতে সমস্যা হয়েছে', {
        description: result.error || 'আবার চেষ্টা করুন।',
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} কপি করা হয়েছে`);
  };

  if (candidatesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar variant="app" />
        <BallotSkeleton />
      </div>
    );
  }

  if (candidatesError) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar variant="app" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">প্রার্থী তথ্য লোড করতে ব্যর্থ</h2>
              <p className="text-muted-foreground mb-4">ডাটাবেস থেকে প্রার্থীদের তথ্য আনতে সমস্যা হয়েছে।</p>
              <Button onClick={() => window.location.reload()}>আবার চেষ্টা করুন</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (activeCandidates.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar variant="app" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Vote className="size-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">কোনো প্রার্থী পাওয়া যায়নি</h2>
              <p className="text-muted-foreground">বর্তমানে কোনো সক্রিয় প্রার্থী নেই। অ্যাডমিন প্রার্থী যোগ করলে এখানে দেখা যাবে।</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ===== VOTE RECEIPT SCREEN =====
  if (voteReceipt) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar variant="app" />
        <main className="flex-1 py-8 lg:py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-success/20">
                <CardContent className="p-6 sm:p-8">
                  {/* Success Header */}
                  <div className="text-center mb-6">
                    <div className="size-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="size-10 text-success" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">ভোট সফল হয়েছে!</h2>
                    <p className="text-muted-foreground mb-4">
                      আপনার ভোট ব্লকচেইনে স্থায়ীভাবে রেকর্ড করা হয়েছে
                    </p>
                    {/* Status Badges */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Badge className="bg-success/10 text-success border-0 text-xs sm:text-sm">
                        <CheckCircle className="size-3.5 mr-1" />
                        ব্লকচেইনে নিশ্চিত
                      </Badge>
                      <Badge className="bg-primary/10 text-primary border-0 text-xs sm:text-sm">
                        <Zap className="size-3.5 mr-1" />
                        Base Sepolia
                      </Badge>
                      <Badge className="bg-muted text-muted-foreground border-0 text-xs sm:text-sm">
                        <Shield className="size-3.5 mr-1" />
                        এনক্রিপ্টেড
                      </Badge>
                    </div>
                  </div>

                  {/* Receipt Card */}
                  <div className="bg-muted/50 rounded-xl p-5 sm:p-6 space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <Receipt className="size-5" />
                        <span className="font-semibold text-lg">ভোট রিসিট</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleString('bn-BD')}
                      </span>
                    </div>

                    {/* Status row */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground">স্ট্যাটাস</span>
                      <Badge className="bg-success/10 text-success border-0 text-xs">
                        <CheckCircle className="size-3 mr-1" />
                        ব্লকচেইনে যাচাইকৃত
                      </Badge>
                    </div>

                    {/* Network row */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground">নেটওয়ার্ক</span>
                      <span className="text-xs font-medium">Base Sepolia (Chain 84532)</span>
                    </div>

                    {/* Candidate */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground">প্রার্থী</span>
                      <span className="text-sm font-medium text-right">
                        {selectedCandidate?.full_name}
                        {selectedCandidate?.party && (
                          <span className="text-muted-foreground text-xs ml-1">({selectedCandidate.party})</span>
                        )}
                      </span>
                    </div>

                    {/* TX Hash */}
                    {voteReceipt.txHash && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">ট্রানজ্যাকশন হ্যাশ (TX)</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-primary bg-primary/5 px-3 py-1.5 rounded-lg break-all flex-1">
                            {voteReceipt.txHash}
                          </code>
                          <Button variant="ghost" size="icon" className="shrink-0 size-8" onClick={() => copyToClipboard(voteReceipt.txHash, 'TX Hash')}>
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                        <a
                          href={getExplorerUrl(voteReceipt.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1.5"
                        >
                          <ExternalLink className="size-3" />
                          BaseScan-এ ব্লকচেইন যাচাই করুন
                        </a>
                      </div>
                    )}

                    {/* Receipt Hash (only if different from txHash) */}
                    {voteReceipt.receiptHash && voteReceipt.receiptHash !== voteReceipt.txHash && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">রিসিট হ্যাশ</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-success bg-success/5 px-3 py-1.5 rounded-lg break-all flex-1">
                            {voteReceipt.receiptHash}
                          </code>
                          <Button variant="ghost" size="icon" className="shrink-0 size-8" onClick={() => copyToClipboard(voteReceipt.receiptHash, 'Receipt')}>
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning */}
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-warning font-medium">
                      ⚠️ TX হ্যাশ সংরক্ষণ করুন — এটি দিয়ে যেকোনো সময় আপনার ভোট ব্লকচেইনে যাচাই করা যাবে।
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="flex-1" onClick={() => navigate('/results')}>
                      <CheckCircle className="size-4 mr-2" />
                      লাইভ ফলাফল দেখুন
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => navigate('/verify-vote')}>
                      <Shield className="size-4 mr-2" />
                      ভোট যাচাই করুন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // ===== NORMAL BALLOT SCREEN =====
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
                {election?.election_name || `জাতীয় সংসদ নির্বাচন ${new Date().getFullYear()}`}
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
            {activeCandidates.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer",
                    selectedCandidateId === candidate.id && "ring-2 ring-primary shadow-lg"
                  )}
                  onClick={() => handleSelect(candidate.id)}
                >
                  {selectedCandidateId === candidate.id && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="size-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle className="size-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  <CardContent className="p-0">
                    <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <img 
                        src={candidate.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.full_name}&backgroundColor=b6e3f4`} 
                        alt={candidate.full_name}
                        className="w-full h-full object-contain p-4"
                      />
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{candidate.full_name}</h3>
                      <p className="text-sm text-primary mb-1">পদবী: {candidate.position}</p>
                      <p className="text-sm text-muted-foreground mb-4">{candidate.party || 'স্বতন্ত্র'}</p>

                      <Button 
                        variant={selectedCandidateId === candidate.id ? "default" : "outline"}
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(candidate.id);
                        }}
                      >
                        {selectedCandidateId === candidate.id ? (
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
                      <p className="font-medium text-primary text-sm sm:text-base">ব্লকচেইন-ফার্স্ট সুরক্ষা</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {selectedCandidate.full_name} — {selectedCandidate.party || 'স্বতন্ত্র'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setSelectedCandidateId(null)}>
                      বাতিল করুন
                    </Button>
                    <Button size="sm" className="flex-1 sm:flex-none" onClick={handleConfirmVote} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          ব্লকচেইনে জমা হচ্ছে...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="size-4 mr-2" />
                          ভোট নিশ্চিত করুন
                        </>
                      )}
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
              <span>BLOCKCHAIN-FIRST</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <span>IMMUTABLE LEDGER</span>
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
        candidateName={selectedCandidate?.full_name || ''}
        voter={voterData}
      />
    </div>
  );
}
