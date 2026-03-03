import { useState } from "react";
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

const steps = [
  { id: 'id-scan', label: 'আইডি কার্ড স্ক্যান', icon: CreditCard, subtitle: 'চলমান ধাপ' },
  { id: 'face-scan', label: 'ফেস রিকগনিশন', icon: ScanFace, subtitle: 'ধাপ ২' },
  { id: 'complete', label: 'যাচাইকরণ সম্পন্ন', icon: CheckCircle, subtitle: 'ধাপ ৩' },
];

export default function Verification() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('id-scan');
  const [progress, setProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  const handleScan = () => {
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
            setTimeout(() => navigate('/dashboard'), 2000);
          }
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const handleRetry = () => {
    setProgress(0);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar variant="app" />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
          {/* Breadcrumb */}
          <div className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
            <span className="text-primary">BD Vote</span>
            <span className="mx-2">/</span>
            <span>আইডেন্টিটি যাচাইকরণ</span>
          </div>

          {/* Header */}
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

          {/* Progress Bar */}
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
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                আপনার পরিচয় নিশ্চিত করতে নিচের ধাপগুলো সম্পন্ন করুন
              </p>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Steps - Horizontal on mobile, Sidebar on desktop */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  {/* Mobile: Horizontal Steps */}
                  <div className="flex lg:hidden items-center justify-between mb-4">
                    {steps.map((step, index) => {
                      const isActive = step.id === currentStep;
                      const isComplete = index < currentStepIndex;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.id} className="flex flex-col items-center flex-1">
                          <div className={cn(
                            "size-10 sm:size-12 rounded-full flex items-center justify-center mb-2",
                            isComplete ? "bg-success text-success-foreground" :
                            isActive ? "bg-primary text-primary-foreground" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {isComplete ? (
                              <CheckCircle className="size-5 sm:size-6" />
                            ) : (
                              <StepIcon className="size-5 sm:size-6" />
                            )}
                          </div>
                          <p className={cn(
                            "text-[10px] sm:text-xs font-medium text-center",
                            isActive ? "text-primary" : isComplete ? "text-success" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </p>
                          {/* Connector Line */}
                          {index < steps.length - 1 && (
                            <div className={cn(
                              "absolute h-0.5 w-8 top-5 sm:top-6",
                              isComplete ? "bg-success" : "bg-muted"
                            )} style={{ left: `calc(${(index + 1) * 33.33}% - 1rem)` }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: Vertical Steps */}
                  <div className="hidden lg:block space-y-6">
                    {steps.map((step, index) => {
                      const isActive = step.id === currentStep;
                      const isComplete = index < currentStepIndex;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.id} className="flex items-start gap-4">
                          <div className={cn(
                            "size-10 rounded-full flex items-center justify-center shrink-0",
                            isComplete ? "bg-success text-success-foreground" :
                            isActive ? "bg-primary text-primary-foreground" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {isComplete ? (
                              <CheckCircle className="size-5" />
                            ) : (
                              <StepIcon className="size-5" />
                            )}
                          </div>
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
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  {currentStep === 'complete' ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8 sm:py-12"
                    >
                      <div className="size-16 sm:size-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <CheckCircle className="size-8 sm:size-10 text-success" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">যাচাইকরণ সফল হয়েছে!</h2>
                      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                        আপনাকে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...
                      </p>
                      <div className="flex justify-center">
                        <div className="animate-spin size-6 sm:size-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-center mb-4 sm:mb-6 px-2">
                        {currentStep === 'id-scan' 
                          ? 'আপনার ইউনিভার্সিটি আইডি কার্ডটি ক্যামেরার সামনে ধরুন'
                          : 'এবার আপনার চেহারা স্থির রেখে ক্যামেরার দিকে তাকান'
                        }
                      </h2>

                      {/* Camera Preview */}
                      <div className="relative aspect-[4/3] sm:aspect-video bg-muted rounded-lg sm:rounded-xl overflow-hidden mb-4 sm:mb-6">
                        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-destructive text-destructive-foreground px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
                          <span className="size-1.5 sm:size-2 bg-destructive-foreground rounded-full animate-pulse" />
                          LIVE
                        </div>

                        {/* Scan Frame */}
                        <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-primary/50 rounded-lg">
                          {isScanning && (
                            <div className="scanning-line" style={{ top: `${progress}%` }} />
                          )}
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <Camera className="size-8 sm:size-12 mx-auto mb-1 sm:mb-2 opacity-50" />
                            <p className="text-xs sm:text-sm">ক্যামেরা প্রিভিউ</p>
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-4 sm:mb-6">
                        <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                          <span className="text-muted-foreground">
                            {currentStep === 'id-scan' ? 'আইডি ডাটা এক্সট্রাকশন' : 'ফেস ম্যাচিং'}
                          </span>
                          <span className="text-primary font-medium">{progress}% সম্পন্ন</span>
                        </div>
                        <Progress value={progress} className="h-1.5 sm:h-2" />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <Button 
                          className="flex-1 order-1" 
                          size="lg"
                          onClick={handleScan}
                          disabled={isScanning}
                        >
                          <Camera className="size-4 sm:size-5 mr-2" />
                          {isScanning ? 'স্ক্যান করা হচ্ছে...' : 'স্ক্যান করুন'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="lg"
                          className="flex-1 order-2"
                          onClick={handleRetry}
                          disabled={isScanning}
                        >
                          <RotateCcw className="size-4 sm:size-5 mr-2" />
                          আবার চেষ্টা করুন
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
