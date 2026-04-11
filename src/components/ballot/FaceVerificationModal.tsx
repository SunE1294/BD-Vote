import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Camera, RotateCcw, XCircle, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { verifyFaceAgainstImage } from "@/lib/face-verification";

interface FaceVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationComplete: () => void;
  candidateName: string;
  voter: any;
}

type VerificationStatus = 'idle' | 'scanning' | 'success' | 'failed';

export function FaceVerificationModal({
  open,
  onOpenChange,
  onVerificationComplete,
  candidateName,
  voter,
}: FaceVerificationModalProps) {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      setStatus('idle');
      setProgress(0);
      setMessage('');
      setAttempts(0);
      startCamera();
    }
    return () => {
      if (!open) stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const handleScan = async () => {
    if (!videoRef.current || !voter?.photo_url) return;

    setStatus('scanning');
    setProgress(30);

    try {
      const result = await verifyFaceAgainstImage(videoRef.current, voter.photo_url, 70);
      setProgress(100);
      setMessage(result.message);

      if (result.success) {
        setStatus('success');
        setTimeout(() => {
          onVerificationComplete();
        }, 1500);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 3) {
          setStatus('failed');
        } else {
          setStatus('failed');
        }
      }
    } catch (err) {
      setStatus('failed');
      setMessage('যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleRetry = async () => {
    setStatus('idle');
    setProgress(0);
    setMessage('');
    stopCamera();
    await new Promise(r => setTimeout(r, 300));
    await startCamera();
  };

  const handleClose = () => {
    if (status !== 'scanning') {
      stopCamera();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="size-5 text-primary" />
            নিরাপত্তা যাচাইকরণ
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6 sm:py-8"
            >
              <div className="size-16 sm:size-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="size-8 sm:size-10 text-success" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-success">যাচাইকরণ সফল!</h3>
              <p className="text-sm text-muted-foreground mb-2">{message}</p>
              <p className="text-sm text-muted-foreground mb-4">
                আপনার ভোট <strong>{candidateName}</strong>-এর পক্ষে জমা হচ্ছে...
              </p>
              <div className="flex justify-center">
                <div className="animate-spin size-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            </motion.div>
          ) : status === 'failed' ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6 sm:py-8"
            >
              <div className="size-16 sm:size-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="size-8 sm:size-10 text-destructive" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-destructive">যাচাইকরণ ব্যর্থ</h3>
              <p className="text-sm text-muted-foreground mb-2">{message}</p>
              {attempts < 3 && (
                <p className="text-sm text-muted-foreground mb-6">
                  চেষ্টা {attempts}/3 — অনুগ্রহ করে আবার চেষ্টা করুন।
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleClose}>
                  বাতিল করুন
                </Button>
                {attempts < 3 && (
                  <Button onClick={handleRetry}>
                    <RotateCcw className="size-4 mr-2" />
                    আবার চেষ্টা করুন
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    ভোট জমা দেওয়ার আগে আপনার পরিচয় যাচাই করতে হবে। পর্যাপ্ত আলোতে সরাসরি ক্যামেরার দিকে তাকান।
                  </p>
                </div>
              </div>

              {/* Camera Preview */}
              <div className="relative h-[300px] bg-muted rounded-xl overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => videoRef.current?.play()}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 z-10">
                  <span className="size-1.5 bg-destructive-foreground rounded-full animate-pulse" />
                  LIVE
                </div>

                {/* Scan Frame */}
                <div className="absolute inset-6 sm:inset-8 border-2 border-dashed border-primary/50 rounded-lg z-10">
                  {status === 'scanning' && (
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                      style={{ top: `${progress}%` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-muted-foreground">ফেস ম্যাচিং</span>
                  <span className="text-primary font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={status === 'scanning'}
                >
                  বাতিল করুন
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleScan}
                  disabled={status === 'scanning'}
                >
                  <Camera className="size-4 mr-2" />
                  {status === 'scanning' ? 'যাচাই হচ্ছে...' : 'যাচাই শুরু করুন'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
