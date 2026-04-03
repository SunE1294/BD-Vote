import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, ScanFace, CheckCircle, Camera, RotateCcw, HelpCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

type Step = 'id-scan' | 'face-scan' | 'complete';

interface StepIconCircleProps {
  icon: React.ElementType;
  isActive: boolean;
  isComplete: boolean;
  sizeClass?: string;
  iconSizeClass?: string;
}

function StepIconCircle({ icon: Icon, isActive, isComplete, sizeClass = "size-10", iconSizeClass = "size-5" }: StepIconCircleProps) {
  return (
    <div className={cn(
      sizeClass,
      "rounded-full flex items-center justify-center",
      isComplete ? "bg-success text-success-foreground" :
      isActive   ? "bg-primary text-primary-foreground" :
                   "bg-muted text-muted-foreground"
    )}>
      {isComplete
        ? <CheckCircle className={iconSizeClass} />
        : <Icon className={iconSizeClass} />}
    </div>
  );
}

const steps = [
  { id: 'id-scan', label: 'আইডি কার্ড স্ক্যান', icon: CreditCard, subtitle: 'চলমান ধাপ' },
  { id: 'face-scan', label: 'ফেস রিকগনিশন', icon: ScanFace, subtitle: 'ধাপ ২' },
  { id: 'complete', label: 'যাচাইকরণ সম্পন্ন', icon: CheckCircle, subtitle: 'ধাপ ৩' },
];

