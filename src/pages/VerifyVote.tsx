import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Search, CheckCircle, XCircle, Loader2, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { verifyVoteReceipt, isBlockchainConfigured, isValidBytes32 } from "@/lib/blockchain";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type VerifyStatus = 'idle' | 'loading' | 'verified' | 'not-found' | 'error';

export default function VerifyVote() {
  const navigate = useNavigate();
  const [receiptHash, setReceiptHash] = useState('');
  const [status, setStatus] = useState<VerifyStatus>('idle');

  const handleVerify = async () => {
    const trimmed = receiptHash.trim();

    if (!trimmed) {
      toast.error('রিসিট হ্যাশ লিখুন');
      return;
    }

    if (!isValidBytes32(trimmed)) {
      toast.error('অবৈধ রিসিট হ্যাশ ফরম্যাট', {
        description: 'রিসিট হ্যাশ "0x" দিয়ে শুরু হওয়া ৬৬ অক্ষরের হতে হবে।',
      });
      return;
    }

    if (!isBlockchainConfigured()) {
      toast.error('ব্লকচেইন কনফিগার করা হয়নি');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const exists = await verifyVoteReceipt(trimmed);
      if (exists) {
        setStatus('verified');
      } else {
        setStatus('not-found');
      }
    } catch {
      setStatus('error');
      toast.error('যাচাই করতে সমস্যা হয়েছে');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(receiptHash.trim());
    toast.success('রিসিট হ্যাশ কপি করা হয়েছে');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar variant="app" />

      <main className="flex-1 py-8 lg:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Back Button */}
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4 mr-2" />
            পিছনে যান
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="size-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">ভোট যাচাইকরণ</h1>
            <p className="text-muted-foreground">
              আপনার রিসিট হ্যাশ দিয়ে ব্লকচেইনে আপনার ভোট যাচাই করুন
            </p>
          </div>

          {/* Search Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <label className="text-sm font-medium mb-2 block">রিসিট হ্যাশ</label>
              <div className="flex gap-2">
                <Input
                  placeholder="0x..."
                  value={receiptHash}
                  onChange={(e) => {
                    setReceiptHash(e.target.value);
                    if (status !== 'idle' && status !== 'loading') setStatus('idle');
                  }}
                  className="font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <Button onClick={handleVerify} disabled={status === 'loading'}>
                  {status === 'loading' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ভোট দেওয়ার সময় যে রিসিট হ্যাশ পেয়েছিলেন সেটি এখানে পেস্ট করুন।
              </p>
            </CardContent>
          </Card>

          {/* Result */}
          {status === 'loading' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="size-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">ব্লকচেইনে যাচাই করা হচ্ছে...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === 'verified' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-success/30">
                <CardContent className="p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <div className="size-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="size-8 text-success" />
                    </div>
                    <h2 className="text-xl font-bold text-success mb-1">ভোট যাচাইকৃত! ✅</h2>
                    <p className="text-sm text-muted-foreground">
                      এই রিসিট ব্লকচেইনে বিদ্যমান — আপনার ভোট নিরাপদে রেকর্ড আছে
                    </p>
                  </div>

                  <div className="bg-success/5 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-success break-all">{receiptHash.trim()}</code>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={copyToClipboard}>
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-center">
                    <Badge className="bg-success/10 text-success border-0">
                      <CheckCircle className="size-3 mr-1" />
                      ব্লকচেইনে নিশ্চিত
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Base Sepolia
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === 'not-found' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-destructive/30">
                <CardContent className="p-6 sm:p-8 text-center">
                  <div className="size-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="size-8 text-destructive" />
                  </div>
                  <h2 className="text-xl font-bold text-destructive mb-1">রিসিট পাওয়া যায়নি</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    এই রিসিট হ্যাশ ব্লকচেইনে পাওয়া যায়নি। সঠিক রিসিট হ্যাশ দিন।
                  </p>
                  <Button variant="outline" onClick={() => setStatus('idle')}>
                    আবার চেষ্টা করুন
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-warning/30">
                <CardContent className="p-6 sm:p-8 text-center">
                  <p className="text-warning mb-4">ব্লকচেইন সংযোগে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।</p>
                  <Button variant="outline" onClick={() => setStatus('idle')}>
                    আবার চেষ্টা করুন
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Info */}
          <Card className="mt-6 bg-primary/5 border-primary/10">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                কিভাবে কাজ করে?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• ভোট দেওয়ার সময় আপনি একটি রিসিট হ্যাশ পেয়েছিলেন</li>
                <li>• এই রিসিট সরাসরি ব্লকচেইন স্মার্ট কন্ট্রাক্টে সংরক্ষিত</li>
                <li>• কেউ এই রেকর্ড পরিবর্তন বা মুছতে পারে না — এমনকি অ্যাডমিনও না</li>
                <li>• রিসিটে আপনার পরিচয় বা প্রার্থী তথ্য নেই — সম্পূর্ণ গোপনীয়</li>
              </ul>
            </CardContent>
          </Card>

        </div>
      </main>

      <Footer />
    </div>
  );
}