export default function Verification() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>('id-scan');
  const [progress, setProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // --- বাস্তব ক্যামেরা ওপেন করার লজিক ---
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
    }
  };

  useEffect(() => {
    if (currentStep !== 'complete') {
      startCamera();
    }
    // ক্যামেরা বন্ধ করার জন্য ক্লিনআপ
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentStep]);

  const handleScan = () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          if (currentStep === 'id-scan') {
            setCurrentStep('face-scan');
          } else if (currentStep === 'face-scan') {
            setCurrentStep('complete');
            // ভেরিফিকেশন শেষে ক্যামেরা বন্ধ করে দেয়া
            if (stream) stream.getTracks().forEach(track => track.stop());
            setTimeout(() => navigate('/dashboard'), 3000);
          }
          return 100;
        }
        return prev + 2; // স্ক্যানিং স্পিড
      });
    }, 50);
  };

  const handleRetry = () => {
    setProgress(0);
    setIsScanning(false);
  };

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar variant="app" />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
            <span className="text-primary">BD Vote</span>
            <span className="mx-2">/</span>
            <span>আইডেন্টিটি যাচাইকরণ</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-2">আইডেন্টিটি যাচাইকরণ</h1>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
                ব্লকচেইন এবং এআই প্রযুক্তির মাধ্যমে আপনার পরিচয় নিশ্চিত করুন
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground self-start text-xs sm:text-sm">
              <HelpCircle className="size-3 sm:size-4 mr-1 sm:mr-2" />
              সাহায্য নিন
            </Button>
          </div>

          <Card className="mb-6 sm:mb-8">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 sm:size-5 text-primary" />
                  <span className="font-medium text-sm sm:text-base">পরিচয় যাচাইকরণ</span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">ধাপ {currentStepIndex + 1} / {steps.length}</span>
              </div>
              <Progress value={progressPercent} className="h-1.5 sm:h-2" />
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Sidebar Steps */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <Card>
<<<<<<< HEAD
                <CardContent className="p-4 sm:p-6">
                  {/* Mobile: Horizontal Steps */}
                  <div className="flex lg:hidden items-center justify-between mb-4">
                    {steps.map((step, index) => {
                      const isActive = step.id === currentStep;
                      const isComplete = index < currentStepIndex;

                      return (
                        <div key={step.id} className="flex flex-col items-center flex-1">
                          <StepIconCircle
                            icon={step.icon}
                            isActive={isActive}
                            isComplete={isComplete}
                            sizeClass="size-10 sm:size-12 mb-2"
                            iconSizeClass="size-5 sm:size-6"
                          />
                          <p className={cn(
                            "text-[10px] sm:text-xs font-medium text-center",
                            isActive ? "text-primary" : isComplete ? "text-success" : "text-muted-foreground"
                          )}>
=======
                <CardContent className="p-4 sm:p-6 space-y-6">
                  {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isComplete = index < currentStepIndex;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.id} className="flex items-start gap-4">
                        <div className={cn(
                          "size-10 rounded-full flex items-center justify-center shrink-0",
                          isComplete ? "bg-green-500 text-white" :
                          isActive ? "bg-primary text-primary-foreground" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {isComplete ? <CheckCircle className="size-5" /> : <StepIcon className="size-5" />}
                        </div>
                        <div>
                          <p className={cn("font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
>>>>>>> main
                            {step.label}
                          </p>
                          <p className="text-sm text-muted-foreground">{isActive ? 'চলমান ধাপ' : step.subtitle}</p>
                        </div>
<<<<<<< HEAD
                      );
                    })}
                  </div>

                  {/* Desktop: Vertical Steps */}
                  <div className="hidden lg:block space-y-6">
                    {steps.map((step, index) => {
                      const isActive = step.id === currentStep;
                      const isComplete = index < currentStepIndex;

                      return (
                        <div key={step.id} className="flex items-start gap-4">
                          <StepIconCircle
                            icon={step.icon}
                            isActive={isActive}
                            isComplete={isComplete}
                            sizeClass="size-10 shrink-0"
                          />
                          <div>
                            <p className={cn(
                              "font-medium",
                              isActive ? "text-primary" : isComplete ? "text-success" : "text-muted-foreground"
                            )}>
                              {step.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isActive ? 'চলমান ধাপ' : step.subtitle}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Instructions */}
                  <div className="pt-4 border-t border-border mt-4 lg:mt-0">
                    <div className="flex items-center gap-2 text-primary mb-2 sm:mb-3">
                      <Info className="size-3 sm:size-4" />
                      <span className="font-medium text-xs sm:text-sm">নির্দেশনা</span>
                    </div>
                    <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                      <li>• পর্যাপ্ত আলো আছে এমন জায়গায় বসুন।</li>
                      <li>• চশমা বা মাস্ক খুলে ফেলুন।</li>
                      <li>• আইডি কার্ডের লেখা যেন পরিষ্কার বোঝা যায়।</li>
                    </ul>
                  </div>
=======
                      </div>
                    );
                  })}
>>>>>>> main
                </CardContent>
              </Card>
            </div>

            {/* Main Camera View */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  {currentStep === 'complete' ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                      <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="size-10 text-green-600" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">যাচাইকরণ সফল হয়েছে!</h2>
                      <p className="text-muted-foreground mb-6">আপনাকে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...</p>
                      <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    </motion.div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-center mb-6">
                        {currentStep === 'id-scan' ? 'আইডি কার্ডটি ক্যামেরার সামনে ধরুন' : 'আপনার ফেস ভেরিফাই করুন'}
                      </h2>

                      {/* Camera Container */}
                      <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-6 group">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted
                          className="w-full h-full object-cover mirror transform scale-x-[-1]"
                        />
                        
                        {/* Scanning Overlay */}
                        <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-lg pointer-events-none">
                          {isScanning && (
                            <motion.div 
                              className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(var(--primary),1)]"
                              animate={{ top: ["0%", "100%", "0%"] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                        </div>

                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                          <span className="size-2 bg-white rounded-full animate-pulse" /> LIVE
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">প্রসেসিং স্ট্যাটাস</span>
                          <span className="text-primary font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex gap-4">
                        <Button className="flex-1" size="lg" onClick={handleScan} disabled={isScanning}>
                          <Camera className="mr-2 h-5 w-5" />
                          {isScanning ? 'স্ক্যান হচ্ছে...' : 'স্ক্যান শুরু করুন'}
                        </Button>
                        <Button variant="outline" size="lg" onClick={handleRetry} disabled={isScanning}>
                          <RotateCcw className="mr-2 h-5 w-5" /> আবার চেষ্টা করুন
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
